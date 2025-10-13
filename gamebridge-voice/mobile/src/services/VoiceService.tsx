import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import {
  RTCPeerConnection,
  RTCView,
  mediaDevices,
  MediaStream,
  MediaStreamTrack,
} from 'react-native-webrtc';
import { useSocket } from './SocketService';
import { useAuth } from './AuthService';
import { LobbyParticipant, ConnectionQuality } from '@gamebridge/shared';

interface VoiceContextType {
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  connections: Map<string, RTCPeerConnection>;
  isMuted: boolean;
  isDeafened: boolean;
  connectionQuality: ConnectionQuality;
  participants: LobbyParticipant[];
  initializeVoice: () => Promise<void>;
  joinLobby: (lobbyId: string) => Promise<void>;
  leaveLobby: () => Promise<void>;
  toggleMute: () => void;
  toggleDeafen: () => void;
  createOffer: (participantId: string) => Promise<void>;
  createAnswer: (participantId: string, offer: RTCSessionDescriptionInit) => Promise<void>;
  addIceCandidate: (participantId: string, candidate: RTCIceCandidateInit) => Promise<void>;
}

const VoiceContext = createContext<VoiceContextType | undefined>(undefined);

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export function VoiceProvider({ children }: { children: React.ReactNode }) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [connections, setConnections] = useState<Map<string, RTCPeerConnection>>(new Map());
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>(ConnectionQuality.DISCONNECTED);
  const [participants, setParticipants] = useState<LobbyParticipant[]>([]);
  const [currentLobbyId, setCurrentLobbyId] = useState<string | null>(null);

  const { socket, emit, on, off } = useSocket();
  const { user } = useAuth();

  useEffect(() => {
    if (socket) {
      // WebRTC signaling events
      on('voice:offer', handleOffer);
      on('voice:answer', handleAnswer);
      on('voice:ice_candidate', handleIceCandidate);
      
      // Lobby events
      on('lobby:joined', handleLobbyJoined);
      on('lobby:participant_joined', handleParticipantJoined);
      on('lobby:participant_left', handleParticipantLeft);
      on('lobby:left', handleLobbyLeft);

      // Voice control events
      on('voice:mute_toggle', handleMuteToggle);
      on('voice:deafen_toggle', handleDeafenToggle);
    }

    return () => {
      if (socket) {
        off('voice:offer');
        off('voice:answer');
        off('voice:ice_candidate');
        off('lobby:joined');
        off('lobby:participant_joined');
        off('lobby:participant_left');
        off('lobby:left');
        off('voice:mute_toggle');
        off('voice:deafen_toggle');
      }
    };
  }, [socket]);

  const initializeVoice = async () => {
    try {
      // Request microphone permissions
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });

      setLocalStream(stream);
      console.log('Voice initialized successfully');
    } catch (error) {
      console.error('Failed to initialize voice:', error);
      throw error;
    }
  };

  const createPeerConnection = (participantId: string): RTCPeerConnection => {
    const peerConnection = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
    });

    // Add local stream
    if (localStream) {
      localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
      });
    }

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      console.log('Received remote stream from:', participantId);
      const remoteStream = event.streams[0];
      setRemoteStreams(prev => new Map(prev.set(participantId, remoteStream)));
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        emit('voice:ice_candidate', {
          to: participantId,
          candidate: event.candidate,
        });
      }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection.connectionState;
      console.log('Connection state changed:', state);
      
      switch (state) {
        case 'connected':
          setConnectionQuality(ConnectionQuality.EXCELLENT);
          break;
        case 'connecting':
          setConnectionQuality(ConnectionQuality.FAIR);
          break;
        case 'disconnected':
        case 'failed':
          setConnectionQuality(ConnectionQuality.DISCONNECTED);
          break;
        default:
          setConnectionQuality(ConnectionQuality.GOOD);
      }
    };

    return peerConnection;
  };

  const joinLobby = async (lobbyId: string) => {
    try {
      if (!localStream) {
        await initializeVoice();
      }

      setCurrentLobbyId(lobbyId);
      emit('lobby:join', { lobbyId });
    } catch (error) {
      console.error('Failed to join lobby:', error);
      throw error;
    }
  };

  const leaveLobby = async () => {
    try {
      // Close all peer connections
      connections.forEach((connection, participantId) => {
        connection.close();
      });
      setConnections(new Map());
      setRemoteStreams(new Map());

      emit('lobby:leave');
      setCurrentLobbyId(null);
      setParticipants([]);
    } catch (error) {
      console.error('Failed to leave lobby:', error);
    }
  };

  const toggleMute = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);

    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !newMutedState;
      });
    }

    emit('voice:mute_toggle', { isMuted: newMutedState });
  };

  const toggleDeafen = () => {
    const newDeafenedState = !isDeafened;
    setIsDeafened(newDeafenedState);

    // Mute/unmute all remote streams
    remoteStreams.forEach(stream => {
      stream.getAudioTracks().forEach(track => {
        track.enabled = !newDeafenedState;
      });
    });

    emit('voice:deafen_toggle', { isDeafened: newDeafenedState });
  };

  const createOffer = async (participantId: string) => {
    try {
      const peerConnection = createPeerConnection(participantId);
      setConnections(prev => new Map(prev.set(participantId, peerConnection)));

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      emit('voice:offer', {
        to: participantId,
        offer: offer,
      });
    } catch (error) {
      console.error('Failed to create offer:', error);
    }
  };

  const createAnswer = async (participantId: string, offer: RTCSessionDescriptionInit) => {
    try {
      const peerConnection = createPeerConnection(participantId);
      setConnections(prev => new Map(prev.set(participantId, peerConnection)));

      await peerConnection.setRemoteDescription(offer);
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      emit('voice:answer', {
        to: participantId,
        answer: answer,
      });
    } catch (error) {
      console.error('Failed to create answer:', error);
    }
  };

  const addIceCandidate = async (participantId: string, candidate: RTCIceCandidateInit) => {
    try {
      const peerConnection = connections.get(participantId);
      if (peerConnection) {
        await peerConnection.addIceCandidate(candidate);
      }
    } catch (error) {
      console.error('Failed to add ICE candidate:', error);
    }
  };

  // Event handlers
  const handleOffer = async (data: { from: string; offer: RTCSessionDescriptionInit }) => {
    await createAnswer(data.from, data.offer);
  };

  const handleAnswer = async (data: { from: string; answer: RTCSessionDescriptionInit }) => {
    try {
      const peerConnection = connections.get(data.from);
      if (peerConnection) {
        await peerConnection.setRemoteDescription(data.answer);
      }
    } catch (error) {
      console.error('Failed to handle answer:', error);
    }
  };

  const handleIceCandidate = async (data: { from: string; candidate: RTCIceCandidateInit }) => {
    await addIceCandidate(data.from, data.candidate);
  };

  const handleLobbyJoined = (lobbyData: any) => {
    setParticipants(lobbyData.participants || []);
    
    // Create offers for existing participants
    lobbyData.participants?.forEach((participant: LobbyParticipant) => {
      if (participant.userId !== user?.id) {
        createOffer(participant.userId);
      }
    });
  };

  const handleParticipantJoined = (participant: LobbyParticipant) => {
    setParticipants(prev => [...prev, participant]);
    
    // Create offer for new participant
    if (participant.userId !== user?.id) {
      createOffer(participant.userId);
    }
  };

  const handleParticipantLeft = (data: { userId: string }) => {
    setParticipants(prev => prev.filter(p => p.userId !== data.userId));
    
    // Close connection and remove stream
    const connection = connections.get(data.userId);
    if (connection) {
      connection.close();
    }
    
    setConnections(prev => {
      const newConnections = new Map(prev);
      newConnections.delete(data.userId);
      return newConnections;
    });
    
    setRemoteStreams(prev => {
      const newStreams = new Map(prev);
      newStreams.delete(data.userId);
      return newStreams;
    });
  };

  const handleLobbyLeft = () => {
    setCurrentLobbyId(null);
    setParticipants([]);
    
    // Close all connections
    connections.forEach(connection => connection.close());
    setConnections(new Map());
    setRemoteStreams(new Map());
  };

  const handleMuteToggle = (data: { userId: string; isMuted: boolean }) => {
    setParticipants(prev => 
      prev.map(p => 
        p.userId === data.userId ? { ...p, isMuted: data.isMuted } : p
      )
    );
  };

  const handleDeafenToggle = (data: { userId: string; isDeafened: boolean }) => {
    setParticipants(prev => 
      prev.map(p => 
        p.userId === data.userId ? { ...p, isDeafened: data.isDeafened } : p
      )
    );
  };

  const value: VoiceContextType = {
    localStream,
    remoteStreams,
    connections,
    isMuted,
    isDeafened,
    connectionQuality,
    participants,
    initializeVoice,
    joinLobby,
    leaveLobby,
    toggleMute,
    toggleDeafen,
    createOffer,
    createAnswer,
    addIceCandidate,
  };

  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>;
}

export function useVoice() {
  const context = useContext(VoiceContext);
  if (context === undefined) {
    throw new Error('useVoice must be used within a VoiceProvider');
  }
  return context;
}
