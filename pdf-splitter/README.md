# PDF Splitter - Web Application

A simple, mobile-friendly web application to split PDF documents into 3 parts:
- **Part 1**: Pages 1-4
- **Part 2**: Pages 5-6
- **Part 3**: Pages 7+

Supports desktop browsers (Chrome, Firefox, Safari) and mobile browsers (iOS Safari, mobile Chrome, etc.).

---

## Features

✅ **Easy to Use**
- Drag-and-drop file upload
- Click to browse alternative
- Instant processing

✅ **Mobile-Friendly**
- Responsive design works on all devices
- Access from Safari, Chrome, or any browser
- Touch-optimized interface

✅ **Secure**
- PDF processed locally on server
- Files deleted automatically after download
- No cloud storage or permanent storage
- Maximum file size: 50MB

✅ **No Installation Overhead**
- Single Python script
- Minimal dependencies (Flask + PyPDF2)
- Works offline

---

## Quick Start

### 1. Install Python (if not already installed)
- Download from https://www.python.org/
- Ensure Python 3.7+ is installed
- Add Python to PATH during installation (Windows users)

### 2. Install Dependencies

```bash
cd pdf-splitter
pip install -r requirements.txt
```

### 3. Run the Application

```bash
python app.py
```

You should see:
```
 * Running on http://0.0.0.0:5000
```

### 4. Open in Browser

- **Local (same computer)**: http://localhost:5000
- **From another device on same WiFi**: http://<your-computer-ip>:5000
- **Mobile Safari on same network**: Same URL as above

---

## How to Use

1. **Open the app** in your browser (URL shown when app starts)
2. **Upload a PDF** with 10+ pages by:
   - Dragging and dropping onto the zone, OR
   - Clicking the zone to browse and select
3. **Wait for processing** (usually 1-2 seconds)
4. **Download the 3 parts**:
   - Click each "Download" button to get the individual PDFs
   - Files are named: `Part1_Pages1-4.pdf`, `Part2_Pages5-6.pdf`, `Part3_Pages7Plus.pdf`

---

## Finding Your Computer's IP Address

To access the app from another device on the same network:

### Windows
```bash
ipconfig
```
Look for "IPv4 Address" (usually starts with 192.168.x.x or 10.x.x.x)

### Mac/Linux
```bash
ifconfig
```
Look for "inet" address under your active network interface

**Example**: If your IP is `192.168.1.100`, access the app at:
```
http://192.168.1.100:5000
```

---

## Error Messages

| Error | Solution |
|-------|----------|
| "Invalid file type. Only PDF files allowed" | Make sure you're uploading a PDF file, not another format |
| "PDF must have at least 10 pages. Current: X" | The PDF needs at least 10 pages. Try a different PDF |
| "File is too large. Maximum size is 50MB" | Your PDF is larger than 50MB. Split it into smaller chunks first |
| "No file selected" | Make sure a file is selected before trying to upload |

---

## Advanced Usage

### Change the Port

If port 5000 is already in use, edit the last line of `app.py`:

```python
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8080)  # Change 5000 to 8080
```

Then restart the app.

### Change Split Points

To customize the page ranges, edit the `split_pdf()` function in `app.py`:

```python
# Example: Split into [1-3], [4-7], [8+]
for i in range(0, 3):      # Part 1: Pages 1-3
    writer1.add_page(reader.pages[i])

for i in range(3, 7):      # Part 2: Pages 4-7
    writer2.add_page(reader.pages[i])

for i in range(7, total_pages):  # Part 3: Pages 8+
    writer3.add_page(reader.pages[i])
```

### Run in Production

For production deployment, use a WSGI server like Gunicorn:

```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app.py
```

---

## Deployment Options

### Option 1: Local Machine (Easiest)
```bash
python app.py
# Access from: http://localhost:5000 (same computer)
#              http://<your-ip>:5000 (other devices on WiFi)
```

### Option 2: Cloud (PythonAnywhere)
1. Sign up at https://www.pythonanywhere.com/
2. Upload files via web interface
3. Set up web app with Flask
4. Access from anywhere globally

### Option 3: Cloud (Heroku)
1. Create `Procfile`:
   ```
   web: gunicorn app:app
   ```
2. Deploy using Heroku CLI
3. Access from `https://your-app-name.herokuapp.com`

### Option 4: Docker
Create `Dockerfile`:
```dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["python", "app.py"]
```

Then:
```bash
docker build -t pdf-splitter .
docker run -p 5000:5000 pdf-splitter
```

---

## Troubleshooting

### App won't start
- Check Python is installed: `python --version`
- Ensure all dependencies installed: `pip install -r requirements.txt`
- Try a different port (see "Change the Port" above)

### Can't access from another device
- Ensure both devices are on the same WiFi network
- Use correct IP address (not localhost)
- Check firewall isn't blocking port 5000
- For development, set `debug=True` in app.py (already set)

### Downloaded file is corrupted
- Try uploading a different PDF
- Ensure the original PDF isn't corrupted
- Check file size not exceeding 50MB

### App crashes after upload
- Check error message in terminal
- Ensure PDF is valid (not corrupted)
- Try a different PDF file

---

## Technical Stack

- **Backend**: Flask (Python web framework)
- **PDF Processing**: PyPDF2 (PDF manipulation library)
- **Frontend**: HTML5, CSS3, Vanilla JavaScript (no framework)
- **Deployment**: Python WSGI server

---

## File Structure

```
pdf-splitter/
├── app.py                      # Main Flask application
├── requirements.txt            # Python dependencies
├── README.md                   # This file
├── templates/
│   └── index.html             # Web UI
├── static/
│   ├── css/
│   │   └── style.css          # Styling
│   └── js/
│       └── app.js             # Frontend logic
└── .gitignore                 # Git ignore file
```

---

## Privacy & Security

⚠️ **Important Notes**:
- All files are processed **locally on the server** where the app runs
- PDFs are **NOT uploaded to the cloud** or third-party services
- Files are **automatically deleted** after 1 hour
- No user data is collected
- No tracking or analytics

---

## License

Free to use, modify, and distribute.

---

## Support

For issues or questions:
1. Check the "Troubleshooting" section above
2. Review error messages in the browser
3. Check terminal output for error logs
4. Try with a different PDF file

---

**Enjoy splitting your PDFs! 🎉**
