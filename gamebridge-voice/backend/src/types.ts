export enum GamingPlatform {
  XBOX = 'xbox',
  PLAYSTATION = 'playstation',
  PC = 'pc',
  MOBILE = 'mobile'
}

export interface User {
  id: string;
  username: string;
  email: string;
  platform: GamingPlatform;
  isOnline: boolean;
  lastSeen: Date;
  status: 'online' | 'away' | 'busy' | 'invisible' | 'in_game';
  createdAt: Date;
}

export interface Lobby {
  id: string;
  name: string;
  hostId: string;
  maxParticipants: number;
  isPrivate: boolean;
  lobbyCode?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LobbyParticipant {
  id: string;
  lobbyId: string;
  userId: string;
  username: string;
  platform: GamingPlatform;
  isHost: boolean;
  isMuted: boolean;
  isDeafened: boolean;
  joinedAt: Date;
}

export interface ChatMessage {
  id: string;
  lobbyId: string;
  userId: string;
  username: string;
  content: string;
  messageType: 'text' | 'system' | 'user_joined' | 'user_left';
  createdAt: Date;
}

export interface Friend {
  id: string;
  userId: string;
  friendId: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: Date;
}

// Validation functions
export function validateUsername(username: string): boolean {
  return /^[a-zA-Z0-9_]{3,20}$/.test(username);
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validatePassword(password: string): boolean {
  return password.length >= 8 && /^(?=.*[A-Za-z])(?=.*\d)/.test(password);
}
