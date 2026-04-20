import os
import shutil
import tempfile
import zipfile
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


def split_pdf(pdf_file, original_filename):
    """
    Split PDF into 5 parts:
    - Part 1: Pages 1-5, name: Case Sheet.pdf
    - Part 2: Page 3, name: Progress Note.pdf
    - Part 3: Page 6, name: Final Bill.pdf
    - Part 4: Pages 7-10, name: Letter and Later.pdf
    - Part 5: Page 11+, name: Examination Report.pdf

    Returns: folder path containing all 5 PDFs or raises exception
    """
    try:
        # Read PDF
        reader = PdfReader(pdf_file)
        total_pages = len(reader.pages)

        # Validate page count (need at least 11 pages)
        if total_pages < 11:
            raise ValueError(f"PDF must have at least 11 pages. Current: {total_pages}")

        # Create folder for this PDF
        pdf_name = os.path.splitext(original_filename)[0]  # Remove .pdf extension
        safe_name = secure_filename(pdf_name)
        output_folder = os.path.join(UPLOAD_FOLDER, safe_name)
        os.makedirs(output_folder, exist_ok=True)

        # Define parts: (start_page, end_page, filename)
        # Note: PDF indices are 0-based, but pages are 1-based
        parts = [
            (1, 5, "Case Sheet.pdf"),        # Pages 1-5
            (3, 3, "Progress Note.pdf"),     # Page 3 only
            (6, 6, "Final Bill.pdf"),        # Page 6 only
            (7, 10, "Letter and Later.pdf"), # Pages 7-10
            (11, total_pages, "Examination Report.pdf")  # Pages 11+
        ]

        # Create each PDF
        for start_page, end_page, filename in parts:
            writer = PdfWriter()

            # Convert page numbers to indices (0-based)
            start_idx = start_page - 1
            end_idx = end_page  # end_page is inclusive, but range is exclusive

            # Ensure indices are within bounds
            start_idx = max(0, start_idx)
            end_idx = min(total_pages, end_idx)

            # Add pages to writer
            for i in range(start_idx, end_idx):
                writer.add_page(reader.pages[i])

            # Write PDF to file
            output_path = os.path.join(output_folder, filename)
            with open(output_path, 'wb') as f:
                writer.write(f)

        return output_folder, safe_name

    except Exception as e:
        # Clean up folder if something goes wrong
        try:
            if 'output_folder' in locals():
                shutil.rmtree(output_folder, ignore_errors=True)
        except:
            pass
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
    Returns: JSON with folder name and download URL
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
        output_folder, folder_name = split_pdf(file, file.filename)

        return jsonify({
            'status': 'success',
            'folder_name': folder_name,
            'download_url': f'/download-zip/{folder_name}',
            'message': f'PDF split into 5 files in folder: {folder_name}'
        }), 200

    except ValueError as e:
        return jsonify({'status': 'error', 'message': str(e)}), 400
    except Exception as e:
        return jsonify({'status': 'error', 'message': f'Error: {str(e)}'}), 500


@app.route('/download-zip/<folder_name>', methods=['GET'])
def download_zip(folder_name):
    """
    Download all 5 PDFs as a ZIP file.
    """
    try:
        # Sanitize folder name
        folder_name = secure_filename(folder_name)
        folder_path = os.path.join(UPLOAD_FOLDER, folder_name)

        if not os.path.exists(folder_path):
            return jsonify({'status': 'error', 'message': 'Folder not found'}), 404

        # Create ZIP file in memory
        zip_buffer = BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for filename in os.listdir(folder_path):
                file_path = os.path.join(folder_path, filename)
                if os.path.isfile(file_path):
                    zip_file.write(file_path, arcname=filename)

        zip_buffer.seek(0)
        return send_file(
            zip_buffer,
            mimetype='application/zip',
            as_attachment=True,
            download_name=f'{folder_name}.zip'
        )

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/download-file/<folder_name>/<filename>', methods=['GET'])
def download_file(folder_name, filename):
    """Download a single split PDF file."""
    try:
        folder_name = secure_filename(folder_name)
        filename = secure_filename(filename)
        file_path = os.path.join(UPLOAD_FOLDER, folder_name, filename)

        if not os.path.exists(file_path):
            return jsonify({'status': 'error', 'message': 'File not found'}), 404

        return send_file(
            file_path,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=filename
        )
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
