import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  onToggleMute: (callback: () => void) => {
    ipcRenderer.on('toggle-mute', callback);
  },
  onToggleDeafen: (callback: () => void) => {
    ipcRenderer.on('toggle-deafen', callback);
  },
  onPushToTalk: (callback: () => void) => {
    ipcRenderer.on('push-to-talk', callback);
  },
  onCreateLobby: (callback: () => void) => {
    ipcRenderer.on('create-lobby', callback);
  },
  onJoinLobby: (callback: () => void) => {
    ipcRenderer.on('join-lobby', callback);
  },
  onUpdateAvailable: (callback: () => void) => {
    ipcRenderer.on('update-available', callback);
  },
  onUpdateDownloaded: (callback: () => void) => {
    ipcRenderer.on('update-downloaded', callback);
  },
});
