const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const cors = require('cors');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, getDoc, getDocs, query, where } = require('firebase/firestore');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const os = require('os');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// CORS configuration
const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the frontend build directory
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.apikey,
  authDomain: process.env.authdomain,
  projectId: process.env.projectid,
  storageBucket: process.env.storagebucket,
  messagingSenderId: process.env.messagingsenderid,
  appId: process.env.appid,
  databaseURL: process.env.databaseurl
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept all file types
    cb(null, true);
  }
});

// Upload endpoint
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { secretCode, text } = req.body;
    const file = req.file;

    if (!secretCode) {
      return res.status(400).json({ error: 'Secret code is required' });
    }

    // Check if document with this secret code already exists
    const docRef = doc(db, 'uploads', secretCode);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return res.status(400).json({ error: 'This secret code is already in use. Please choose a different one.' });
    }

    let fileUrl = null;
    let fileDetails = null;
    if (file) {
      // console.log('File details:', {
      //   originalname: file.originalname,
      //   mimetype: file.mimetype,
      //   size: file.size
      // });

      // Create a temporary file
      const tempFilePath = path.join(os.tmpdir(), file.originalname);
      fs.writeFileSync(tempFilePath, file.buffer);

      try {
        // Upload to Cloudinary with raw resource type
        const uploadOptions = {
          resource_type: "raw",
          public_id: `${secretCode}_${Date.now()}`,
          overwrite: true
        };

        // console.log('Uploading to Cloudinary with options:', uploadOptions);
        const result = await cloudinary.uploader.upload(tempFilePath, uploadOptions);
        // console.log('Cloudinary upload result:', result);
        
        // Add fl_attachment flag to the URL
        fileUrl = `${result.secure_url}?fl_attachment=${encodeURIComponent(file.originalname)}`;
        fileDetails = {
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          format: path.extname(file.originalname).slice(1)
        };
      } catch (uploadError) {
        console.error('Cloudinary upload error:', uploadError);
        throw new Error(`Failed to upload file to Cloudinary: ${uploadError.message}`);
      } finally {
        // Clean up temporary file
        try {
          fs.unlinkSync(tempFilePath);
        } catch (unlinkError) {
          console.error('Error deleting temporary file:', unlinkError);
        }
      }
    }

    // Store in Firebase using secret code as document ID
    const uploadData = {
      secretCode,
      text: text || '',
      fileUrl,
      timestamp: new Date().toISOString(),
      fileDetails
    };

    // console.log('Storing in Firebase:', uploadData);
    await setDoc(docRef, uploadData);

    // Generate curl command for downloading
    const curlCommand = `curl.exe -L "http://localhost:3000/download/${secretCode}" -o "${secretCode}.zip"`;
    
    res.json({ 
      success: true, 
      message: 'Upload successful',
      id: secretCode,
      fileUrl,
      downloadInstructions: {
        curlCommand,
        steps: [
          "1. Open your terminal/command prompt",
          "2. Copy and paste the curl command below:",
          curlCommand,
          "3. Press Enter to download the content",
          "4. The content will be saved as a ZIP file in your current directory",
          "5. Extract the ZIP file to access your content"
        ]
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Upload failed: ' + error.message,
      details: error.stack
    });
  }
});

// Direct file download endpoint
app.get('/file/:secretCode', async (req, res) => {
  try {
    const { secretCode } = req.params;
    const docRef = doc(db, 'uploads', secretCode);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return res.status(404).json({ error: 'No content found for this secret code' });
    }

    const uploadData = docSnap.data();
    
    if (!uploadData.fileUrl) {
      return res.status(404).json({ error: 'No file found for this secret code' });
    }

    // Get the file from Cloudinary
    const response = await axios({
      method: 'GET',
      url: uploadData.fileUrl,
      responseType: 'stream'
    });

    // Set appropriate headers
    res.setHeader('Content-Type', uploadData.fileDetails?.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${uploadData.fileDetails?.originalName || 'file'}"`);
    
    // Stream the file to the response
    response.data.pipe(res);
  } catch (error) {
    console.error('File download error:', error);
    res.status(500).json({ error: 'File download failed: ' + error.message });
  }
});

// Download endpoint
app.get('/download/:secretCode', async (req, res) => {
  try {
    const { secretCode } = req.params;
    const userAgent = req.headers['user-agent'] || '';
    const isCurl = userAgent.toLowerCase().includes('curl');
    
    // Get document directly using secret code as ID
    const docRef = doc(db, 'uploads', secretCode);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return res.status(404).json({ error: 'No content found for this secret code' });
    }

    const uploadData = docSnap.data();
    // console.log('Download request for:', uploadData);

    // If it's a curl request, create a zip file with all content
    if (isCurl) {
      const archiver = require('archiver');
      const archive = archiver('zip', {
        zlib: { level: 9 }
      });

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename=${secretCode}.zip`);
      
      archive.pipe(res);

      // Add text content to a file
      if (uploadData.text) {
        const textContent = `Text from ${new Date(uploadData.timestamp).toLocaleString()}:\n${uploadData.text}\n\n`;
        archive.append(textContent, { name: 'text_content.txt' });
      }

      // Download and add file from Cloudinary if exists
      if (uploadData.fileUrl) {
        try {
          // console.log('Downloading file from Cloudinary:', uploadData.fileUrl);
          const response = await axios({
            method: 'GET',
            url: uploadData.fileUrl,
            responseType: 'stream'
          });
          
          const fileName = uploadData.fileDetails?.originalName || path.basename(uploadData.fileUrl);
          archive.append(response.data, { name: fileName });
        } catch (error) {
          console.error('Error downloading file:', error);
          throw new Error(`Failed to download file: ${error.message}`);
        }
      }

      await archive.finalize();
    } else {
      // For browser requests, return JSON
      res.json(uploadData);
    }
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ 
      error: 'Download failed: ' + error.message,
      details: error.stack
    });
  }
});

// Serve the frontend for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});








