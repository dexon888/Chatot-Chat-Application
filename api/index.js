const express = require('express');
require('dotenv').config();
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser')
const User = require('./models/User')
const Message = require('./models/Message')
const cors = require('cors');
const bcrypt = require('bcryptjs')
const ws = require('ws');
const fs = require('fs');
const path = require('path')



mongoose.connect(process.env.MONGO_URL)
    .then(() => console.log("MongoDB successfully connected"))
    .catch(err => console.error("MongoDB connection error:", err));

const jwtSecret = process.env.JWT_SECRET
const bcryptSalt = bcrypt.genSaltSync(10);
const app = express();
app.use('/uploads', express.static(__dirname + '/uploads'))
app.use(express.json());

app.use(cookieParser())

app.use(cors({
    credentials: true,
    origin: process.env.CLIENT_URL,
}));

app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
});

async function getUserDataFromRequest(req) {
    return new Promise((resolve, reject) => {
        const token = req.cookies?.token;
        if (token) {
                jwt.verify(token, jwtSecret, {}, (err, userData) => {
                if (err) throw err;
                resolve(userData)
            })  
        } else {
            reject('no token');
        }
    })
}

app.get('/', (req, res) => {
  res.send('Welcome to my app!');
});

app.get('/test', (req, res) => {
    res.json('test ok')
})

app.get('/messages/:userId', async (req, res) => {
    const {userId} = req.params;
    const userData = await getUserDataFromRequest(req);
    const ourUserId = userData.userId
    const messages = await Message.find({
        sender: {$in:[userId, ourUserId]},
        recipient: {$in:[userId, ourUserId]},
    }).sort({createdAt:1});
    res.json(messages);
})

app.get('/people', async (req,res) =>{
    const users = await User.find({}, {'_id':1, username:1})
    res.json(users)
})

app.get('/profile', (req,res) => {
    const token = req.cookies?.token;
    if (token) {
        jwt.verify(token, jwtSecret, {}, (err, userData) => {
        if (err) throw err;
        res.json(userData)
    })  
    } else {
        res.status(401).json('no token')
    }
    

})

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const foundUser = await User.findOne({ username });
        if (!foundUser) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const passOk = bcrypt.compareSync(password, foundUser.password);
        if (!passOk) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        jwt.sign({ userId: foundUser._id, username }, jwtSecret, {}, (err, token) => {
            if (err) {
                return res.status(500).json({ message: "Error generating token" });
            }
            res.cookie('token', token, { sameSite: 'none', secure: true }).json({ id: foundUser._id });
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.post('/logout', (req, res) => {
    res.cookie('token', '', { expires: new Date(0), sameSite: 'none', secure: true })
       .json('Logged out successfully');
})

app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        // Check if user already exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(409).json({ message: "A user already exists with that username" });
        }

        // If user doesn't exist, proceed with creating a new user
        const hashedPassword = bcrypt.hashSync(password, bcryptSalt);
        const createdUser = await User.create({
            username,
            password: hashedPassword,
        });
        jwt.sign({ userId: createdUser._id, username }, jwtSecret, {}, (err, token) => {
            if (err) {
                return res.status(500).json({ message: "Error generating token" });
            }
            res.cookie('token', token, { sameSite: 'none', secure: true }).status(201).json({
                id: createdUser._id,
            });
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

const PORT = process.env.PORT || 4040;
const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

const wss = new ws.WebSocketServer({server});

wss.on('connection', (connection, req) => {

    function notifyAboutOnlinePeople() {
        [...wss.clients].forEach(client => {
        client.send(JSON.stringify({
            online:  [...wss.clients].map(c => ({userId:c.userId, username:c.username}))
        }))
    })
    }

    connection.isAlive = true;

    connection.timer = setInterval(() => {
        connection.ping()
        connection.deathTimer = setTimeout(() => {
            connection.isAlive = false;
            clearInterval();
            connection.terminate();
            notifyAboutOnlinePeople();
        }, 1000)
    }, 5000)

    connection.on('pong', () => {
        clearTimeout(connection.deathTimer);
    })
    
    // read username and id from the cookie for this connection 
    const cookies = req.headers.cookie;
    if (cookies) {
        const tokenCookieString = cookies.split(';').find(str => str.startsWith('token='));
        if (tokenCookieString) {
            const token = tokenCookieString.split('=')[1];
            if (token) {
                jwt.verify(token, jwtSecret, {}, (err, userData) => {
                    if (err) throw err;
                    const {userId, username} = userData;
                    connection.userId = userId
                    connection.username = username;
                })
            }
        }

    }

    connection.on('message', async (message) => {
        const messageData = JSON.parse(message.toString());
        const {recipient, text, file} = messageData
        let filename = null;
        if (file) {
            const parts = file.name.split('.');
            const ext = parts[parts.length - 1];
            filename = Date.now() + '.' + ext;
            const path = __dirname + '/uploads/' + filename;
            console.log(path)
            const bufferData = Buffer.from(file.data.split(',')[1], 'base64');
            fs.writeFile(path, bufferData, (err) => {
                if (err) {
                    console.error('Error saving file:', err);
                } else {
                    console.log('File saved:', path);
                }
            });

        }
        if (recipient && (text || file)) {
            const messageDocument = await Message.create({
                sender: connection.userId, 
                recipient, 
                text,
                file: file ? filename : null,
            });
            console.log('created message');
            [...wss.clients].filter(c => c.userId === recipient)
            .forEach(c => c.send(JSON.stringify({
                text, 
                sender: connection.userId,
                recipient,
                file: file ? filename: null,
                id: messageDocument._id,
            })))
        } 
    });

    // notify everyone about online (when someone connects)
    notifyAboutOnlinePeople();
})


