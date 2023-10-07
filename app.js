const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from the 'public' folder

const db = new sqlite3.Database("Data\\devsharespacedb.db", sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        return console.error(err.message);
    }
    console.log("Connected to the database...");
});

// Serve the register.html file
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// Handle the registration form submission
app.post('/register', (req, res) => {
    // Handle the form submission as shown in the previous response
    // ...
});

// Serve the login.html file
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Handle the login form submission
app.post('/login', (req, res) => {
    // Handle the login form submission as needed
    // ...
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

// Close the database connection when the application exits
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Database connection closed.');
        process.exit(0);
    });
});
