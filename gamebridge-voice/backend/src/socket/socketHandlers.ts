import { Server, Socket } from 'socket.io';
import { db } from '../database/connection';
import { redis } from '../database/connection';
import { SignalingType, Lobby, LobbyParticipant, ChatMessage, MessageType } from '@gamebridge/shared';

interface AuthenticatedSocket extends Socket {
  userId: string;
  username: string;
}

export function initializeSocketHandlers(io: Server) {
  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User ${socket.username} (${socket.userId}) connected`);

    // Set user as online in Redis
    redis.sadd('online_users', socket.userId);
    redis.hset(`user:${socket.userId}`, {
      username: socket.username,
      socketId: socket.id,
      connectedAt: new Date().toISOString()
    });

    // Update database online status
    db.query(
      'UPDATE users SET is_online = true, last_seen = CURRENT_TIMESTAMP WHERE id = $1',
      [socket.userId]
    );

    // Join user to their personal room for direct messages
    socket.join(`user:${socket.userId}`);

    // Handle lobby creation
    socket.on('lobby:create', async (data: { name: string; maxParticipants?: number; isPrivate?: boolean }) => {
      try {
        const { name, maxParticipants = 8, isPrivate = false } = data;

        // Generate unique lobby code
        const lobbyCode = generateLobbyCode();

        const result = await db.query(
          `INSERT INTO lobbies (name, host_id, max_participants, is_private, lobby_code)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [name, socket.userId, maxParticipants, isPrivate, lobbyCode]
        );

        const lobby = result.rows[0];

        // Add host as participant
        await db.query(
          'INSERT INTO lobby_participants (lobby_id, user_id) VALUES ($1, $2)',
          [lobby.id, socket.userId]
        );

        // Join socket to lobby room
        socket.join(`lobby:${lobby.id}`);

        // Store lobby info in Redis for quick access
        await redis.hset(`lobby:${lobby.id}`, {
          name: lobby.name,
          hostId: lobby.host_id,
          maxParticipants: lobby.max_participants,
          isPrivate: lobby.is_private,
          lobbyCode: lobby.lobby_code,
          createdAt: lobby.created_at
        });

        // Emit lobby created event
        socket.emit('lobby:created', {
          id: lobby.id,
          name: lobby.name,
          hostId: lobby.host_id,
          maxParticipants: lobby.max_participants,
          isPrivate: lobby.is_private,
          lobbyCode: lobby.lobby_code,
          participants: [{
            userId: socket.userId,
            username: socket.username,
            platform: 'pc', // TODO: Get from user data
            isMuted: false,
            isDeafened: false,
            joinedAt: new Date(),
            isHost: true
          }],
          createdAt: lobby.created_at
        });

        console.log(`Lobby ${lobby.name} created by ${socket.username}`);

      } catch (error) {
        console.error('Lobby creation error:', error);
        socket.emit('lobby:error', { message: 'Failed to create lobby' });
      }
    });

    // Handle lobby joining
    socket.on('lobby:join', async (data: { lobbyId?: string; lobbyCode?: string }) => {
      try {
        const { lobbyId, lobbyCode } = data;
        let lobby;

        if (lobbyId) {
          // Join by lobby ID
          const result = await db.query(
            'SELECT * FROM lobbies WHERE id = $1',
            [lobbyId]
          );
          lobby = result.rows[0];
        } else if (lobbyCode) {
          // Join by lobby code
          const result = await db.query(
            'SELECT * FROM lobbies WHERE lobby_code = $1',
            [lobbyCode]
          );
          lobby = result.rows[0];
        } else {
          socket.emit('lobby:error', { message: 'Lobby ID or code required' });
          return;
        }

        if (!lobby) {
          socket.emit('lobby:error', { message: 'Lobby not found' });
          return;
        }

        // Check if user is already in the lobby
        const existingParticipant = await db.query(
          'SELECT * FROM lobby_participants WHERE lobby_id = $1 AND user_id = $2',
          [lobby.id, socket.userId]
        );

        if (existingParticipant.rows.length > 0) {
          socket.emit('lobby:error', { message: 'Already in this lobby' });
          return;
        }

        // Check lobby capacity
        const participantCount = await db.query(
          'SELECT COUNT(*) FROM lobby_participants WHERE lobby_id = $1',
          [lobby.id]
        );

        if (parseInt(participantCount.rows[0].count) >= lobby.max_participants) {
          socket.emit('lobby:error', { message: 'Lobby is full' });
          return;
        }

        // Add user to lobby
        await db.query(
          'INSERT INTO lobby_participants (lobby_id, user_id) VALUES ($1, $2)',
          [lobby.id, socket.userId]
        );

        // Join socket to lobby room
        socket.join(`lobby:${lobby.id}`);

        // Get all participants
        const participantsResult = await db.query(
          `SELECT lp.*, u.username, u.platform
           FROM lobby_participants lp
           JOIN users u ON lp.user_id = u.id
           WHERE lp.lobby_id = $1`,
          [lobby.id]
        );

        const participants = participantsResult.rows.map(p => ({
          userId: p.user_id,
          username: p.username,
          platform: p.platform,
          isMuted: p.is_muted,
          isDeafened: p.is_deafened,
          joinedAt: p.joined_at,
          isHost: p.user_id === lobby.host_id
        }));

        // Notify all participants about new user
        io.to(`lobby:${lobby.id}`).emit('lobby:participant_joined', {
          userId: socket.userId,
          username: socket.username,
          platform: 'pc', // TODO: Get from user data
          isMuted: false,
          isDeafened: false,
          joinedAt: new Date(),
          isHost: false
        });

        // Send lobby info to joining user
        socket.emit('lobby:joined', {
          id: lobby.id,
          name: lobby.name,
          hostId: lobby.host_id,
          maxParticipants: lobby.max_participants,
          isPrivate: lobby.is_private,
          lobbyCode: lobby.lobby_code,
          participants,
          createdAt: lobby.created_at
        });

        // Add system message
        await addSystemMessage(lobby.id, `${socket.username} joined the lobby`, MessageType.USER_JOINED);

        console.log(`${socket.username} joined lobby ${lobby.name}`);

      } catch (error) {
        console.error('Lobby join error:', error);
        socket.emit('lobby:error', { message: 'Failed to join lobby' });
      }
    });

    // Handle lobby leaving
    socket.on('lobby:leave', async () => {
      try {
        // Find which lobby the user is in
        const participantResult = await db.query(
          'SELECT lp.lobby_id, l.name FROM lobby_participants lp JOIN lobbies l ON lp.lobby_id = l.id WHERE lp.user_id = $1',
          [socket.userId]
        );

        if (participantResult.rows.length === 0) {
          socket.emit('lobby:error', { message: 'Not in any lobby' });
          return;
        }

        const { lobby_id, name } = participantResult.rows[0];

        // Remove user from lobby
        await db.query(
          'DELETE FROM lobby_participants WHERE lobby_id = $1 AND user_id = $2',
          [lobby_id, socket.userId]
        );

        // Leave socket room
        socket.leave(`lobby:${lobby_id}`);

        // Notify other participants
        io.to(`lobby:${lobby_id}`).emit('lobby:participant_left', {
          userId: socket.userId
        });

        // Add system message
        await addSystemMessage(lobby_id, `${socket.username} left the lobby`, MessageType.USER_LEFT);

        // If host left, transfer host or disband lobby
        const lobbyResult = await db.query(
          'SELECT host_id FROM lobbies WHERE id = $1',
          [lobby_id]
        );

        if (lobbyResult.rows[0].host_id === socket.userId) {
          // Find new host or disband lobby
          const remainingParticipants = await db.query(
            'SELECT user_id FROM lobby_participants WHERE lobby_id = $1 ORDER BY joined_at ASC LIMIT 1',
            [lobby_id]
          );

          if (remainingParticipants.rows.length > 0) {
            // Transfer host
            await db.query(
              'UPDATE lobbies SET host_id = $1 WHERE id = $2',
              [remainingParticipants.rows[0].user_id, lobby_id]
            );

            io.to(`lobby:${lobby_id}`).emit('lobby:host_changed', {
              newHostId: remainingParticipants.rows[0].user_id
            });
          } else {
            // Disband lobby
            await db.query('DELETE FROM lobbies WHERE id = $1', [lobby_id]);
            await redis.del(`lobby:${lobby_id}`);
            io.to(`lobby:${lobby_id}`).emit('lobby:disbanded');
          }
        }

        socket.emit('lobby:left');

        console.log(`${socket.username} left lobby ${name}`);

      } catch (error) {
        console.error('Lobby leave error:', error);
        socket.emit('lobby:error', { message: 'Failed to leave lobby' });
      }
    });

    // Handle WebRTC signaling
    socket.on('voice:offer', (data: { to: string; offer: RTCSessionDescriptionInit }) => {
      const targetSocket = io.sockets.sockets.get(data.to);
      if (targetSocket) {
        targetSocket.emit('voice:offer', {
          from: socket.userId,
          offer: data.offer
        });
      }
    });

    socket.on('voice:answer', (data: { to: string; answer: RTCSessionDescriptionInit }) => {
      const targetSocket = io.sockets.sockets.get(data.to);
      if (targetSocket) {
        targetSocket.emit('voice:answer', {
          from: socket.userId,
          answer: data.answer
        });
      }
    });

    socket.on('voice:ice_candidate', (data: { to: string; candidate: RTCIceCandidateInit }) => {
      const targetSocket = io.sockets.sockets.get(data.to);
      if (targetSocket) {
        targetSocket.emit('voice:ice_candidate', {
          from: socket.userId,
          candidate: data.candidate
        });
      }
    });

    // Handle mute/deafen toggles
    socket.on('voice:mute_toggle', async (data: { isMuted: boolean }) => {
      try {
        // Update database
        await db.query(
          'UPDATE lobby_participants SET is_muted = $1 WHERE user_id = $2',
          [data.isMuted, socket.userId]
        );

        // Broadcast to lobby
        const participantResult = await db.query(
          'SELECT lobby_id FROM lobby_participants WHERE user_id = $1',
          [socket.userId]
        );

        if (participantResult.rows.length > 0) {
          const lobbyId = participantResult.rows[0].lobby_id;
          io.to(`lobby:${lobbyId}`).emit('voice:mute_toggle', {
            userId: socket.userId,
            isMuted: data.isMuted
          });
        }
      } catch (error) {
        console.error('Mute toggle error:', error);
      }
    });

    socket.on('voice:deafen_toggle', async (data: { isDeafened: boolean }) => {
      try {
        // Update database
        await db.query(
          'UPDATE lobby_participants SET is_deafened = $1 WHERE user_id = $2',
          [data.isDeafened, socket.userId]
        );

        // Broadcast to lobby
        const participantResult = await db.query(
          'SELECT lobby_id FROM lobby_participants WHERE user_id = $1',
          [socket.userId]
        );

        if (participantResult.rows.length > 0) {
          const lobbyId = participantResult.rows[0].lobby_id;
          io.to(`lobby:${lobbyId}`).emit('voice:deafen_toggle', {
            userId: socket.userId,
            isDeafened: data.isDeafened
          });
        }
      } catch (error) {
        console.error('Deafen toggle error:', error);
      }
    });

    // Handle chat messages
    socket.on('chat:message', async (data: { lobbyId: string; content: string }) => {
      try {
        // Verify user is in the lobby
        const participantResult = await db.query(
          'SELECT * FROM lobby_participants WHERE lobby_id = $1 AND user_id = $2',
          [data.lobbyId, socket.userId]
        );

        if (participantResult.rows.length === 0) {
          socket.emit('chat:error', { message: 'Not in this lobby' });
          return;
        }

        // Save message to database
        const messageResult = await db.query(
          'INSERT INTO chat_messages (lobby_id, user_id, content, message_type) VALUES ($1, $2, $3, $4) RETURNING *',
          [data.lobbyId, socket.userId, data.content, MessageType.TEXT]
        );

        const message = messageResult.rows[0];

        // Broadcast message to lobby
        io.to(`lobby:${data.lobbyId}`).emit('chat:message_received', {
          id: message.id,
          lobbyId: message.lobby_id,
          userId: message.user_id,
          username: socket.username,
          content: message.content,
          timestamp: message.created_at,
          type: message.message_type
        });

      } catch (error) {
        console.error('Chat message error:', error);
        socket.emit('chat:error', { message: 'Failed to send message' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      console.log(`User ${socket.username} (${socket.userId}) disconnected`);

      // Remove from online users
      redis.srem('online_users', socket.userId);
      redis.del(`user:${socket.userId}`);

      // Update database offline status
      await db.query(
        'UPDATE users SET is_online = false, last_seen = CURRENT_TIMESTAMP WHERE id = $1',
        [socket.userId]
      );

      // Handle lobby cleanup if user was in a lobby
      const participantResult = await db.query(
        'SELECT lp.lobby_id, l.name FROM lobby_participants lp JOIN lobbies l ON lp.lobby_id = l.id WHERE lp.user_id = $1',
        [socket.userId]
      );

      if (participantResult.rows.length > 0) {
        const { lobby_id, name } = participantResult.rows[0];

        // Remove user from lobby
        await db.query(
          'DELETE FROM lobby_participants WHERE lobby_id = $1 AND user_id = $2',
          [lobby_id, socket.userId]
        );

        // Notify other participants
        io.to(`lobby:${lobby_id}`).emit('lobby:participant_left', {
          userId: socket.userId
        });

        // Add system message
        await addSystemMessage(lobby_id, `${socket.username} disconnected`, MessageType.USER_LEFT);

        // Handle host transfer if needed
        const lobbyResult = await db.query(
          'SELECT host_id FROM lobbies WHERE id = $1',
          [lobby_id]
        );

        if (lobbyResult.rows[0].host_id === socket.userId) {
          const remainingParticipants = await db.query(
            'SELECT user_id FROM lobby_participants WHERE lobby_id = $1 ORDER BY joined_at ASC LIMIT 1',
            [lobby_id]
          );

          if (remainingParticipants.rows.length > 0) {
            await db.query(
              'UPDATE lobbies SET host_id = $1 WHERE id = $2',
              [remainingParticipants.rows[0].user_id, lobby_id]
            );

            io.to(`lobby:${lobby_id}`).emit('lobby:host_changed', {
              newHostId: remainingParticipants.rows[0].user_id
            });
          } else {
            await db.query('DELETE FROM lobbies WHERE id = $1', [lobby_id]);
            await redis.del(`lobby:${lobby_id}`);
            io.to(`lobby:${lobby_id}`).emit('lobby:disbanded');
          }
        }
      }
    });
  });
}

function generateLobbyCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function addSystemMessage(lobbyId: string, content: string, type: MessageType): Promise<void> {
  try {
    await db.query(
      'INSERT INTO chat_messages (lobby_id, user_id, content, message_type) VALUES ($1, $2, $3, $4)',
      [lobbyId, null, content, type]
    );
  } catch (error) {
    console.error('Failed to add system message:', error);
  }
}
