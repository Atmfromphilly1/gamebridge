import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import { authRoutes } from './routes/auth';
import { lobbyRoutes } from './routes/lobby';
import { friendsRoutes } from './routes/friends';
import { chatRoutes } from './routes/chat';
import { systemRoutes } from './routes/system';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import { initializeSocketHandlers } from './socket/socketHandlers';
import { initializeDatabase } from './database/connection';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ['GET', 'POST'],
    credentials: false
  }
});

const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/lobby', authMiddleware, lobbyRoutes);
app.use('/api/friends', authMiddleware, friendsRoutes);
app.use('/api/chat', authMiddleware, chatRoutes);
app.use('/api/system', authMiddleware, systemRoutes);

// Socket.io middleware for authentication
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error: No token provided'));
  }
  
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    socket.username = decoded.username;
    next();
  } catch (err) {
    next(new Error('Authentication error: Invalid token'));
  }
});

// Initialize socket handlers
initializeSocketHandlers(io);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'Route not found' 
  });
});

// Initialize database (optional) and start server
async function startServer() {
  try {
    if (process.env.USE_IN_MEMORY === 'true') {
      console.log('⚠️  USE_IN_MEMORY enabled: skipping external DB/Redis connections');
    } else {
      await initializeDatabase();
      console.log('✅ Database connected successfully');
    }
    
    server.listen(PORT, () => {
      console.log(`🚀 GameBridge Voice server running on port ${PORT}`);
      console.log(`📡 Socket.io server ready for connections`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

startServer();
