import os
import tempfile
from flask import Flask, render_template, request, send_file, jsonify
from PyPDF2 import PdfReader, PdfWriter
from werkzeug.utils import secure_filename
from io import BytesIO

app = Flask(__name__)

# Configuration
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
ALLOWED_EXTENSIONS = {'pdf'}
UPLOAD_FOLDER = tempfile.mkdtemp()

app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER


def allowed_file(filename):
    """Check if file extension is allowed."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def split_pdf(pdf_file):
    """
    Split PDF into 3 parts:
    - Part 1: Pages 1-4 (PDF indices 0-3)
    - Part 2: Pages 5-6 (PDF indices 4-5)
    - Part 3: Pages 7-10+ (PDF indices 6+)

    Returns: (part1_bytes, part2_bytes, part3_bytes) or raises exception
    """
    try:
        # Read PDF
        reader = PdfReader(pdf_file)
        total_pages = len(reader.pages)

        # Validate page count
        if total_pages < 10:
            raise ValueError(f"PDF must have at least 10 pages. Current: {total_pages}")

        # Create writers for each part
        writer1 = PdfWriter()
        writer2 = PdfWriter()
        writer3 = PdfWriter()

        # Part 1: Pages 1-4 (indices 0-3)
        for i in range(0, 4):
            writer1.add_page(reader.pages[i])

        # Part 2: Pages 5-6 (indices 4-5)
        for i in range(4, 6):
            writer2.add_page(reader.pages[i])

        # Part 3: Pages 7+ (indices 6+)
        for i in range(6, total_pages):
            writer3.add_page(reader.pages[i])

        # Write to BytesIO objects (in-memory)
        output1 = BytesIO()
        output2 = BytesIO()
        output3 = BytesIO()

        writer1.write(output1)
        writer2.write(output2)
        writer3.write(output3)

        output1.seek(0)
        output2.seek(0)
        output3.seek(0)

        return output1, output2, output3

    except Exception as e:
        raise Exception(f"Error processing PDF: {str(e)}")


@app.route('/')
def index():
    """Serve the main page."""
    return render_template('index.html')


@app.route('/split', methods=['POST'])
def split():
    """
    Handle PDF split request.
    Expects: file upload with key 'pdf'
    Returns: JSON with file paths or error message
    """
    try:
        # Check if file is present
        if 'pdf' not in request.files:
            return jsonify({'status': 'error', 'message': 'No file provided'}), 400

        file = request.files['pdf']

        if file.filename == '':
            return jsonify({'status': 'error', 'message': 'No file selected'}), 400

        if not allowed_file(file.filename):
            return jsonify({'status': 'error', 'message': 'Invalid file type. Only PDF files allowed'}), 400

        # Split PDF
        part1, part2, part3 = split_pdf(file)

        # Store in session for download
        # We'll use temp file names and return them
        import uuid
        session_id = str(uuid.uuid4())

        # Save to temporary files
        part1_path = os.path.join(UPLOAD_FOLDER, f'{session_id}_part1.pdf')
        part2_path = os.path.join(UPLOAD_FOLDER, f'{session_id}_part2.pdf')
        part3_path = os.path.join(UPLOAD_FOLDER, f'{session_id}_part3.pdf')

        with open(part1_path, 'wb') as f:
            f.write(part1.getvalue())
        with open(part2_path, 'wb') as f:
            f.write(part2.getvalue())
        with open(part3_path, 'wb') as f:
            f.write(part3.getvalue())

        return jsonify({
            'status': 'success',
            'session_id': session_id,
            'files': {
                'part1': {'name': 'Part1_Pages1-4.pdf', 'url': f'/download/{session_id}/part1'},
                'part2': {'name': 'Part2_Pages5-6.pdf', 'url': f'/download/{session_id}/part2'},
                'part3': {'name': 'Part3_Pages7Plus.pdf', 'url': f'/download/{session_id}/part3'}
            }
        }), 200

    except ValueError as e:
        return jsonify({'status': 'error', 'message': str(e)}), 400
    except Exception as e:
        return jsonify({'status': 'error', 'message': f'Error: {str(e)}'}), 500


@app.route('/download/<session_id>/<part>', methods=['GET'])
def download(session_id, part):
    """
    Download a specific part of the split PDF.
    """
    try:
        if part not in ['part1', 'part2', 'part3']:
            return jsonify({'status': 'error', 'message': 'Invalid part'}), 400

        # Map parts to filenames and display names
        part_map = {
            'part1': ('Part1_Pages1-4.pdf', f'{session_id}_part1.pdf'),
            'part2': ('Part2_Pages5-6.pdf', f'{session_id}_part2.pdf'),
            'part3': ('Part3_Pages7Plus.pdf', f'{session_id}_part3.pdf')
        }

        display_name, actual_name = part_map[part]
        file_path = os.path.join(UPLOAD_FOLDER, actual_name)

        if not os.path.exists(file_path):
            return jsonify({'status': 'error', 'message': 'File not found'}), 404

        return send_file(file_path, as_attachment=True, download_name=display_name, mimetype='application/pdf')

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.after_request
def cleanup_uploaded_files(response):
    """Clean up old temporary files."""
    try:
        import time
        current_time = time.time()
        for filename in os.listdir(UPLOAD_FOLDER):
            file_path = os.path.join(UPLOAD_FOLDER, filename)
            # Delete files older than 1 hour
            if os.path.isfile(file_path) and (current_time - os.path.getmtime(file_path)) > 3600:
                os.remove(file_path)
    except Exception:
        pass  # Silent fail if cleanup has issues
    return response


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=False, host='0.0.0.0', port=port)
