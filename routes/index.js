const express = require('express');
const router = express.Router();
const fs = require('fs');
const multer = require('multer'); 
const uploadRouter = require('./upload');
const path = require('path');
const session = require('express-session'); 
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();



// Initialize session middleware
router.use(session({
  secret: 'abrakadabra',
  resave: false,
  saveUninitialized: true
}));

router.use('/upload', uploadRouter); // Mount the upload router

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('home');
});

router.get('/upload', function(req, res, next) {
  const redirect = req.query.redirect;
  res.render('index', {redirect});
});
// Route to render the summary EJS template
router.get('/summary', (req, res) => {
  try {
    // Read the content of the summary.txt file
    const summaryFilePath = path.join(__dirname, '..', 'uploads', 'summary.txt');
    const summaryContent = fs.readFileSync(summaryFilePath, 'utf-8');

    // Render the EJS template and pass the summary content
    res.render('summary', { summary: summaryContent });
  } catch (error) {
    console.error('Error rendering summary:', error);
    res.status(500).send('Error rendering summary.');
  }
});

router.get('/download/summary', (req, res) => {
  try {
    const summaryFilePath = path.join(__dirname, '..', 'uploads', 'summary.txt');

    // Check if the file exists
    if (!fs.existsSync(summaryFilePath)) {
      return res.status(404).send('Summary file not found');
    }

    // Set the appropriate headers for the file download
    res.setHeader('Content-disposition', 'attachment; filename=summary.txt');
    res.setHeader('Content-type', 'text/plain');

    // Pipe the file stream to the response
    const fileStream = fs.createReadStream(summaryFilePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error downloading summary:', error);
    res.status(500).send('Error downloading summary.');
  }
});

// Route to handle the request for interacting with the PDF
router.get('/pdf-interaction', (req, res) => {
  const fileName = req.session.fileName;
  const userInput = req.body.userInput;
  // Handle the PDF interaction logic here or redirect to the PDF interaction page
  res.render('pdftalk', { fileName: fileName, userInput});
});

async function processUserInput(userInput, pdfText) {
  try {
    const apiKey = process.env.API_KEY;
    // Access your API key as an environment variable (see "Set up your API key" above)
    const genAI = new GoogleGenerativeAI(apiKey);

    // For text-only input, use the gemini-pro model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    const prompt = `Always answer in less than 200 words and never ever exceed the word limit, ${userInput} give me the answer from this text: ${pdfText}, also make sure to stick to the this text for answering my questions also you can give extracts from the text along with small explanation of the text`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const generatedText = await response.text();
    const finalResponse = generatedText.replace(/\*\*/g, '');

    return finalResponse;
  } catch (error) {
    console.error('Error processing user input:', error);
    throw error; // Propagate the error
  }
}


// Route to handle user input from the PDF interaction page
router.post('/pdf-interaction', async (req, res) => {
  try {
    const userInput = req.body.userInput; // Retrieve user input from the form data
    const pdfText = req.session.pdfText;
    // Pass the user input to the ML model for processing (summarization)
    const mlResponse = await processUserInput(userInput, pdfText); // Define this function to process user input using your ML model

    // Send the ML response back to the frontend
    res.json({ mlResponse });
  } catch (error) {
    console.error('Error processing user input:', error);
    res.status(500).send('Error processing user input.');
  }
});






module.exports = router;
