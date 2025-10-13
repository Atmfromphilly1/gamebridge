import { Router } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Get TURN/STUN server configuration for WebRTC
router.get('/webrtc-config', async (req: AuthenticatedRequest, res) => {
  try {
    const config = {
      iceServers: [
        {
          urls: 'stun:stun.l.google.com:19302'
        },
        {
          urls: 'stun:stun1.l.google.com:19302'
        }
      ]
    };

    // Add TURN server if configured
    if (process.env.TURN_SERVER_URL && process.env.TURN_SERVER_USERNAME && process.env.TURN_SERVER_PASSWORD) {
      config.iceServers.push({
        urls: process.env.TURN_SERVER_URL,
        username: process.env.TURN_SERVER_USERNAME,
        credential: process.env.TURN_SERVER_PASSWORD
      });
    }

    res.json({
      success: true,
      data: config
    });

  } catch (error) {
    console.error('Get WebRTC config error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get WebRTC configuration'
    });
  }
});

// Get server status and statistics
router.get('/status', async (req: AuthenticatedRequest, res) => {
  try {
    const { db } = await import('../database/connection');
    const { redis } = await import('../database/connection');

    // Get basic statistics
    const userCountResult = await db.query('SELECT COUNT(*) as count FROM users');
    const lobbyCountResult = await db.query('SELECT COUNT(*) as count FROM lobbies');
    const onlineUsersResult = await redis.scard('online_users');

    const stats = {
      totalUsers: parseInt(userCountResult.rows[0].count),
      activeLobbies: parseInt(lobbyCountResult.rows[0].count),
      onlineUsers: onlineUsersResult,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Get status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get server status'
    });
  }
});

export { router as systemRoutes };
