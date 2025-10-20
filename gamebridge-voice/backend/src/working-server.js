const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');

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
    
    const lobby = {
      id: `lobby-${Date.now()}`,
      name: data.name || 'Test Lobby',
      maxParticipants: data.maxParticipants || 8,
      isPrivate: data.isPrivate || false,
      code: Math.random().toString(36).substring(2, 8).toUpperCase(),
      participants: [{
        userId: socket.userId,
        username: socket.username,
        isMuted: false,
        isDeafened: false,
        joinedAt: new Date()
      }]
    };
    
    socket.join(`lobby:${lobby.id}`);
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
    socket.to(`lobby:${data.lobbyId}`).emit('chat:message', {
      userId: socket.userId,
      username: socket.username,
      content: data.content,
      timestamp: new Date()
    });
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`User ${socket.username} disconnected`);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 GameBridge Voice server running on port ${PORT}`);
  console.log(`📡 Socket.io server ready for connections`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
});
