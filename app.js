const express = require('express');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const port = 3000;
const connectedUsers = new Map(); 

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

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

    db.run('INSERT INTO users (name, lastname, email, password) VALUES (?, ?, ?, ?)', [name, lastname, email, password], function (err) {
        if (err) {
            return console.log(err.message);
        }
        console.log(`A row has been inserted with rowid ${this.lastID}`);
    });

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

        req.session.user = row;
        res.redirect('/dashboard');
    });
});

function isAuthenticated(req, res, next) {
    if (req.session.user) {
        return next(); 
    } else {
        res.redirect('/login');
    }
}
app.get('/dashboard', isAuthenticated, (req, res) => {
    db.all('SELECT name, lastname FROM users', [], (err, rows) => {
        if (err) {
            return res.status(500).send('Error retrieving users from the database');
        }

        const { user } = req.session;
        const currentUserScript = `<script>document.getElementById('currentUser').innerText = "${user.name} ${user.lastname}";</script>`;
        const userNames = rows.map(row => `<li>${row.name} ${row.lastname}</li>`).join('');
        const userListScript = `<script>document.getElementById('connectedUsersList').innerHTML = "${userNames}";</script>`;
        const dashboardFilePath = path.join(__dirname, 'public', 'dashboard.html');

        fs.readFile(dashboardFilePath, 'utf8', (err, data) => {
            if (err) {
                return res.status(500).send('Error reading dashboard.html');
            }

            const modifiedDashboard = data.replace('</body>', currentUserScript + userListScript + '</body>');
            res.send(modifiedDashboard);
        });
    });
});

const server = http.createServer(app);
const io = socketIO(server);

io.on('connection', (socket) => {
    connectedUsers.set(socket.id, `User${connectedUsers.size + 1}`);
    io.emit('userCount', connectedUsers.size);
    io.emit('updateUserList', Array.from(connectedUsers.values()));

    socket.on('disconnect', () => {
        connectedUsers.delete(socket.id);
        io.emit('userCount', connectedUsers.size);
        io.emit('updateUserList', Array.from(connectedUsers.values()));
    });

    socket.on('codeChange', (newCode) => {
        socket.broadcast.emit('codeChange', newCode);
    });
    
    socket.on('typing', () => {
        const user = connectedUsers.get(socket.id);
        socket.broadcast.emit('typing', user);
    });

    socket.on('finishedTyping', () => {
        socket.broadcast.emit('finishedTyping');
    });

});

server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
