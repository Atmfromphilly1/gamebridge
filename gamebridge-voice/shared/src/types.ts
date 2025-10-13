// User and authentication types
export interface User {
  id: string;
  username: string;
  email: string;
  platform: GamingPlatform;
  createdAt: Date;
  lastSeen: Date;
  isOnline: boolean;
}

export enum GamingPlatform {
  XBOX = 'xbox',
  PLAYSTATION = 'playstation',
  PC = 'pc',
  MOBILE = 'mobile'
}

export interface AuthResponse {
  user: User;
  token: string;
}

// Lobby and voice chat types
export interface Lobby {
  id: string;
  name: string;
  hostId: string;
  participants: LobbyParticipant[];
  maxParticipants: number;
  createdAt: Date;
  isPrivate: boolean;
}

export interface LobbyParticipant {
  userId: string;
  username: string;
  platform: GamingPlatform;
  isMuted: boolean;
  isDeafened: boolean;
  joinedAt: Date;
  isHost: boolean;
}

export interface VoiceConnection {
  participantId: string;
  isConnected: boolean;
  connectionQuality: ConnectionQuality;
}

export enum ConnectionQuality {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor',
  DISCONNECTED = 'disconnected'
}

// Friend system types
export interface Friend {
  id: string;
  username: string;
  platform: GamingPlatform;
  isOnline: boolean;
  lastSeen: Date;
  status: UserStatus;
}

export enum UserStatus {
  ONLINE = 'online',
  AWAY = 'away',
  BUSY = 'busy',
  INVISIBLE = 'invisible',
  IN_GAME = 'in_game'
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  fromUsername: string;
  createdAt: Date;
  status: FriendRequestStatus;
}

export enum FriendRequestStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined'
}

// Chat types
export interface ChatMessage {
  id: string;
  lobbyId: string;
  userId: string;
  username: string;
  content: string;
  timestamp: Date;
  type: MessageType;
}

export enum MessageType {
  TEXT = 'text',
  SYSTEM = 'system',
  USER_JOINED = 'user_joined',
  USER_LEFT = 'user_left'
}

// WebRTC signaling types
export interface SignalingMessage {
  type: SignalingType;
  from: string;
  to: string;
  data: any;
}

export enum SignalingType {
  OFFER = 'offer',
  ANSWER = 'answer',
  ICE_CANDIDATE = 'ice_candidate',
  USER_JOINED = 'user_joined',
  USER_LEFT = 'user_left',
  MUTE_TOGGLE = 'mute_toggle',
  DEAFEN_TOGGLE = 'deafen_toggle'
}

// API response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Socket events
export interface SocketEvents {
  // Authentication
  'auth:login': (data: { username: string; password: string }) => void;
  'auth:register': (data: { username: string; email: string; password: string; platform: GamingPlatform }) => void;
  'auth:success': (data: AuthResponse) => void;
  'auth:error': (data: { message: string }) => void;

  // Lobby management
  'lobby:create': (data: { name: string; maxParticipants?: number; isPrivate?: boolean }) => void;
  'lobby:join': (data: { lobbyId: string }) => void;
  'lobby:leave': () => void;
  'lobby:list': (data: Lobby[]) => void;
  'lobby:joined': (data: Lobby) => void;
  'lobby:left': () => void;
  'lobby:participant_joined': (data: LobbyParticipant) => void;
  'lobby:participant_left': (data: { userId: string }) => void;

  // Voice signaling
  'voice:offer': (data: { to: string; offer: RTCSessionDescriptionInit }) => void;
  'voice:answer': (data: { to: string; answer: RTCSessionDescriptionInit }) => void;
  'voice:ice_candidate': (data: { to: string; candidate: RTCIceCandidateInit }) => void;
  'voice:mute_toggle': (data: { userId: string; isMuted: boolean }) => void;
  'voice:deafen_toggle': (data: { userId: string; isDeafened: boolean }) => void;

  // Friends
  'friends:list': (data: Friend[]) => void;
  'friends:request': (data: { username: string }) => void;
  'friends:request_received': (data: FriendRequest) => void;
  'friends:request_response': (data: { requestId: string; accepted: boolean }) => void;
  'friends:status_update': (data: { userId: string; status: UserStatus }) => void;

  // Chat
  'chat:message': (data: { lobbyId: string; content: string }) => void;
  'chat:message_received': (data: ChatMessage) => void;

  // Presence
  'presence:online': () => void;
  'presence:offline': () => void;
  'presence:status_update': (data: { status: UserStatus }) => void;
}
