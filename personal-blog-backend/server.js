require('dotenv').config();

const express = require('express');
const http = require('http');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const { Server } = require('socket.io');
const User = require('./models/userModel');
const { setIo } = require('./socket');

const postRoutes = require('./routes/postRoutes');
const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const PORT = process.env.PORT || 5000;

app.use('/api/posts', postRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/users', userRoutes);

const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Successfully connected to MongoDB!');

    const server = http.createServer(app);
    const io = new Server(server, {
      cors: {
        origin: '*',
      },
    });

    setIo(io);

    io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth?.token;
        if (!token) {
          return next();
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (user) {
          socket.user = user;
        }

        next();
      } catch (_error) {
        next();
      }
    });

    io.on('connection', (socket) => {
      if (socket.user) {
        socket.join(`user:${socket.user._id.toString()}`);
      }

      socket.on('post:join', (postId) => {
        if (postId) {
          socket.join(`post:${postId}`);
        }
      });

      socket.on('post:leave', (postId) => {
        if (postId) {
          socket.leave(`post:${postId}`);
        }
      });
    });

    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to connect to MongoDB', error);
    process.exit(1);
  }
};

startServer();
