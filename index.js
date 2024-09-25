const express = require("express");
const session = require('express-session');
const dotenv = require('dotenv');
const flash = require('express-flash');
const nocache = require('nocache');
const mongoose = require('mongoose');
const passport = require('passport');
const cookieSession = require('cookie-session');
const path = require("path");
require('./middlewares/passport');

// Load environment variables
dotenv.config();

const app = express();
app.set('view engine', 'ejs');

// Check if environment variables are being read
console.log("MONGODB_URL: ", process.env.MONGODB_URL);
console.log("PORT: ", process.env.PORT);

// Middlewares
app.use(express.static('public'));
app.use(express.static(path.join(__dirname, 'public')));

// Setup session middleware
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

app.use(passport.initialize());
app.use(passport.session());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URL)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });

// Import and use routes
const userRoute = require("./routes/user_route");
app.use("/", userRoute);

const adminRoute = require("./routes/admin_route")
app.use("/admin" ,adminRoute );

// Google OAuth Routes
app.get('/auth', passport.authenticate('google', { scope: ['email', 'profile'] }));

app.get('/auth/callback', passport.authenticate('google', {
    successRedirect: '/auth/callback/success',
    failureRedirect: '/auth/callback/failure'
}));


app.get('/auth/callback/success', (req, res) => {
    if (req.user) {
        if (req.user.block) {
            console.log('User is blocked');
            req.flash("error","your account is blocked");
            return res.redirect('/login');
        }
        req.session.userId = req.user._id;
        console.log('Login success');
        res.redirect('/');
    } else {
        res.redirect('/login');
    }
});


app.get('/auth/callback/failure', (req, res) => {
    res.send("Error");
});


// Start server
const port = process.env.PORT || 4000;
app.listen(port, () => {
    console.log(`Server running successfully on http://localhost:${port}`);
});
