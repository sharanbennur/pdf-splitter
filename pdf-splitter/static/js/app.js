/**
 * PDF Splitter Frontend Logic
 * Handles file upload, validation, and download links
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

// Highlight drop zone on drag
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
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
}, false);

// Handle click to browse
uploadZone.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
});

/**
 * Handle file selection and upload
 */
function handleFiles(files) {
    if (files.length === 0) return;

    const file = files[0];

    // Validate file type
    if (file.type !== 'application/pdf') {
        showError('Invalid file type. Please select a PDF file.');
        resetForm();
        return;
    }

    // Validate file size (50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB in bytes
    if (file.size > maxSize) {
        showError('File is too large. Maximum size is 50MB.');
        resetForm();
        return;
    }

    // Show file info and upload
    fileName.textContent = file.name;
    fileInfo.style.display = 'block';
    uploadFile(file);
}

/**
 * Upload file to server
 */
function uploadFile(file) {
    // Show loading status
    statusSection.style.display = 'block';
    errorSection.style.display = 'none';
    resultsSection.style.display = 'none';
    uploadZone.style.opacity = '0.5';
    uploadZone.style.pointerEvents = 'none';

    const formData = new FormData();
    formData.append('pdf', file);

    fetch('/split', {
        method: 'POST',
        body: formData
    })
        .then(response => response.json())
        .then(data => {
            uploadZone.style.opacity = '1';
            uploadZone.style.pointerEvents = 'auto';

            if (data.status === 'success') {
                showResults(data);
            } else {
                showError(data.message || 'An error occurred while processing the PDF.');
            }
        })
        .catch(error => {
            uploadZone.style.opacity = '1';
            uploadZone.style.pointerEvents = 'auto';
            showError('Network error. Please try again.');
            console.error('Error:', error);
        });
}

/**
 * Show error message
 */
function showError(message) {
    statusSection.style.display = 'none';
    resultsSection.style.display = 'none';
    errorSection.style.display = 'block';
    errorMessage.textContent = message;
}

/**
 * Show results with download links
 */
function showResults(data) {
    statusSection.style.display = 'none';
    errorSection.style.display = 'none';
    resultsSection.style.display = 'block';

    // Update folder name
    folderName.textContent = `📁 Folder: ${data.folder_name} (5 files ready to download)`;

    // Set ZIP download button
    const downloadZipBtn = document.getElementById('downloadZipBtn');
    downloadZipBtn.href = data.download_url;
    downloadZipBtn.addEventListener('click', (e) => {
        e.preventDefault();
        downloadFile(data.download_url, `${data.folder_name}.zip`);
    });
}

/**
 * Download file
 */
function downloadFile(url, filename) {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Reset form for another upload
 */
function resetForm() {
    fileInput.value = '';
    fileInfo.style.display = 'none';
    statusSection.style.display = 'none';
    errorSection.style.display = 'none';
    resultsSection.style.display = 'none';
    uploadZone.style.opacity = '1';
    uploadZone.style.pointerEvents = 'auto';
}
