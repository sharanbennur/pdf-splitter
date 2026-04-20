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
    if (e.target !== fileInput && e.target.tagName !== 'LABEL') {
        fileInput.click();
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFiles(e.target.files);
    }
});

/**
 * Handle file selection and upload
 */
function handleFiles(files) {
    if (files.length === 0) return;

    const file = files[0];

    // Check extension only - Safari sends wrong MIME type
    if (!file.name.toLowerCase().endsWith('.pdf')) {
        showError('Invalid file type. Please select a PDF file.');
        return;
    }

    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
        showError('File is too large. Maximum size is 50MB.');
        return;
    }

    fileName.textContent = file.name;
    fileInfo.style.display = 'block';
    uploadFile(file);
}

/**
 * Upload file to server
 */
function uploadFile(file) {
    statusSection.style.display = 'block';
    errorSection.style.display = 'none';
    resultsSection.style.display = 'none';
    uploadZone.style.opacity = '0.5';
    uploadZone.style.pointerEvents = 'none';

    const formData = new FormData();
    formData.append('pdf', file, file.name); // explicit filename for Safari

    fetch('/split', {
        method: 'POST',
        body: formData
        // Do NOT set Content-Type header - browser must set it with boundary
    })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => { throw new Error(err.message); });
            }
            return response.json();
        })
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
            showError(error.message || 'Network error. Please try again.');
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
        // Actual file on disk = "5452D Final Bill.pdf"
        const actualFile = `${data.pdf_name} ${part.file}`;
        const fileUrl = `/download-file/${encodeURIComponent(data.folder_name)}/${encodeURIComponent(actualFile)}`;

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

        // downloads as "5452D Final Bill.pdf"
        item.querySelector('.clickable-file').addEventListener('click', () => {
            downloadFile(fileUrl, actualFile);
        });

        grid.appendChild(item);
    });

    // ZIP button
    const zipUrl = `/download-zip/${encodeURIComponent(data.folder_name)}`;
    const downloadZipBtn = document.getElementById('downloadZipBtn');
    downloadZipBtn.href = zipUrl;
    downloadZipBtn.onclick = (e) => {
        e.preventDefault();
        downloadFile(zipUrl, `${data.folder_name}.zip`);
    };
}

/**
 * Download file - works on Chrome, Safari, iOS
 */
function downloadFile(url, filename) {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    if (isIOS || isSafari) {
        // Safari/iOS: open in new tab - user can share/save from there
        window.open(url, '_blank');
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
 * Reset form
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