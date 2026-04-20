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
uploadZone.addEventListener('click', (e) => {
    if (e.target !== fileInput) {
        fileInput.click();
    }
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

    // Safari fix: check extension instead of MIME type
    const fileNameLower = file.name.toLowerCase();
    const isValidPDF = fileNameLower.endsWith('.pdf');

    if (!isValidPDF) {
        showError('Invalid file type. Please select a PDF file.');
        resetForm();
        return;
    }

    // Validate file size (50MB)
    const maxSize = 50 * 1024 * 1024;
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

    folderName.textContent = `📁 Folder: ${data.folder_name} (5 files ready to download)`;

    const parts = [
        { label: 'Case Sheet',         pages: 'Pages 1-5',  file: 'Case Sheet.pdf',         partClass: 'part1' },
        { label: 'Progress Note',      pages: 'Page 3',     file: 'Progress Note.pdf',      partClass: 'part2' },
        { label: 'Final Bill',         pages: 'Page 6',     file: 'Final Bill.pdf',         partClass: 'part3' },
        { label: 'Letter & Later',     pages: 'Pages 7-10', file: 'Letter and Later.pdf',   partClass: 'part4' },
        { label: 'Examination Report', pages: 'Page 11+',   file: 'Examination Report.pdf', partClass: 'part5' },
    ];

    const grid = document.getElementById('downloadGrid');
    grid.innerHTML = '';

    parts.forEach((part, index) => {
        const fileUrl = `/download-file/${data.folder_name}/${encodeURIComponent(part.file)}`;

        const item = document.createElement('div');
        item.className = 'download-item';
        item.innerHTML = `
            <div class="download-card">
                <div class="card-header ${part.partClass}">
                    <span class="part-number">${index + 1}</span>
                </div>
                <div class="card-body">
                    <h3>${part.label}</h3>
                    <p class="pages-count">${part.pages}</p>
                    <p class="file-name clickable-file" title="Click to download">${part.file}</p>
                </div>
            </div>
        `;

        // Click on file name to download
        item.querySelector('.clickable-file').addEventListener('click', () => {
            downloadFile(fileUrl, part.file);
        });

        grid.appendChild(item);
    });

    // Set ZIP download button
    const downloadZipBtn = document.getElementById('downloadZipBtn');
    downloadZipBtn.href = data.download_url;
    downloadZipBtn.onclick = (e) => {
        e.preventDefault();
        downloadFile(data.download_url, `${data.folder_name}.zip`);
    };
}

/**
 * Download file
 */
function downloadFile(url, filename) {
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    if (isSafari) {
        window.location.href = url;
    } else {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
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
