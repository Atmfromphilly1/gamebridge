export {};
declare global {
  interface Window {
    electronAPI?: {
      onToggleMute: (cb: () => void) => void;
      onToggleDeafen: (cb: () => void) => void;
      onPushToTalk: (cb: () => void) => void;
      onCreateLobby?: (cb: () => void) => void;
      onJoinLobby?: (cb: () => void) => void;
      onUpdateAvailable?: (cb: () => void) => void;
      onUpdateDownloaded?: (cb: () => void) => void;
    };
  }
}

