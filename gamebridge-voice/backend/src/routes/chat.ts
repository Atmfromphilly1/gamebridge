import { Router } from 'express';
import { db } from '../database/connection';
import { AuthenticatedRequest } from '../middleware/auth';
import { ChatMessage, MessageType } from '@gamebridge/shared';

const router = Router();

// Get chat messages for a lobby
router.get('/lobby/:lobbyId/messages', async (req: AuthenticatedRequest, res) => {
  try {
    const { lobbyId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    const userId = req.user!.id;

    // Verify user is in the lobby
    const participantResult = await db.query(
      'SELECT * FROM lobby_participants WHERE lobby_id = $1 AND user_id = $2',
      [lobbyId, userId]
    );

    if (participantResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Not in this lobby'
      });
    }

    // Get messages
    const result = await db.query(
      `SELECT cm.*, u.username
       FROM chat_messages cm
       LEFT JOIN users u ON cm.user_id = u.id
       WHERE cm.lobby_id = $1
       ORDER BY cm.created_at DESC
       LIMIT $2 OFFSET $3`,
      [lobbyId, parseInt(limit as string), parseInt(offset as string)]
    );

    const messages: ChatMessage[] = result.rows.map(row => ({
      id: row.id,
      lobbyId: row.lobby_id,
      userId: row.user_id,
      username: row.username || 'System',
      content: row.content,
      timestamp: row.created_at,
      type: row.message_type
    }));

    res.json({
      success: true,
      data: messages.reverse() // Reverse to show oldest first
    });

  } catch (error) {
    console.error('Get chat messages error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch messages'
    });
  }
});

// Send a message (handled by socket.io, but keeping REST endpoint for compatibility)
router.post('/lobby/:lobbyId/message', async (req: AuthenticatedRequest, res) => {
  try {
    const { lobbyId } = req.params;
    const { content } = req.body;
    const userId = req.user!.id;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Message content is required'
      });
    }

    if (content.length > 1000) {
      return res.status(400).json({
        success: false,
        error: 'Message too long (max 1000 characters)'
      });
    }

    // Verify user is in the lobby
    const participantResult = await db.query(
      'SELECT * FROM lobby_participants WHERE lobby_id = $1 AND user_id = $2',
      [lobbyId, userId]
    );

    if (participantResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Not in this lobby'
      });
    }

    // Save message to database
    const result = await db.query(
      'INSERT INTO chat_messages (lobby_id, user_id, content, message_type) VALUES ($1, $2, $3, $4) RETURNING *',
      [lobbyId, userId, content.trim(), MessageType.TEXT]
    );

    const message = result.rows[0];

    res.status(201).json({
      success: true,
      data: {
        id: message.id,
        lobbyId: message.lobby_id,
        userId: message.user_id,
        username: req.user!.username,
        content: message.content,
        timestamp: message.created_at,
        type: message.message_type
      },
      message: 'Message sent'
    });

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send message'
    });
  }
});

// Delete a message (only sender or lobby host can delete)
router.delete('/message/:messageId', async (req: AuthenticatedRequest, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user!.id;

    // Get message details
    const messageResult = await db.query(
      `SELECT cm.*, l.host_id
       FROM chat_messages cm
       JOIN lobbies l ON cm.lobby_id = l.id
       WHERE cm.id = $1`,
      [messageId]
    );

    if (messageResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    const message = messageResult.rows[0];

    // Check if user can delete (sender or lobby host)
    if (message.user_id !== userId && message.host_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this message'
      });
    }

    // Delete message
    await db.query('DELETE FROM chat_messages WHERE id = $1', [messageId]);

    res.json({
      success: true,
      message: 'Message deleted'
    });

  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete message'
    });
  }
});

// Get unread message count for user
router.get('/unread-count', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;

    // Get user's last seen timestamp for each lobby
    const lobbyResult = await db.query(
      `SELECT lp.lobby_id, lp.joined_at
       FROM lobby_participants lp
       WHERE lp.user_id = $1`,
      [userId]
    );

    let totalUnread = 0;
    const lobbyUnreadCounts: { [lobbyId: string]: number } = {};

    for (const lobby of lobbyResult.rows) {
      const unreadResult = await db.query(
        `SELECT COUNT(*) as count
         FROM chat_messages
         WHERE lobby_id = $1 AND created_at > $2 AND user_id != $3`,
        [lobby.lobby_id, lobby.joined_at, userId]
      );

      const unreadCount = parseInt(unreadResult.rows[0].count);
      totalUnread += unreadCount;
      lobbyUnreadCounts[lobby.lobby_id] = unreadCount;
    }

    res.json({
      success: true,
      data: {
        totalUnread,
        lobbyUnreadCounts
      }
    });

  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get unread count'
    });
  }
});

// Mark messages as read
router.post('/lobby/:lobbyId/mark-read', async (req: AuthenticatedRequest, res) => {
  try {
    const { lobbyId } = req.params;
    const userId = req.user!.id;

    // Verify user is in the lobby
    const participantResult = await db.query(
      'SELECT * FROM lobby_participants WHERE lobby_id = $1 AND user_id = $2',
      [lobbyId, userId]
    );

    if (participantResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Not in this lobby'
      });
    }

    // Update user's joined_at timestamp to mark messages as read
    await db.query(
      'UPDATE lobby_participants SET joined_at = CURRENT_TIMESTAMP WHERE lobby_id = $1 AND user_id = $2',
      [lobbyId, userId]
    );

    res.json({
      success: true,
      message: 'Messages marked as read'
    });

  } catch (error) {
    console.error('Mark messages as read error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark messages as read'
    });
  }
});

export { router as chatRoutes };
