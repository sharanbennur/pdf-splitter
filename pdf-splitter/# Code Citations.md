# Code Citations

## License: Apache-2.0
https://github.com/RonaldRagul/youtube_scraper_django/blob/a6729177fd2e432851e01ca1b4b837d99d5492e9/django/youtube_scrape/templates/files/process_csv.html

```
I can see all the issues now. Here are the complete fixed files:

**Problem 1:** `secure_filename('Case Sheet.pdf')` → `'Case_Sheet.pdf'` but file on disk has spaces  
**Problem 2:** Safari upload fails because `fetch` needs explicit handling for Safari  
**Problem 3:** Individual file download broken on Chrome too due to above

---

````python
# filepath: c:\pdf-splitter\app.py
import os
import shutil
import tempfile
import zipfile
import time
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
    if not filename:
        return False
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def split_pdf(pdf_file, original_filename):
    try:
        reader = PdfReader(pdf_file)
        total_pages = len(reader.pages)

        if total_pages < 11:
            raise ValueError(f"PDF must have at least 11 pages. Current: {total_pages}")

        pdf_name = os.path.splitext(original_filename)[0]
        safe_name = secure_filename(pdf_name)
        output_folder = os.path.join(UPLOAD_FOLDER, safe_name)
        os.makedirs(output_folder, exist_ok=True)

        parts = [
            (1, 5, "Case Sheet.pdf"),
            (3, 3, "Progress Note.pdf"),
            (6, 6, "Final Bill.pdf"),
            (7, 10, "Letter and Later.pdf"),
            (11, total_pages, "Examination Report.pdf")
        ]

        for start_page, end_page, filename in parts:
            writer = PdfWriter()
            start_idx = max(0, start_page - 1)
            end_idx = min(total_pages, end_page)
            for i in range(start_idx, end_idx):
                writer.add_page(reader.pages[i])
            output_path = os.path.join(output_folder, filename)
            with open(output_path, 'wb') as f:
                writer.write(f)

        return output_folder, safe_name

    except Exception as e:
        try:
            if 'output_folder' in locals():
                shutil.rmtree(output_folder, ignore_errors=True)
        except:
            pass
        raise Exception(f"Error processing PDF: {str(e)}")


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/split', methods=['POST'])
def split():
    try:
        if 'pdf' not in request.files:
            return jsonify({'status': 'error', 'message': 'No file provided'}), 400

        file = request.files['pdf']

        if not file.filename or file.filename == '':
            return jsonify({'status': 'error', 'message': 'No file selected'}), 400

        if not allowed_file(file.filename):
            return jsonify({'status': 'error', 'message': 'Invalid file type. Only PDF files allowed'}), 400

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
    try:
        folder_name = secure_filename(folder_name)
        folder_path = os.path.join(UPLOAD_FOLDER, folder_name)

        if not os.path.exists(folder_path):
            return jsonify({'status': 'error', 'message': 'Folder not found'}), 404

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


@app.route('/download-file/<folder_name>/<path:filename>', methods=['GET'])
def download_file(folder_name, filename):
    """Download a single split PDF file."""
    try:
        folder_name = secure_filename(folder_name)
        # Use os.path.basename only - do NOT use secure_filename (strips spaces)
        filename = os.path.basename(filename)
        file_path = os.path.join(UPLOAD_FOLDER, folder_name, filename)

        if not os.path.exists(file_path):
            return jsonify({'status': 'error', 'message': f'File not found: {filename}'}), 404

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
    try:
        current_time = time.time()
        for item in os.listdir(UPLOAD_FOLDER):
            item_path = os.path.join(UPLOAD_FOLDER, item)
            age = current_time - os.path.getmtime(item_path)
            if age > 3600:
                if os.path.isdir(item_path):
                    shutil.rmtree(item_path, ignore_errors=True)
                else:
                    os.remove(item_path)
    except Exception:
        pass
    return response


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=False, host='0.0.0.0', port=port)
````

---

````javascript
// filepath: c:\pdf-splitter\static\js\app.js
/**
 * PDF Splitter Frontend Logic
 */

const uploadZone = document.getElementById('uploadZone');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const statusSection = document.getElementById('statusSection');
const errorSection = document.getElementById('errorSection');
const errorMessage = document.getElementById('errorMessage');
const resultsSection = document.getElementById('resultsSection');
const statusText = document.getElementById('statusText');
const folderName = document.getElementById('folderName');

// Prevent default drag behaviors
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    uploadZone.addEventListener(eventName, preventDefaults, false);
    document.body.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    uploadZone.addEventListener(eventName, () => {
        uploadZone.classList.add('dragover');
    }, false);
});

['dragleave', 'drop'].forEach(eventName => {
    uploadZone.addEventListener(eventName, () => {
        uploadZone.classList.remove('dragover');
    }, false);
});

// Handle drop
uploadZone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    handleFiles(files);
}, false);

// Handle click - fix double trigger on iOS Safari
uploadZone.addEventListener('click', (e) => {
    
```


## License: Apache-2.0
https://github.com/RonaldRagul/youtube_scraper_django/blob/a6729177fd2e432851e01ca1b4b837d99d5492e9/django/youtube_scrape/templates/files/process_csv.html

```
I can see all the issues now. Here are the complete fixed files:

**Problem 1:** `secure_filename('Case Sheet.pdf')` → `'Case_Sheet.pdf'` but file on disk has spaces  
**Problem 2:** Safari upload fails because `fetch` needs explicit handling for Safari  
**Problem 3:** Individual file download broken on Chrome too due to above

---

````python
# filepath: c:\pdf-splitter\app.py
import os
import shutil
import tempfile
import zipfile
import time
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
    if not filename:
        return False
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def split_pdf(pdf_file, original_filename):
    try:
        reader = PdfReader(pdf_file)
        total_pages = len(reader.pages)

        if total_pages < 11:
            raise ValueError(f"PDF must have at least 11 pages. Current: {total_pages}")

        pdf_name = os.path.splitext(original_filename)[0]
        safe_name = secure_filename(pdf_name)
        output_folder = os.path.join(UPLOAD_FOLDER, safe_name)
        os.makedirs(output_folder, exist_ok=True)

        parts = [
            (1, 5, "Case Sheet.pdf"),
            (3, 3, "Progress Note.pdf"),
            (6, 6, "Final Bill.pdf"),
            (7, 10, "Letter and Later.pdf"),
            (11, total_pages, "Examination Report.pdf")
        ]

        for start_page, end_page, filename in parts:
            writer = PdfWriter()
            start_idx = max(0, start_page - 1)
            end_idx = min(total_pages, end_page)
            for i in range(start_idx, end_idx):
                writer.add_page(reader.pages[i])
            output_path = os.path.join(output_folder, filename)
            with open(output_path, 'wb') as f:
                writer.write(f)

        return output_folder, safe_name

    except Exception as e:
        try:
            if 'output_folder' in locals():
                shutil.rmtree(output_folder, ignore_errors=True)
        except:
            pass
        raise Exception(f"Error processing PDF: {str(e)}")


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/split', methods=['POST'])
def split():
    try:
        if 'pdf' not in request.files:
            return jsonify({'status': 'error', 'message': 'No file provided'}), 400

        file = request.files['pdf']

        if not file.filename or file.filename == '':
            return jsonify({'status': 'error', 'message': 'No file selected'}), 400

        if not allowed_file(file.filename):
            return jsonify({'status': 'error', 'message': 'Invalid file type. Only PDF files allowed'}), 400

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
    try:
        folder_name = secure_filename(folder_name)
        folder_path = os.path.join(UPLOAD_FOLDER, folder_name)

        if not os.path.exists(folder_path):
            return jsonify({'status': 'error', 'message': 'Folder not found'}), 404

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


@app.route('/download-file/<folder_name>/<path:filename>', methods=['GET'])
def download_file(folder_name, filename):
    """Download a single split PDF file."""
    try:
        folder_name = secure_filename(folder_name)
        # Use os.path.basename only - do NOT use secure_filename (strips spaces)
        filename = os.path.basename(filename)
        file_path = os.path.join(UPLOAD_FOLDER, folder_name, filename)

        if not os.path.exists(file_path):
            return jsonify({'status': 'error', 'message': f'File not found: {filename}'}), 404

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
    try:
        current_time = time.time()
        for item in os.listdir(UPLOAD_FOLDER):
            item_path = os.path.join(UPLOAD_FOLDER, item)
            age = current_time - os.path.getmtime(item_path)
            if age > 3600:
                if os.path.isdir(item_path):
                    shutil.rmtree(item_path, ignore_errors=True)
                else:
                    os.remove(item_path)
    except Exception:
        pass
    return response


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=False, host='0.0.0.0', port=port)
````

---

````javascript
// filepath: c:\pdf-splitter\static\js\app.js
/**
 * PDF Splitter Frontend Logic
 */

const uploadZone = document.getElementById('uploadZone');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const statusSection = document.getElementById('statusSection');
const errorSection = document.getElementById('errorSection');
const errorMessage = document.getElementById('errorMessage');
const resultsSection = document.getElementById('resultsSection');
const statusText = document.getElementById('statusText');
const folderName = document.getElementById('folderName');

// Prevent default drag behaviors
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    uploadZone.addEventListener(eventName, preventDefaults, false);
    document.body.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    uploadZone.addEventListener(eventName, () => {
        uploadZone.classList.add('dragover');
    }, false);
});

['dragleave', 'drop'].forEach(eventName => {
    uploadZone.addEventListener(eventName, () => {
        uploadZone.classList.remove('dragover');
    }, false);
});

// Handle drop
uploadZone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    handleFiles(files);
}, false);

// Handle click - fix double trigger on iOS Safari
uploadZone.addEventListener('click', (e) => {
    
```

