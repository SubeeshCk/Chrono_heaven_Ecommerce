const express = require("express");
const errorHandler = require('./middlewares/errorHandler');
const session = require('express-session');
const dotenv = require('dotenv');
const flash = require('express-flash');
const nocache = require('nocache');
const mongoose = require('mongoose');
const cookieSession = require('cookie-session');
const path = require("path");
const connectDB = require ("./config/db");


// Load environment variables
dotenv.config();

const app = express();
app.set('view engine', 'ejs');


// Middlewares
app.use(express.static('public'));
app.use(express.static(path.join(__dirname, 'public')));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// session middleware
app.use(session({
    secret: "your_secret_key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24
    }
  }));

app.use(flash());
app.use(nocache());

// Import and use routes
const userRoute = require("./routes/user_route");
app.use("/", userRoute);

const adminRoute = require("./routes/admin_route")
app.use("/admin" ,adminRoute );

app.use(errorHandler);

// MongoDB connection
connectDB();

// Start server
const port = process.env.PORT || 4000;
app.listen(port, () => {
    console.log(`Server running successfully on http://localhost:${port}`);
});
