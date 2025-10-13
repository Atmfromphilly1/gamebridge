import { Router } from 'express';
import { db } from '../database/connection';
import { AuthenticatedRequest } from '../middleware/auth';
import { Lobby, LobbyParticipant } from '@gamebridge/shared';

const router = Router();

// Get all public lobbies
router.get('/list', async (req: AuthenticatedRequest, res) => {
  try {
    const result = await db.query(
      `SELECT l.*, u.username as host_username, COUNT(lp.user_id) as participant_count
       FROM lobbies l
       JOIN users u ON l.host_id = u.id
       LEFT JOIN lobby_participants lp ON l.id = lp.lobby_id
       WHERE l.is_private = false
       GROUP BY l.id, u.username
       ORDER BY l.created_at DESC
       LIMIT 50`
    );

    const lobbies = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      hostId: row.host_id,
      hostUsername: row.host_username,
      maxParticipants: row.max_participants,
      participantCount: parseInt(row.participant_count),
      isPrivate: row.is_private,
      lobbyCode: row.lobby_code,
      createdAt: row.created_at
    }));

    res.json({
      success: true,
      data: lobbies
    });

  } catch (error) {
    console.error('Get lobbies error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch lobbies'
    });
  }
});

// Get lobby details
router.get('/:lobbyId', async (req: AuthenticatedRequest, res) => {
  try {
    const { lobbyId } = req.params;

    // Get lobby info
    const lobbyResult = await db.query(
      `SELECT l.*, u.username as host_username
       FROM lobbies l
       JOIN users u ON l.host_id = u.id
       WHERE l.id = $1`,
      [lobbyId]
    );

    if (lobbyResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Lobby not found'
      });
    }

    const lobby = lobbyResult.rows[0];

    // Get participants
    const participantsResult = await db.query(
      `SELECT lp.*, u.username, u.platform, u.is_online, u.status
       FROM lobby_participants lp
       JOIN users u ON lp.user_id = u.id
       WHERE lp.lobby_id = $1
       ORDER BY lp.joined_at ASC`,
      [lobbyId]
    );

    const participants: LobbyParticipant[] = participantsResult.rows.map(p => ({
      userId: p.user_id,
      username: p.username,
      platform: p.platform,
      isMuted: p.is_muted,
      isDeafened: p.is_deafened,
      joinedAt: p.joined_at,
      isHost: p.user_id === lobby.host_id
    }));

    const lobbyData: Lobby = {
      id: lobby.id,
      name: lobby.name,
      hostId: lobby.host_id,
      participants,
      maxParticipants: lobby.max_participants,
      createdAt: lobby.created_at,
      isPrivate: lobby.is_private
    };

    res.json({
      success: true,
      data: lobbyData
    });

  } catch (error) {
    console.error('Get lobby error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch lobby'
    });
  }
});

// Get lobby by code
router.get('/code/:lobbyCode', async (req: AuthenticatedRequest, res) => {
  try {
    const { lobbyCode } = req.params;

    const lobbyResult = await db.query(
      `SELECT l.*, u.username as host_username
       FROM lobbies l
       JOIN users u ON l.host_id = u.id
       WHERE l.lobby_code = $1`,
      [lobbyCode]
    );

    if (lobbyResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Lobby not found'
      });
    }

    const lobby = lobbyResult.rows[0];

    // Get participants
    const participantsResult = await db.query(
      `SELECT lp.*, u.username, u.platform, u.is_online, u.status
       FROM lobby_participants lp
       JOIN users u ON lp.user_id = u.id
       WHERE lp.lobby_id = $1
       ORDER BY lp.joined_at ASC`,
      [lobby.id]
    );

    const participants: LobbyParticipant[] = participantsResult.rows.map(p => ({
      userId: p.user_id,
      username: p.username,
      platform: p.platform,
      isMuted: p.is_muted,
      isDeafened: p.is_deafened,
      joinedAt: p.joined_at,
      isHost: p.user_id === lobby.host_id
    }));

    const lobbyData: Lobby = {
      id: lobby.id,
      name: lobby.name,
      hostId: lobby.host_id,
      participants,
      maxParticipants: lobby.max_participants,
      createdAt: lobby.created_at,
      isPrivate: lobby.is_private
    };

    res.json({
      success: true,
      data: lobbyData
    });

  } catch (error) {
    console.error('Get lobby by code error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch lobby'
    });
  }
});

// Get user's current lobby
router.get('/current/me', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;

    const result = await db.query(
      `SELECT l.*, u.username as host_username
       FROM lobbies l
       JOIN users u ON l.host_id = u.id
       JOIN lobby_participants lp ON l.id = lp.lobby_id
       WHERE lp.user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        data: null,
        message: 'Not in any lobby'
      });
    }

    const lobby = result.rows[0];

    // Get all participants
    const participantsResult = await db.query(
      `SELECT lp.*, u.username, u.platform, u.is_online, u.status
       FROM lobby_participants lp
       JOIN users u ON lp.user_id = u.id
       WHERE lp.lobby_id = $1
       ORDER BY lp.joined_at ASC`,
      [lobby.id]
    );

    const participants: LobbyParticipant[] = participantsResult.rows.map(p => ({
      userId: p.user_id,
      username: p.username,
      platform: p.platform,
      isMuted: p.is_muted,
      isDeafened: p.is_deafened,
      joinedAt: p.joined_at,
      isHost: p.user_id === lobby.host_id
    }));

    const lobbyData: Lobby = {
      id: lobby.id,
      name: lobby.name,
      hostId: lobby.host_id,
      participants,
      maxParticipants: lobby.max_participants,
      createdAt: lobby.created_at,
      isPrivate: lobby.is_private
    };

    res.json({
      success: true,
      data: lobbyData
    });

  } catch (error) {
    console.error('Get current lobby error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch current lobby'
    });
  }
});

// Kick user from lobby (host only)
router.post('/:lobbyId/kick', async (req: AuthenticatedRequest, res) => {
  try {
    const { lobbyId } = req.params;
    const { userId } = req.body;
    const currentUserId = req.user!.id;

    // Verify current user is host
    const lobbyResult = await db.query(
      'SELECT host_id FROM lobbies WHERE id = $1',
      [lobbyId]
    );

    if (lobbyResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Lobby not found'
      });
    }

    if (lobbyResult.rows[0].host_id !== currentUserId) {
      return res.status(403).json({
        success: false,
        error: 'Only the host can kick users'
      });
    }

    // Verify user is in the lobby
    const participantResult = await db.query(
      'SELECT * FROM lobby_participants WHERE lobby_id = $1 AND user_id = $2',
      [lobbyId, userId]
    );

    if (participantResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not in this lobby'
      });
    }

    // Remove user from lobby
    await db.query(
      'DELETE FROM lobby_participants WHERE lobby_id = $1 AND user_id = $2',
      [lobbyId, userId]
    );

    res.json({
      success: true,
      message: 'User kicked from lobby'
    });

  } catch (error) {
    console.error('Kick user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to kick user'
    });
  }
});

// Update lobby settings (host only)
router.put('/:lobbyId/settings', async (req: AuthenticatedRequest, res) => {
  try {
    const { lobbyId } = req.params;
    const { name, maxParticipants, isPrivate } = req.body;
    const currentUserId = req.user!.id;

    // Verify current user is host
    const lobbyResult = await db.query(
      'SELECT host_id FROM lobbies WHERE id = $1',
      [lobbyId]
    );

    if (lobbyResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Lobby not found'
      });
    }

    if (lobbyResult.rows[0].host_id !== currentUserId) {
      return res.status(403).json({
        success: false,
        error: 'Only the host can update lobby settings'
      });
    }

    // Build update query
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    if (name !== undefined) {
      updateFields.push(`name = $${paramCount}`);
      updateValues.push(name);
      paramCount++;
    }

    if (maxParticipants !== undefined) {
      updateFields.push(`max_participants = $${paramCount}`);
      updateValues.push(maxParticipants);
      paramCount++;
    }

    if (isPrivate !== undefined) {
      updateFields.push(`is_private = $${paramCount}`);
      updateValues.push(isPrivate);
      paramCount++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    updateValues.push(lobbyId);
    const query = `UPDATE lobbies SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramCount} RETURNING *`;

    const result = await db.query(query, updateValues);
    const updatedLobby = result.rows[0];

    res.json({
      success: true,
      data: {
        id: updatedLobby.id,
        name: updatedLobby.name,
        maxParticipants: updatedLobby.max_participants,
        isPrivate: updatedLobby.is_private,
        lobbyCode: updatedLobby.lobby_code
      },
      message: 'Lobby settings updated'
    });

  } catch (error) {
    console.error('Update lobby settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update lobby settings'
    });
  }
});

export { router as lobbyRoutes };
