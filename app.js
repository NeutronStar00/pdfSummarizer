const createError = require('http-errors');
const express = require('express');
const path = require('path');
const multer = require('multer');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const uploadRouter = require('./routes/upload');
const indexRouter = require('./routes/index');
const router = express.Router();
const session = require('express-session'); 
const { GoogleGenerativeAI } = require("@google/generative-ai");
const usersRouter = require('./routes/users');

const app = express();

// Session middleware
app.use(session({
  secret: 'abrakadabra', // Change this to a more secure secret for production
  resave: false,
  saveUninitialized: true
}));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));




app.use('/', indexRouter);
app.use('/users', usersRouter);

// Serve static files from the 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Handle file uploads
app.use('/upload', uploadRouter);

// Catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// Error handler for Multer middleware
app.use(function(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    // Multer error occurred during file upload
    console.error('Multer error:', err);
    res.status(400).send('File upload failed');
  } else {
    next(err);
  }
});

// General error handler
app.use(function(err, req, res, next) {
  // Set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // Render the error page
  res.status(err.status || 500);
  res.render('error');
});






module.exports = app;
