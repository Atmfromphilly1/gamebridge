const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:8081', 'http://localhost:19006'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:8081', 'http://localhost:19006'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
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
    uptime: process.uptime(),
    message: 'GameBridge Voice Backend is running!'
  });
});

// Test API endpoints
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'GameBridge Voice API is working!',
    features: [
      'Cross-platform voice chat',
      'Xbox ↔ PlayStation communication',
      'Real-time messaging',
      'Friend system',
      'Lobby management'
    ]
  });
});

// Mock authentication endpoint
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      error: 'Username and password required'
    });
  }

  // Mock successful login
  res.json({
    success: true,
    data: {
      user: {
        id: 'test-user-1',
        username: username,
        email: `${username}@example.com`,
        platform: 'pc',
        isOnline: true,
        lastSeen: new Date(),
        createdAt: new Date()
      },
      token: 'mock-jwt-token-for-testing'
    },
    message: 'Login successful (test mode)'
  });
});

// Mock registration endpoint
app.post('/api/auth/register', (req, res) => {
  const { username, email, password, platform } = req.body;
  
  if (!username || !email || !password || !platform) {
    return res.status(400).json({
      success: false,
      error: 'All fields required'
    });
  }

  // Mock successful registration
  res.json({
    success: true,
    data: {
      user: {
        id: 'test-user-' + Date.now(),
        username: username,
        email: email,
        platform: platform,
        isOnline: true,
        lastSeen: new Date(),
        createdAt: new Date()
      },
      token: 'mock-jwt-token-for-testing'
    },
    message: 'Registration successful (test mode)'
  });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`✅ User connected: ${socket.id}`);

  socket.on('lobby:create', (data) => {
    console.log('🎮 Lobby creation request:', data);
    socket.emit('lobby:created', {
      id: 'test-lobby-' + Date.now(),
      name: data.name || 'Test Lobby',
      hostId: 'test-host',
      maxParticipants: data.maxParticipants || 8,
      isPrivate: data.isPrivate || false,
      lobbyCode: 'TEST' + Math.random().toString(36).substr(2, 2).toUpperCase(),
      participants: [{
        userId: 'test-host',
        username: 'Test Host',
        platform: 'pc',
        isMuted: false,
        isDeafened: false,
        joinedAt: new Date(),
        isHost: true
      }],
      createdAt: new Date()
    });
  });

  socket.on('lobby:join', (data) => {
    console.log('🚪 Lobby join request:', data);
    socket.emit('lobby:joined', {
      id: 'test-lobby-123',
      name: 'Test Lobby',
      hostId: 'test-host',
      maxParticipants: 8,
      isPrivate: false,
      lobbyCode: 'TEST123',
      participants: [
        {
          userId: 'test-host',
          username: 'Test Host',
          platform: 'pc',
          isMuted: false,
          isDeafened: false,
          joinedAt: new Date(),
          isHost: true
        },
        {
          userId: 'test-user',
          username: 'Test User',
          platform: 'xbox',
          isMuted: false,
          isDeafened: false,
          joinedAt: new Date(),
          isHost: false
        }
      ],
      createdAt: new Date()
    });
  });

  socket.on('disconnect', () => {
    console.log(`❌ User disconnected: ${socket.id}`);
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'Route not found',
    availableRoutes: [
      'GET /health',
      'GET /api/test',
      'POST /api/auth/login',
      'POST /api/auth/register'
    ]
  });
});

// Start server
server.listen(PORT, () => {
  console.log('🎮 GameBridge Voice Backend Server');
  console.log('================================');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.io server ready for connections`);
  console.log(`🌍 Environment: development`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🧪 Test API: http://localhost:${PORT}/api/test`);
  console.log('');
  console.log('✅ Backend is ready for testing!');
  console.log('📱 Mobile app can connect to: http://localhost:3000');
  console.log('🖥️ Desktop app can connect to: http://localhost:3000');
});
