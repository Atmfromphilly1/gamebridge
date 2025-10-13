import { GamingPlatform, UserStatus } from './types';

// Utility functions for shared use across platforms

export const formatUsername = (username: string, platform: GamingPlatform): string => {
  const platformEmoji = {
    [GamingPlatform.XBOX]: '🎮',
    [GamingPlatform.PLAYSTATION]: '🎯',
    [GamingPlatform.PC]: '💻',
    [GamingPlatform.MOBILE]: '📱'
  };
  
  return `${platformEmoji[platform]} ${username}`;
};

export const getStatusColor = (status: UserStatus): string => {
  const colors = {
    [UserStatus.ONLINE]: '#4CAF50',
    [UserStatus.AWAY]: '#FF9800',
    [UserStatus.BUSY]: '#F44336',
    [UserStatus.INVISIBLE]: '#9E9E9E',
    [UserStatus.IN_GAME]: '#2196F3'
  };
  
  return colors[status];
};

export const formatLastSeen = (lastSeen: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - lastSeen.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return lastSeen.toLocaleDateString();
};

export const generateLobbyCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const validateUsername = (username: string): boolean => {
  // Username must be 3-20 characters, alphanumeric and underscores only
  const regex = /^[a-zA-Z0-9_]{3,20}$/;
  return regex.test(username);
};

export const validateEmail = (email: string): boolean => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

export const validatePassword = (password: string): boolean => {
  // Password must be at least 8 characters with at least one letter and one number
  const regex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;
  return regex.test(password);
};
