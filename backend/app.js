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
    cb(null, true);
  }
});

// API Routes
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    const { secretCode, text } = req.body;
    const file = req.file;

    if (!secretCode) {
      return res.status(400).json({ error: 'Secret code is required' });
    }

    const docRef = doc(db, 'uploads', secretCode);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return res.status(400).json({ error: 'This secret code is already in use. Please choose a different one.' });
    }

    let fileUrl = null;
    let fileDetails = null;
    if (file) {
      const tempFilePath = path.join(os.tmpdir(), file.originalname);
      fs.writeFileSync(tempFilePath, file.buffer);

      try {
        const uploadOptions = {
          resource_type: "raw",
          public_id: `${secretCode}_${Date.now()}`,
          overwrite: true
        };

        const result = await cloudinary.uploader.upload(tempFilePath, uploadOptions);
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
        try {
          fs.unlinkSync(tempFilePath);
        } catch (unlinkError) {
          console.error('Error deleting temporary file:', unlinkError);
        }
      }
    }

    const uploadData = {
      secretCode,
      text: text || '',
      fileUrl,
      timestamp: new Date().toISOString(),
      fileDetails
    };

    await setDoc(docRef, uploadData);

    const curlCommand = `curl.exe -L "${req.protocol}://${req.get('host')}/api/download/${secretCode}" -o "${secretCode}.zip"`;
    
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

app.get('/api/file/:secretCode', async (req, res) => {
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

    const response = await axios({
      method: 'GET',
      url: uploadData.fileUrl,
      responseType: 'stream'
    });

    res.setHeader('Content-Type', uploadData.fileDetails?.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${uploadData.fileDetails?.originalName || 'file'}"`);
    
    response.data.pipe(res);
  } catch (error) {
    console.error('File download error:', error);
    res.status(500).json({ error: 'File download failed: ' + error.message });
  }
});

app.get('/api/download/:secretCode', async (req, res) => {
  try {
    const { secretCode } = req.params;
    const docRef = doc(db, 'uploads', secretCode);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return res.status(404).json({ error: 'No content found for this secret code' });
    }

    const uploadData = docSnap.data();
    res.json({
      text: uploadData.text,
      fileUrl: uploadData.fileUrl
    });
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Download failed: ' + error.message });
  }
});

// Serve the frontend for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});








