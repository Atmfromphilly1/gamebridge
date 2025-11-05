const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Log environment info
console.log('🚀 Starting GameBridge Voice Server...');
console.log('📦 Node version:', process.version);
console.log('🌍 NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('🔌 PORT:', process.env.PORT || '3000 (default)');

const app = express();
const server = createServer(app);

// Initialize Socket.IO with error handling
let io;
try {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ['GET', 'POST'],
      credentials: false
    }
  });
  console.log('✅ Socket.IO initialized');
} catch (error) {
  console.error('❌ Socket.IO initialization failed:', error);
  process.exit(1);
}

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Simple auth endpoints for testing
app.post('/api/auth/register', (req, res) => {
  res.json({
    success: true,
    data: {
      user: {
        id: 'test-user-id',
        username: req.body.username || 'testuser',
        email: req.body.email || 'test@example.com',
        platform: req.body.platform || 'pc',
        isOnline: true,
        lastSeen: new Date(),
        createdAt: new Date()
      },
      token: 'test-jwt-token'
    },
    message: 'User registered successfully'
  });
});

app.post('/api/auth/login', (req, res) => {
  res.json({
    success: true,
    data: {
      user: {
        id: 'test-user-id',
        username: req.body.username || 'testuser',
        email: 'test@example.com',
        platform: 'pc',
        isOnline: true,
        lastSeen: new Date(),
        createdAt: new Date()
      },
      token: 'test-jwt-token'
    },
    message: 'Login successful'
  });
});

// Lobby endpoints
app.get('/api/lobby/list', (req, res) => {
  // Return empty array for now - lobbies are created via socket.io
  res.json({
    success: true,
    data: []
  });
});

// Socket.io middleware for authentication
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error: No token provided'));
  }
  
  // For now, accept any token
  socket.userId = 'test-user-id';
  socket.username = 'testuser';
  next();
});

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log(`User ${socket.username} connected with socket ${socket.id}`);
  
  // Join user to their personal room
  socket.join(`user:${socket.userId}`);
  
  // Handle lobby creation
  socket.on('lobby:create', async (data) => {
    console.log('Creating lobby:', data);
    
    const lobbyCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const lobby = {
      id: `lobby-${Date.now()}`,
      name: data.name || 'Test Lobby',
      maxParticipants: data.maxParticipants || 8,
      isPrivate: data.isPrivate || false,
      lobbyCode: lobbyCode,
      code: lobbyCode, // Keep both for compatibility
      participants: [{
        userId: socket.userId,
        username: socket.username,
        platform: 'pc', // Default platform
        isMuted: false,
        isDeafened: false,
        joinedAt: new Date(),
        isHost: true
      }],
      createdAt: new Date()
    };
    
    socket.join(`lobby:${lobby.id}`);
    console.log('Emitting lobby:created with:', lobby);
    socket.emit('lobby:created', lobby);
  });
  
  // Handle lobby joining
  socket.on('lobby:join', async (data) => {
    console.log('Joining lobby:', data);
    
    const lobby = {
      id: data.lobbyId || 'test-lobby',
      name: 'Test Lobby',
      maxParticipants: 8,
      isPrivate: false,
      code: 'TEST123',
      participants: [{
        userId: socket.userId,
        username: socket.username,
        isMuted: false,
        isDeafened: false,
        joinedAt: new Date()
      }]
    };
    
    socket.join(`lobby:${lobby.id}`);
    socket.emit('lobby:joined', lobby);
  });
  
  // Handle lobby leaving
  socket.on('lobby:leave', async () => {
    console.log('Leaving lobby');
    socket.emit('lobby:left');
  });
  
  // Handle voice events
  socket.on('voice:offer', (data) => {
    console.log('Voice offer:', data);
    socket.to(`user:${data.to}`).emit('voice:offer', {
      from: socket.userId,
      offer: data.offer
    });
  });
  
  socket.on('voice:answer', (data) => {
    console.log('Voice answer:', data);
    socket.to(`user:${data.to}`).emit('voice:answer', {
      from: socket.userId,
      answer: data.answer
    });
  });
  
  socket.on('voice:ice_candidate', (data) => {
    console.log('ICE candidate:', data);
    socket.to(`user:${data.to}`).emit('voice:ice_candidate', {
      from: socket.userId,
      candidate: data.candidate
    });
  });
  
  // Handle mute/deafen
  socket.on('voice:mute_toggle', (data) => {
    console.log('Mute toggle:', data);
    socket.to(`lobby:${socket.currentLobby}`).emit('voice:mute_toggle', {
      userId: socket.userId,
      isMuted: data.isMuted
    });
  });
  
  socket.on('voice:deafen_toggle', (data) => {
    console.log('Deafen toggle:', data);
    socket.to(`lobby:${socket.currentLobby}`).emit('voice:deafen_toggle', {
      userId: socket.userId,
      isDeafened: data.isDeafened
    });
  });
  
  // Handle chat messages
  socket.on('chat:message', (data) => {
    console.log('Chat message:', data);
    const messageData = {
      userId: socket.userId,
      username: socket.username,
      content: data.content,
      timestamp: new Date()
    };
    
    // Broadcast to all users in the lobby (including sender)
    // Use chat:message_received to match what the app listens for
    io.to(`lobby:${data.lobbyId}`).emit('chat:message_received', messageData);
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`User ${socket.username} disconnected`);
  });
});

// Error handling for server startup
server.on('error', (error) => {
  console.error('❌ Server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`⚠️  Port ${PORT} is already in use`);
  }
  process.exit(1);
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ GameBridge Voice server running on port ${PORT}`);
  console.log(`📡 Socket.io server ready for connections`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📍 Server accessible at http://0.0.0.0:${PORT}`);
  console.log(`💚 Health check available at http://0.0.0.0:${PORT}/health`);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
