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

    // Pass the extracted text to your ML model
    const prediction = await summarizeText(pdfText);
    console.log(prediction);

    // Do something with the prediction (e.g., send it as a response)
    res.status(200).json({ prediction });
  } catch (error) {
    console.error('Error processing PDF:', error);
    res.status(500).send('Error processing PDF.');
  }
});

// Function to summarize text using ML model
async function summarizeText(text) {
  try {
    const apiKey = process.env.API_KEY;
    // Access your API key as an environment variable (see "Set up your API key" above)
    const genAI = new GoogleGenerativeAI(apiKey);

    // For text-only input, use the gemini-pro model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const prompt = `Generate a concise summary of the provided document, if possible ensuring that all essential information is captured within 1000 words otherwise you can exceed but to a reasonable amount. text: ${text}.`; 


    const result = await model.generateContent(prompt);
    const response = await result.response;
    const summarizedText = await response.text();
    const finalResponse = summarizedText.replace(/\*\*/g, '');

    // Write summarized text to a file
    const summaryFilePath = `uploads/summary.txt`;
    fs.writeFileSync(summaryFilePath, finalResponse);

    return summaryFilePath;
  } catch (error) {
    console.error('Error summarizing text:', error);
    throw error; // Propagate the error
  }
}

module.exports = router;
