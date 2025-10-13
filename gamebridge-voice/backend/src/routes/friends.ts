import { Router } from 'express';
import { db } from '../database/connection';
import { AuthenticatedRequest } from '../middleware/auth';
import { Friend, FriendRequest, FriendRequestStatus } from '@gamebridge/shared';

const router = Router();

// Get user's friends list
router.get('/list', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;

    const result = await db.query(
      `SELECT f.id, f.status, f.created_at,
              u.id as friend_id, u.username, u.platform, u.is_online, u.last_seen, u.status as user_status
       FROM friends f
       JOIN users u ON f.friend_id = u.id
       WHERE f.user_id = $1 AND f.status = 'accepted'
       ORDER BY u.is_online DESC, u.username ASC`,
      [userId]
    );

    const friends: Friend[] = result.rows.map(row => ({
      id: row.friend_id,
      username: row.username,
      platform: row.platform,
      isOnline: row.is_online,
      lastSeen: row.last_seen,
      status: row.user_status
    }));

    res.json({
      success: true,
      data: friends
    });

  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch friends'
    });
  }
});

// Get pending friend requests
router.get('/requests', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;

    const result = await db.query(
      `SELECT f.id, f.status, f.created_at,
              u.id as from_user_id, u.username, u.platform, u.is_online
       FROM friends f
       JOIN users u ON f.user_id = u.id
       WHERE f.friend_id = $1 AND f.status = 'pending'
       ORDER BY f.created_at DESC`,
      [userId]
    );

    const requests: FriendRequest[] = result.rows.map(row => ({
      id: row.id,
      fromUserId: row.from_user_id,
      toUserId: userId,
      fromUsername: row.username,
      createdAt: row.created_at,
      status: row.status
    }));

    res.json({
      success: true,
      data: requests
    });

  } catch (error) {
    console.error('Get friend requests error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch friend requests'
    });
  }
});

// Send friend request
router.post('/request', async (req: AuthenticatedRequest, res) => {
  try {
    const { username } = req.body;
    const currentUserId = req.user!.id;

    if (!username) {
      return res.status(400).json({
        success: false,
        error: 'Username is required'
      });
    }

    // Find user by username
    const userResult = await db.query(
      'SELECT id, username FROM users WHERE username = $1',
      [username]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const targetUser = userResult.rows[0];

    if (targetUser.id === currentUserId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot add yourself as a friend'
      });
    }

    // Check if friendship already exists
    const existingFriendship = await db.query(
      'SELECT * FROM friends WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)',
      [currentUserId, targetUser.id]
    );

    if (existingFriendship.rows.length > 0) {
      const friendship = existingFriendship.rows[0];
      if (friendship.status === 'accepted') {
        return res.status(409).json({
          success: false,
          error: 'Already friends with this user'
        });
      } else if (friendship.status === 'pending') {
        return res.status(409).json({
          success: false,
          error: 'Friend request already pending'
        });
      }
    }

    // Create friend request
    const result = await db.query(
      'INSERT INTO friends (user_id, friend_id, status) VALUES ($1, $2, $3) RETURNING *',
      [currentUserId, targetUser.id, FriendRequestStatus.PENDING]
    );

    const friendRequest = result.rows[0];

    res.status(201).json({
      success: true,
      data: {
        id: friendRequest.id,
        fromUserId: currentUserId,
        toUserId: targetUser.id,
        fromUsername: req.user!.username,
        createdAt: friendRequest.created_at,
        status: friendRequest.status
      },
      message: 'Friend request sent'
    });

  } catch (error) {
    console.error('Send friend request error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send friend request'
    });
  }
});

// Respond to friend request
router.post('/request/:requestId/respond', async (req: AuthenticatedRequest, res) => {
  try {
    const { requestId } = req.params;
    const { accepted } = req.body;
    const currentUserId = req.user!.id;

    if (typeof accepted !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'Accepted field must be boolean'
      });
    }

    // Get friend request
    const requestResult = await db.query(
      'SELECT * FROM friends WHERE id = $1 AND friend_id = $2 AND status = $3',
      [requestId, currentUserId, FriendRequestStatus.PENDING]
    );

    if (requestResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Friend request not found'
      });
    }

    const friendRequest = requestResult.rows[0];

    if (accepted) {
      // Accept the request
      await db.query(
        'UPDATE friends SET status = $1 WHERE id = $2',
        [FriendRequestStatus.ACCEPTED, requestId]
      );

      // Create reciprocal friendship
      await db.query(
        'INSERT INTO friends (user_id, friend_id, status) VALUES ($1, $2, $3)',
        [currentUserId, friendRequest.user_id, FriendRequestStatus.ACCEPTED]
      );

      res.json({
        success: true,
        message: 'Friend request accepted'
      });
    } else {
      // Decline the request
      await db.query(
        'UPDATE friends SET status = $1 WHERE id = $2',
        [FriendRequestStatus.DECLINED, requestId]
      );

      res.json({
        success: true,
        message: 'Friend request declined'
      });
    }

  } catch (error) {
    console.error('Respond to friend request error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to respond to friend request'
    });
  }
});

// Remove friend
router.delete('/:friendId', async (req: AuthenticatedRequest, res) => {
  try {
    const { friendId } = req.params;
    const currentUserId = req.user!.id;

    // Remove both directions of the friendship
    await db.query(
      'DELETE FROM friends WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)',
      [currentUserId, friendId]
    );

    res.json({
      success: true,
      message: 'Friend removed'
    });

  } catch (error) {
    console.error('Remove friend error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove friend'
    });
  }
});

// Search users
router.get('/search', async (req: AuthenticatedRequest, res) => {
  try {
    const { q } = req.query;
    const currentUserId = req.user!.id;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    const searchTerm = `%${q.toLowerCase()}%`;

    const result = await db.query(
      `SELECT u.id, u.username, u.platform, u.is_online, u.last_seen, u.status,
              CASE 
                WHEN f1.id IS NOT NULL THEN f1.status
                WHEN f2.id IS NOT NULL THEN f2.status
                ELSE NULL
              END as friendship_status
       FROM users u
       LEFT JOIN friends f1 ON u.id = f1.friend_id AND f1.user_id = $1
       LEFT JOIN friends f2 ON u.id = f2.user_id AND f2.friend_id = $1
       WHERE LOWER(u.username) LIKE $2 AND u.id != $1
       ORDER BY u.is_online DESC, u.username ASC
       LIMIT 20`,
      [currentUserId, searchTerm]
    );

    const users = result.rows.map(row => ({
      id: row.id,
      username: row.username,
      platform: row.platform,
      isOnline: row.is_online,
      lastSeen: row.last_seen,
      status: row.status,
      friendshipStatus: row.friendship_status
    }));

    res.json({
      success: true,
      data: users
    });

  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search users'
    });
  }
});

// Get friend's online status
router.get('/status/:friendId', async (req: AuthenticatedRequest, res) => {
  try {
    const { friendId } = req.params;
    const currentUserId = req.user!.id;

    // Verify friendship
    const friendshipResult = await db.query(
      'SELECT * FROM friends WHERE user_id = $1 AND friend_id = $2 AND status = $3',
      [currentUserId, friendId, FriendRequestStatus.ACCEPTED]
    );

    if (friendshipResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User is not your friend'
      });
    }

    // Get friend's status
    const userResult = await db.query(
      'SELECT id, username, platform, is_online, last_seen, status FROM users WHERE id = $1',
      [friendId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const user = userResult.rows[0];

    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        platform: user.platform,
        isOnline: user.is_online,
        lastSeen: user.last_seen,
        status: user.status
      }
    });

  } catch (error) {
    console.error('Get friend status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get friend status'
    });
  }
});

export { router as friendsRoutes };
