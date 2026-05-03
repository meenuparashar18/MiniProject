require('dotenv').config();

console.log('BOOT:', {
  commit: process.env.RAILWAY_GIT_COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || 'local',
  node: process.version,
  cwd: process.cwd(),
  hasMongoUri: Boolean(process.env.MONGO_URI),
  hasMongodbUri: Boolean(process.env.MONGODB_URI),
  hasMongoUrl: Boolean(process.env.MONGO_URL),
  hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
  hasJwtSecret: Boolean(process.env.JWT_SECRET),
});

const express = require('express');
const http = require('http');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const { Server } = require('socket.io');

// Models and Routes
const User = require('./models/userModel');
const { setIo } = require('./socket');
const { getMongoConfig } = require('./config/database');
const postRoutes = require('./routes/postRoutes');
const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');
const userRoutes = require('./routes/userRoutes');

// 1. Initialize Express App (Ye line pehle aani chahiye)
const app = express();
const mongoConfig = getMongoConfig();

const getDatabaseStatus = () => {
  if (mongoose.connection.readyState === 1) {
    return 'connected';
  }

  if (!mongoConfig.uri) {
    return 'missing Mongo connection string';
  }

  if (mongoConfig.isRailway && mongoConfig.isLocalMongoUrl(mongoConfig.uri)) {
    return `${mongoConfig.source} points to localhost, which Railway cannot reach`;
  }

  return `not connected using ${mongoConfig.source}`;
};

const configuredOrigins = [
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
  process.env.CORS_ORIGIN,
  ...(process.env.CORS_ORIGINS || '').split(','),
  'https://mini-projecte.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
]
  .map((origin) => origin && origin.trim())
  .filter(Boolean);

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (configuredOrigins.includes(origin)) return true;
  return /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);
};

const corsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS blocked origin: ${origin}`));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"]
};

app.use(cors(corsOptions));

app.use(express.json());

// 3. Other Middlewares
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Root route for testing
app.get('/', (req, res) => {
  res.send('Backend Server is Running!');
});

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: mongoose.connection.readyState === 1 ? 'ok' : 'degraded',
    database: getDatabaseStatus(),
  });
});

app.use('/api', (_req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      status: 'error',
      message: `${getDatabaseStatus()}. Set MONGO_URI, MONGODB_URI, MONGO_URL, or DATABASE_URL in Railway.`,
    });
  }

  return next();
});

// 4. API Routes
app.use('/api/posts', postRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/users', userRoutes);

const PORT = process.env.PORT || 5000;
const HOST =
  process.env.HOST ||
  (mongoConfig.isRailway ? '0.0.0.0' : '127.0.0.1');

process.on('uncaughtException', (error) => {
  console.error('UNCAUGHT EXCEPTION:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
});

const startServer = async () => {
  try {
    const server = http.createServer(app);

    server.on('error', (error) => {
      console.error('SERVER LISTEN ERROR:', error);
    });

    // Socket.io configuration
    const io = new Server(server, {
      cors: {
        origin: (origin, callback) => {
          if (isAllowedOrigin(origin)) {
            callback(null, true);
            return;
          }

          callback(new Error(`Socket CORS blocked origin: ${origin}`));
        },
        methods: ["GET", "POST"],
        credentials: true
      },
    });

    setIo(io);

    io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth?.token;
        if (!token) return next();

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
        if (postId) socket.join(`post:${postId}`);
      });

      socket.on('post:leave', (postId) => {
        if (postId) socket.leave(`post:${postId}`);
      });
    });

    server.listen(Number(PORT), HOST, () => {
      console.log(`Server is running on ${HOST}:${PORT}`);
    });

    if (!mongoConfig.uri) {
      console.error('Mongo connection string is not defined. Set MONGO_URI, MONGODB_URI, MONGO_URL, or DATABASE_URL.');
      return;
    }

    if (mongoConfig.isRailway && mongoConfig.isLocalMongoUrl(mongoConfig.uri)) {
      console.error(`${mongoConfig.source} points to localhost. Railway needs a MongoDB Atlas or Railway Mongo URL.`);
      return;
    }

    mongoose
      .connect(mongoConfig.uri, {
        serverSelectionTimeoutMS: 10000,
      })
      .then(() => {
        console.log(`Successfully connected to MongoDB using ${mongoConfig.source}!`);
      })
      .catch((error) => {
        console.error('MongoDB connection failed:', error.message);
      });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
