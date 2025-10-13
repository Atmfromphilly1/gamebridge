import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../../services/AuthService';
import { useSocket } from '../../services/SocketService';
import { useVoice } from '../../services/VoiceService';
import { LobbyParticipant, GamingPlatform, formatUsername, getStatusColor } from '@gamebridge/shared';

export default function LobbyScreen({ route, navigation }: any) {
  const { lobbyId } = route.params;
  const [lobby, setLobby] = useState<any>(null);
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [showChat, setShowChat] = useState(false);
  
  const { user } = useAuth();
  const { socket, emit, on, off } = useSocket();
  const {
    participants,
    isMuted,
    isDeafened,
    connectionQuality,
    joinLobby,
    leaveLobby,
    toggleMute,
    toggleDeafen,
  } = useVoice();

  useEffect(() => {
    if (socket) {
      on('lobby:joined', handleLobbyJoined);
      on('lobby:participant_joined', handleParticipantJoined);
      on('lobby:participant_left', handleParticipantLeft);
      on('lobby:left', handleLobbyLeft);
      on('chat:message_received', handleChatMessage);
      on('lobby:error', handleLobbyError);
    }

    // Join the lobby
    joinLobby(lobbyId);

    return () => {
      if (socket) {
        off('lobby:joined');
        off('lobby:participant_joined');
        off('lobby:participant_left');
        off('lobby:left');
        off('chat:message_received');
        off('lobby:error');
      }
    };
  }, [socket, lobbyId]);

  const handleLobbyJoined = (lobbyData: any) => {
    setLobby(lobbyData);
  };

  const handleParticipantJoined = (participant: LobbyParticipant) => {
    setLobby((prev: any) => ({
      ...prev,
      participants: [...(prev?.participants || []), participant],
    }));
  };

  const handleParticipantLeft = (data: { userId: string }) => {
    setLobby((prev: any) => ({
      ...prev,
      participants: prev?.participants?.filter((p: LobbyParticipant) => p.userId !== data.userId) || [],
    }));
  };

  const handleLobbyLeft = () => {
    navigation.goBack();
  };

  const handleChatMessage = (message: any) => {
    setChatMessages(prev => [...prev, message]);
  };

  const handleLobbyError = (error: any) => {
    Alert.alert('Lobby Error', error.message);
  };

  const sendChatMessage = () => {
    if (chatMessage.trim()) {
      emit('chat:message', {
        lobbyId: lobby?.id,
        content: chatMessage.trim(),
      });
      setChatMessage('');
    }
  };

  const handleLeaveLobby = () => {
    Alert.alert(
      'Leave Lobby',
      'Are you sure you want to leave this lobby?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: leaveLobby },
      ]
    );
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

  const getConnectionQualityColor = () => {
    switch (connectionQuality) {
      case 'excellent': return '#4CAF50';
      case 'good': return '#8BC34A';
      case 'fair': return '#FF9800';
      case 'poor': return '#F44336';
      default: return '#666';
    }
  };

  if (!lobby) {
    return (
      <LinearGradient colors={['#1a1a1a', '#2a2a2a']} style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Joining lobby...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#1a1a1a', '#2a2a2a']} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleLeaveLobby}>
            <Icon name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.lobbyName}>{lobby.name}</Text>
            <Text style={styles.lobbyCode}>Code: {lobby.lobbyCode}</Text>
          </View>
          <TouchableOpacity
            style={styles.chatButton}
            onPress={() => setShowChat(!showChat)}
          >
            <Icon name="chat" size={24} color="#fff" />
            {chatMessages.length > 0 && (
              <View style={styles.chatBadge}>
                <Text style={styles.chatBadgeText}>{chatMessages.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.participantsSection}>
            <Text style={styles.sectionTitle}>
              Participants ({participants.length}/{lobby.maxParticipants})
            </Text>
            
            <ScrollView style={styles.participantsList}>
              {participants.map((participant) => (
                <View key={participant.userId} style={styles.participantCard}>
                  <View style={styles.participantInfo}>
                    <Text style={styles.participantEmoji}>
                      {getPlatformEmoji(participant.platform)}
                    </Text>
                    <View style={styles.participantDetails}>
                      <Text style={styles.participantName}>
                        {formatUsername(participant.username, participant.platform)}
                        {participant.isHost && (
                          <Text style={styles.hostBadge}> (Host)</Text>
                        )}
                      </Text>
                      <View style={styles.participantStatus}>
                        <View
                          style={[
                            styles.statusIndicator,
                            { backgroundColor: getStatusColor('online' as any) },
                          ]}
                        />
                        <Text style={styles.statusText}>Online</Text>
                      </View>
                    </View>
                  </View>
                  
                  <View style={styles.participantControls}>
                    {participant.isMuted && (
                      <Icon name="mic-off" size={20} color="#F44336" />
                    )}
                    {participant.isDeafened && (
                      <Icon name="volume-off" size={20} color="#F44336" />
                    )}
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>

          {showChat && (
            <View style={styles.chatSection}>
              <ScrollView style={styles.chatMessages}>
                {chatMessages.map((message, index) => (
                  <View key={index} style={styles.chatMessage}>
                    <Text style={styles.chatMessageUser}>{message.username}:</Text>
                    <Text style={styles.chatMessageText}>{message.content}</Text>
                  </View>
                ))}
              </ScrollView>
              
              <View style={styles.chatInput}>
                <TextInput
                  style={styles.chatInputField}
                  value={chatMessage}
                  onChangeText={setChatMessage}
                  placeholder="Type a message..."
                  placeholderTextColor="#666"
                  multiline
                />
                <TouchableOpacity style={styles.sendButton} onPress={sendChatMessage}>
                  <Icon name="send" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        <View style={styles.voiceControls}>
          <View style={styles.connectionInfo}>
            <View
              style={[
                styles.connectionIndicator,
                { backgroundColor: getConnectionQualityColor() },
              ]}
            />
            <Text style={styles.connectionText}>
              {connectionQuality.charAt(0).toUpperCase() + connectionQuality.slice(1)}
            </Text>
          </View>

          <View style={styles.controlButtons}>
            <TouchableOpacity
              style={[styles.controlButton, isMuted && styles.controlButtonActive]}
              onPress={toggleMute}
            >
              <Icon
                name={isMuted ? 'mic-off' : 'mic'}
                size={24}
                color={isMuted ? '#F44336' : '#fff'}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlButton, isDeafened && styles.controlButtonActive]}
              onPress={toggleDeafen}
            >
              <Icon
                name={isDeafened ? 'volume-off' : 'volume-up'}
                size={24}
                color={isDeafened ? '#F44336' : '#fff'}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ccc',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    marginRight: 15,
  },
  headerInfo: {
    flex: 1,
  },
  lobbyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  lobbyCode: {
    fontSize: 14,
    color: '#00d4ff',
    fontFamily: 'monospace',
  },
  chatButton: {
    position: 'relative',
  },
  chatBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#F44336',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  participantsSection: {
    flex: 1,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  participantsList: {
    flex: 1,
  },
  participantCard: {
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  participantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  participantEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  participantDetails: {
    flex: 1,
  },
  participantName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  hostBadge: {
    color: '#00d4ff',
    fontSize: 14,
  },
  participantStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#ccc',
  },
  participantControls: {
    flexDirection: 'row',
    gap: 8,
  },
  chatSection: {
    height: 200,
    backgroundColor: '#333',
    borderRadius: 12,
    marginTop: 20,
  },
  chatMessages: {
    flex: 1,
    padding: 12,
  },
  chatMessage: {
    marginBottom: 8,
  },
  chatMessageUser: {
    fontSize: 12,
    color: '#00d4ff',
    fontWeight: 'bold',
  },
  chatMessageText: {
    fontSize: 14,
    color: '#fff',
    marginTop: 2,
  },
  chatInput: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#444',
    alignItems: 'flex-end',
  },
  chatInputField: {
    flex: 1,
    backgroundColor: '#444',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#fff',
    fontSize: 14,
    maxHeight: 80,
  },
  sendButton: {
    backgroundColor: '#00d4ff',
    borderRadius: 8,
    padding: 8,
    marginLeft: 8,
  },
  voiceControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  connectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  connectionText: {
    fontSize: 14,
    color: '#ccc',
  },
  controlButtons: {
    flexDirection: 'row',
    gap: 15,
  },
  controlButton: {
    backgroundColor: '#333',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#444',
  },
  controlButtonActive: {
    backgroundColor: '#F44336',
    borderColor: '#F44336',
  },
});
