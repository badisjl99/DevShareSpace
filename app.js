
const express = require('express');
const session = require('express-session'); // Add express-session
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const port = 3000;
const connectedUsers = new Set();

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
    const { name, lastname, email, password } = req.body;

    // Save the user data to your database
    db.run('INSERT INTO users (name, lastname, email, password) VALUES (?, ?, ?, ?)', [name, lastname, email, password], function (err) {
        if (err) {
            return console.log(err.message);
        }
        console.log(`A row has been inserted with rowid ${this.lastID}`);
    });

    // Redirect the user to the dashboard or another appropriate page after successful registration
    res.redirect('/dashboard');
});
app.post('/login', (req, res) => {
    const { email, password } = req.body;

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

app.get('/dashboard', isAuthenticated, (req, res) => {
    const { user } = req.session;
    const currentUserScript = `<script>document.getElementById('currentUser').innerText = "${user.name} ${user.lastname}";</script>`;
    const dashboardFilePath = path.join(__dirname, 'public', 'dashboard.html');

    // Read the content of the dashboard.html file
    fs.readFile(dashboardFilePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).send('Error reading dashboard.html');
        }

        // Inject the JavaScript into the HTML
        const modifiedDashboard = data.replace('</body>', currentUserScript + '</body>');
        res.send(modifiedDashboard);
    });
});

const server = http.createServer(app);
const io = socketIO(server);
io.on('connection', (socket) => {
    connectedUsers.add(socket.id);
    io.emit('userCount', connectedUsers.size);

    socket.on('disconnect', () => {
        connectedUsers.delete(socket.id);
        io.emit('userCount', connectedUsers.size);
    });

    socket.on('codeChange', (newCode) => {
        // Emit the code change to all connected users except the one who initiated the change
        socket.broadcast.emit('codeChange', newCode);
    });
});


server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
