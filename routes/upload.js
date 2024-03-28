const express = require('express');
const multer = require('multer');
const router = express.Router();
const fs = require('fs');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const PDFParser = require('pdf-parse');
const path = require('path');
const session = require('express-session');

let originalFilename;

// Initialize session middleware
router.use(session({
  secret: 'abrakadabra',
  resave: false,
  saveUninitialized: true
}));

// Multer configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage: storage });

// Handle file upload POST request
router.post('/', upload.single('pdfFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send('No file uploaded.');
    }
    originalFilename = req.file.originalname;

    // Read the uploaded PDF file
    const pdfBuffer = fs.readFileSync(req.file.path);
    // Extract text from the PDF
    const pdfData = await PDFParser(pdfBuffer);
    const pdfText = pdfData.text;

    // Store the PDF text in the session
    req.session.pdfText = pdfText;
    req.session.fileName = originalFilename;

    // Redirect user to the /options route
    res.redirect(`/options?originalFilename=${originalFilename}`);
  } catch (error) {
    console.error('Error processing PDF:', error);
    res.status(500).send('Error processing PDF.');
  }
});



module.exports = router;
