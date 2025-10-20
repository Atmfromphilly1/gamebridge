const express = require('express');
const cors = require('cors');

const app = express();
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

app.listen(PORT, () => {
  console.log(`🚀 GameBridge Voice server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
});
