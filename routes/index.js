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
  res.render('index');
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
  // Handle the PDF interaction logic here or redirect to the PDF interaction page
  res.render('pdftalk', { fileName: fileName});
});

async function processUserInput(userInput, pdfText) {
  try {
    const apiKey = process.env.API_KEY;
    // Access your API key as an environment variable (see "Set up your API key" above)
    const genAI = new GoogleGenerativeAI(apiKey);

    // For text-only input, use the gemini-pro model
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const prompt = `don't answer in more than 200 words, ${userInput} give me the answer from this text: ${pdfText}, also make sure to stick to the this text for answering my questions also you can give extracts from the text along with small explanation of the text`;

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


// Route handler for rendering the options page
router.get('/options', function(req, res, next) {
  // Get the PDF text from somewhere (e.g., req.session.pdfText)
  const pdfText = req.session.pdfText;
  // Render the options page and pass the PDF text as a variable
  res.render('options', { pdfText: pdfText });
});

// Function to summarize text using ML model
async function summarizeText(text) {
  try {
    const apiKey = process.env.API_KEY;
    // Access your API key as an environment variable (see "Set up your API key" above)
    const genAI = new GoogleGenerativeAI(apiKey);

    // For text-only input, use the gemini-pro model
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `Generate a concise summary of the provided document, ensuring that all essential information is captured within 1000 words. text: ${text}.`; 


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

// Handle POST request to summarize PDF text
router.post('/options/summarize-pdf', async (req, res) => {
  try {
    const pdfText = req.body.pdfText; // Retrieve PDF text from the form data

    // Pass the extracted text to your ML model for summarization
    const summaryFilePath = await summarizeText(pdfText);

    // Redirect user to the /summary route
    console.log('Redirecting to /summary...');
    res.redirect('/summary');
    console.log('Redirected successfully.');
  } catch (error) {
    console.error('Error summarizing PDF text:', error);
    res.status(500).send('Error summarizing PDF text.');
  }
});


module.exports = router;
