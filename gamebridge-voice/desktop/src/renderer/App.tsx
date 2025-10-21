import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { io, Socket } from 'socket.io-client';
import { GamingPlatform, User, Lobby, LobbyParticipant } from '@gamebridge/shared';
import './styles.css';

const API_BASE_URL = 'http://localhost:3000/api';
const SOCKET_URL = 'http://localhost:3000';

interface AppState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  socket: Socket | null;
  isConnected: boolean;
  currentLobby: Lobby | null;
  participants: LobbyParticipant[];
  isMuted: boolean;
  isDeafened: boolean;
}

function App() {
  console.log('GameBridge Voice App starting...');
  
  const [state, setState] = useState<AppState>({
    user: null,
    token: null,
    isAuthenticated: false,
    socket: null,
    isConnected: false,
    currentLobby: null,
    participants: [],
    isMuted: false,
    isDeafened: false,
  });

  const [showLogin, setShowLogin] = useState(true);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateDownloaded, setUpdateDownloaded] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ 
    username: '', 
    email: '', 
    password: '', 
    platform: GamingPlatform.PC 
  });
  const [showLobbyModal, setShowLobbyModal] = useState(false);
  const [lobbyInput, setLobbyInput] = useState('');
  const [lobbyModalType, setLobbyModalType] = useState<'create' | 'join'>('create');
  const [chatMessages, setChatMessages] = useState<Array<{id: string, userId: string, username: string, content: string, timestamp: Date}>>([]);
  const [chatInput, setChatInput] = useState('');

  useEffect(() => {
    // Load stored auth data
    const storedToken = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('user_data');
    
    if (storedToken && storedUser) {
      setState(prev => ({
        ...prev,
        token: storedToken,
        user: JSON.parse(storedUser),
        isAuthenticated: true,
      }));
      setShowLogin(false);
      initializeSocket(storedToken);
    }

    // Listen for Electron events (only in Electron environment)
    if (typeof window !== 'undefined' && window.electronAPI) {
      window.electronAPI.onToggleMute(() => toggleMute());
      window.electronAPI.onToggleDeafen(() => toggleDeafen());
      window.electronAPI.onPushToTalk(() => {
        // Implement push-to-talk logic
        console.log('Push to talk activated');
      });
      window.electronAPI.onUpdateAvailable?.(() => setUpdateAvailable(true));
      window.electronAPI.onUpdateDownloaded?.(() => setUpdateDownloaded(true));
    }
  }, []);

  const initializeSocket = (token: string) => {
    console.log('Initializing socket with token:', token);
    console.log('Socket URL:', SOCKET_URL);
    
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      console.log('Socket connected successfully');
      setState(prev => ({ ...prev, socket, isConnected: true }));
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setState(prev => ({ ...prev, isConnected: false }));
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    socket.on('lobby:created', (lobby: Lobby) => {
      console.log('Lobby created:', lobby);
      setState(prev => ({ ...prev, currentLobby: lobby, participants: lobby.participants }));
    });

    socket.on('lobby:joined', (lobby: Lobby) => {
      console.log('Lobby joined:', lobby);
      setState(prev => ({ ...prev, currentLobby: lobby, participants: lobby.participants }));
    });

    socket.on('lobby:participant_joined', (participant: LobbyParticipant) => {
      setState(prev => ({
        ...prev,
        participants: [...prev.participants, participant]
      }));
    });

    socket.on('lobby:participant_left', (data: { userId: string }) => {
      setState(prev => ({
        ...prev,
        participants: prev.participants.filter(p => p.userId !== data.userId)
      }));
    });

    socket.on('voice:mute_toggle', (data: { userId: string; isMuted: boolean }) => {
      setState(prev => ({
        ...prev,
        participants: prev.participants.map(p => 
          p.userId === data.userId ? { ...p, isMuted: data.isMuted } : p
        )
      }));
    });

    socket.on('voice:deafen_toggle', (data: { userId: string; isDeafened: boolean }) => {
      setState(prev => ({
        ...prev,
        participants: prev.participants.map(p => 
          p.userId === data.userId ? { ...p, isDeafened: data.isDeafened } : p
        )
      }));
    });

    socket.on('chat:message', (data: { userId: string; username: string; content: string; timestamp: Date }) => {
      console.log('Chat message received:', data);
      setChatMessages(prev => [...prev, { ...data, id: Date.now().toString() }]);
    });
  };

  const login = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      const { user, token } = data.data;
      
      setState(prev => ({ ...prev, user, token, isAuthenticated: true }));
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user_data', JSON.stringify(user));
      setShowLogin(false);
      initializeSocket(token);
    } catch (error: any) {
      alert(`Login failed: ${error.message}`);
    }
  };

  const register = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerForm),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      const { user, token } = data.data;
      
      setState(prev => ({ ...prev, user, token, isAuthenticated: true }));
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user_data', JSON.stringify(user));
      setShowLogin(false);
      initializeSocket(token);
    } catch (error: any) {
      alert(`Registration failed: ${error.message}`);
    }
  };

  const logout = () => {
    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      socket: null,
      isConnected: false,
      currentLobby: null,
      participants: [],
      isMuted: false,
      isDeafened: false,
    });
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    setShowLogin(true);
  };

  const createLobby = () => {
    setLobbyModalType('create');
    setLobbyInput('');
    setShowLobbyModal(true);
  };

  const joinLobby = () => {
    setLobbyModalType('join');
    setLobbyInput('');
    setShowLobbyModal(true);
  };

  const handleLobbySubmit = () => {
    if (lobbyInput.trim()) {
      if (lobbyModalType === 'create') {
        state.socket?.emit('lobby:create', { name: lobbyInput.trim() });
      } else {
        state.socket?.emit('lobby:join', { lobbyCode: lobbyInput.trim() });
      }
      setShowLobbyModal(false);
      setLobbyInput('');
    }
  };

  const leaveLobby = () => {
    state.socket?.emit('lobby:leave');
    setState(prev => ({ ...prev, currentLobby: null, participants: [] }));
  };

  const toggleMute = () => {
    const newMutedState = !state.isMuted;
    setState(prev => ({ ...prev, isMuted: newMutedState }));
    state.socket?.emit('voice:mute_toggle', { isMuted: newMutedState });
  };

  const toggleDeafen = () => {
    const newDeafenedState = !state.isDeafened;
    setState(prev => ({ ...prev, isDeafened: newDeafenedState }));
    state.socket?.emit('voice:deafen_toggle', { isDeafened: newDeafenedState });
  };

  const sendMessage = () => {
    if (chatInput.trim() && state.currentLobby) {
      state.socket?.emit('chat:message', {
        lobbyId: state.currentLobby.id,
        content: chatInput.trim()
      });
      setChatInput('');
    }
  };

  const getPlatformEmoji = (platform: GamingPlatform) => {
    const emojis = {
      [GamingPlatform.XBOX]: '🎮',
      [GamingPlatform.PLAYSTATION]: '🎯',
      [GamingPlatform.PC]: '💻',
      [GamingPlatform.MOBILE]: '📱',
    };
    return emojis[platform] || '🎮';
  };

  if (showLogin) {
    return (
      <div className="login-container">
        {updateAvailable && (
          <div className="update-banner">An update is available. Downloading…</div>
        )}
        {updateDownloaded && (
          <div className="update-banner success">Update ready. Restart the app to install.</div>
        )}
        <div className="login-card">
          <h1>GameBridge Voice</h1>
          <p>Connect gamers across Xbox and PlayStation platforms</p>
          
          <div className="form-group">
            <label>Username or Email</label>
            <input
              type="text"
              value={loginForm.username}
              onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
              placeholder="Enter username or email"
            />
          </div>
          
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={loginForm.password}
              onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
              placeholder="Enter password"
            />
          </div>
          
          <button className="btn-primary" onClick={login}>
            Sign In
          </button>
          
          <button className="btn-secondary" onClick={() => setShowLogin(false)}>
            Create Account
          </button>
        </div>
      </div>
    );
  }

  if (!state.isAuthenticated) {
    return (
      <div className="login-container">
        <div className="login-card">
          <h1>Create Account</h1>
          
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={registerForm.username}
              onChange={(e) => setRegisterForm(prev => ({ ...prev, username: e.target.value }))}
              placeholder="Choose a username"
            />
          </div>
          
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={registerForm.email}
              onChange={(e) => setRegisterForm(prev => ({ ...prev, email: e.target.value }))}
              placeholder="Enter your email"
            />
          </div>
          
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={registerForm.password}
              onChange={(e) => setRegisterForm(prev => ({ ...prev, password: e.target.value }))}
              placeholder="Create a password"
            />
          </div>
          
          <div className="form-group">
            <label>Gaming Platform</label>
            <select
              value={registerForm.platform}
              onChange={(e) => setRegisterForm(prev => ({ ...prev, platform: e.target.value as GamingPlatform }))}
            >
              <option value={GamingPlatform.XBOX}>🎮 Xbox</option>
              <option value={GamingPlatform.PLAYSTATION}>🎯 PlayStation</option>
              <option value={GamingPlatform.PC}>💻 PC</option>
              <option value={GamingPlatform.MOBILE}>📱 Mobile</option>
            </select>
          </div>
          
          <button className="btn-primary" onClick={register}>
            Create Account
          </button>
          
          <button className="btn-secondary" onClick={() => setShowLogin(true)}>
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-left">
          <h1>GameBridge Voice</h1>
          <div className="connection-status">
            <div className={`status-indicator ${state.isConnected ? 'connected' : 'disconnected'}`} />
            <span>{state.isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>
        
        <div className="header-right">
          <span className="user-info">
            {getPlatformEmoji(state.user?.platform || GamingPlatform.PC)} {state.user?.username}
          </span>
          <button className="btn-logout" onClick={logout}>Logout</button>
        </div>
      </header>

      <main className="app-main">
        {!state.currentLobby ? (
          <div className="lobby-selection">
            <h2>Welcome, {state.user?.username}!</h2>
            <p>Choose an option to get started:</p>
            
            <div className="lobby-actions">
              <button className="btn-primary" onClick={createLobby}>
                Create New Lobby
              </button>
              <button className="btn-secondary" onClick={joinLobby}>
                Join by Code
              </button>
            </div>
          </div>
        ) : (
          <div className="lobby-container">
            <div className="lobby-header">
              <h2>{state.currentLobby.name}</h2>
              {/* lobbyCode may be present when coming from socket events */}
              {((state.currentLobby as unknown) as { lobbyCode?: string })?.lobbyCode && (
                <div className="lobby-code">Code: {((state.currentLobby as unknown) as { lobbyCode?: string }).lobbyCode}</div>
              )}
              <button className="btn-danger" onClick={leaveLobby}>
                Leave Lobby
              </button>
            </div>

            <div className="participants-section">
              <h3>Participants ({state.participants.length}/{state.currentLobby.maxParticipants})</h3>
              <div className="participants-list">
                {state.participants.map((participant) => (
                  <div key={participant.userId} className="participant-card">
                    <div className="participant-info">
                      <span className="participant-emoji">
                        {getPlatformEmoji(participant.platform)}
                      </span>
                      <div className="participant-details">
                        <div className="participant-name">
                          {participant.username}
                          {participant.isHost && <span className="host-badge">Host</span>}
                        </div>
                        <div className="participant-status">Online</div>
                      </div>
                    </div>
                    <div className="participant-controls">
                      {participant.isMuted && <span className="muted-indicator">🔇</span>}
                      {participant.isDeafened && <span className="deafened-indicator">🔇</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lobby-content">
              <div className="chat-section">
                <h3>Chat</h3>
                <div className="chat-messages">
                  {chatMessages.map((message) => (
                    <div key={message.id} className="chat-message">
                      <span className="message-username">{message.username}:</span>
                      <span className="message-content">{message.content}</span>
                      <span className="message-time">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="chat-input">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type a message..."
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  />
                  <button className="btn-primary" onClick={sendMessage}>
                    Send
                  </button>
                </div>
              </div>

              <div className="voice-controls">
                <button 
                  className={`voice-btn ${state.isMuted ? 'active' : ''}`}
                  onClick={toggleMute}
                >
                  {state.isMuted ? '🔇' : '🎤'} {state.isMuted ? 'Unmute' : 'Mute'}
                </button>
                <button 
                  className={`voice-btn ${state.isDeafened ? 'active' : ''}`}
                  onClick={toggleDeafen}
                >
                  {state.isDeafened ? '🔇' : '🔊'} {state.isDeafened ? 'Undeafen' : 'Deafen'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Lobby Modal */}
      {showLobbyModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>{lobbyModalType === 'create' ? 'Create New Lobby' : 'Join Lobby'}</h3>
            <div className="form-group">
              <label>{lobbyModalType === 'create' ? 'Lobby Name' : 'Lobby Code'}</label>
              <input
                type="text"
                value={lobbyInput}
                onChange={(e) => setLobbyInput(e.target.value)}
                placeholder={lobbyModalType === 'create' ? 'Enter lobby name' : 'Enter lobby code'}
                onKeyPress={(e) => e.key === 'Enter' && handleLobbySubmit()}
                autoFocus
              />
            </div>
            <div className="modal-actions">
              <button className="btn-primary" onClick={handleLobbySubmit}>
                {lobbyModalType === 'create' ? 'Create' : 'Join'}
              </button>
              <button className="btn-secondary" onClick={() => setShowLobbyModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<App />);
