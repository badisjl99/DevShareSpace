const express = require('express');
const session = require('express-session'); // Add express-session
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

// Configure session middleware
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
}));

const db = new sqlite3.Database("Data\\devsharespacedb.db", sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        return console.error(err.message);
    }
    console.log("Connected to the database...");
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.post('/register', (req, res) => {
    // Registration logic here
    // After successful registration, create a session for the user
    req.session.user = { /* store user data here */ };
    res.redirect('/');
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;

    // Authenticate user against the database
    // If credentials are valid, create a session
    // Otherwise, handle authentication failure

    // Example code to check user credentials
    db.get('SELECT * FROM users WHERE email = ? AND password = ?', [email, password], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (!row) {
            return res.status(401).send('Invalid login credentials');
        }

        // Store user data in the session
        req.session.user = row;
        res.redirect('/dashboard');
    });
});

// Authentication middleware
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        return next(); // User is authenticated, proceed to the next middleware or route
    } else {
        res.redirect('/login'); // Redirect unauthenticated users to the login page
    }
}

// Dashboard route protected by authentication middleware
app.get('/dashboard', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
