import { useState } from 'react';
import './App.css';
import {Loader} from "lucide-react";
import {Toaster} from "react-hot-toast";
import toast from "react-hot-toast";

// Use relative URLs since we're serving from the same domain
const API_URL = '/api';

function App() {
  const [secretCode, setSecretCode] = useState('');
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
  const [downloadData, setDownloadData] = useState(null);
  const [uploadedContent, setUploadedContent] = useState(null);
  const [isLoading, setisLoading] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.size > 10 * 1024 * 1024) {
      setMessage('File size must be less than 10MB');
      errormessagepopup(message);
      setFile(null);
      return;
    }
    setFile(selectedFile);
    setMessage('');
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!secretCode) {
      setMessage('Please enter a secret code');
      errormessagepopup(message);
      return;
    }

    const formData = new FormData();
    formData.append('secretCode', secretCode);
    formData.append('text', text);
    if (file) {
      formData.append('file', file);
    }

    setisLoading(true);
    try {
      const response = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        setMessage('Upload successful!');
        successmessagepopup("Uploaded successfully");
        setText('');
        setFile(null);
        setUploadedContent({
          id: data.id,
          fileUrl: data.fileUrl,
          downloadInstructions: data.downloadInstructions
        });
      } else {
        setMessage(data.error || 'Upload failed');
        errormessagepopup(message);
      }
    } catch (error) {
      setMessage('Error uploading content');
      errormessagepopup('Error uploading content');
    }
    setisLoading(false);
  };

  const handleDownload = async (e) => {
    e.preventDefault();
    if (!secretCode) {
      setMessage('Please enter a secret code');
      errormessagepopup(message);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/download/${secretCode}`);
      const data = await response.json();
      
      if (response.ok) {
        setDownloadData(data);
        setMessage('Download successful!');
        successmessagepopup(message);
        
      } else {
        setMessage(data.error || 'Download failed');
        setDownloadData(null);
        errormessagepopup(data.error || 'Download failed');
      }
    } catch (error) {
      setMessage('Error downloading content');
      setDownloadData(null);
      errormessagepopup('Error downloading content');
    }
  };

  const errormessagepopup = (message) => {
    toast.error(message);
  };

  const successmessagepopup = (message) => {
    toast.success(message);
  };

  return (
    <div className="container">
      <h1>Coffee-Container</h1>
      <h2> -- Secret File Sharing -- </h2>
      
      <div className="upload-section">
        <h2>Upload Content</h2>
        <form onSubmit={handleUpload}>
          <input
            type="text"
            placeholder="Enter secret code"
            value={secretCode}
            onChange={(e) => setSecretCode(e.target.value)}
          />
          <textarea
            placeholder="Enter text (optional)"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <input
            type="file"
            onChange={handleFileChange}
            accept="*/*"
          />
          <button type="submit">{isLoading ? <Loader/> : <p>Upload</p>}</button>
        </form>
      </div>

      <div className="download-section">
        <h2>Download Content</h2>
        <form onSubmit={handleDownload}>
          <input
            type="text"
            placeholder="Enter secret code"
            value={secretCode}
            onChange={(e) => setSecretCode(e.target.value)}
          />
          <button type="submit">Download</button>
        </form>
      </div>

      {/* {message && <div className="message">{message}</div>} */}

      {downloadData && (
        <div className="download-results">
          <h3>Downloaded Content:</h3>
          <div className="download-item">
            {downloadData.text && <h3 className='h3'>Text: {downloadData.text}</h3>}
            {downloadData.fileUrl && (
              <div>
                <h3 className='h3'>File: </h3>
                <a 
                  href={downloadData.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="download-button"
                >
                  Download File
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {uploadedContent && (
        <div className="uploaded-content">
          <h3>Upload Successful!</h3>
          <p>Your secret code is: <strong>{uploadedContent.id}</strong></p>
          
          {uploadedContent.downloadInstructions && (
            <div className="download-instructions">
              <h4>Download Instructions (Terminal)</h4>
              <div className="steps">
                {uploadedContent.downloadInstructions.steps.map((step, index) => (
                  <p key={index}>{step}</p>
                ))}
              </div>
              <div className="curl-command">
                <code>{uploadedContent.downloadInstructions.curlCommand}</code>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(uploadedContent.downloadInstructions.curlCommand);
                    setMessage('Curl command copied to clipboard!');
                  }}
                  className="copy-button"
                >
                  Copy
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      <Toaster />
    </div>
  );
}

export default App;
