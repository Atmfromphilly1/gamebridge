import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../../services/AuthService';
import { useSocket } from '../../services/SocketService';
import { useVoice } from '../../services/VoiceService';
import { Lobby, GamingPlatform, formatUsername } from '@gamebridge/shared';

export default function HomeScreen({ navigation }: any) {
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const { socket, emit, on, off } = useSocket();
  const { currentLobbyId } = useVoice();

  useEffect(() => {
    loadLobbies();
    
    if (socket) {
      on('lobby:list', handleLobbyList);
      on('lobby:created', handleLobbyCreated);
    }

    return () => {
      if (socket) {
        off('lobby:list');
        off('lobby:created');
      }
    };
  }, [socket]);

  const loadLobbies = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('http://localhost:3000/api/lobby/list', {
        headers: {
          'Authorization': `Bearer ${user?.token}`,
        },
      });
      
      const data = await response.json();
      if (data.success) {
        setLobbies(data.data);
      }
    } catch (error) {
      console.error('Failed to load lobbies:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadLobbies();
    setRefreshing(false);
  };

  const handleLobbyList = (lobbyList: Lobby[]) => {
    setLobbies(lobbyList);
  };

  const handleLobbyCreated = (lobby: Lobby) => {
    setLobbies(prev => [lobby, ...prev]);
  };

  const joinLobby = async (lobbyId: string) => {
    try {
      navigation.navigate('Lobby', { lobbyId });
    } catch (error) {
      Alert.alert('Error', 'Failed to join lobby');
    }
  };

  const createLobby = () => {
    navigation.navigate('CreateLobby');
  };

  const joinByCode = () => {
    navigation.navigate('JoinLobby');
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

  return (
    <LinearGradient
      colors={['#0b1216', '#121a21']}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.welcomeText}>
            Welcome back, {formatUsername(user?.username || '', user?.platform || GamingPlatform.PC)}!
          </Text>
          <Text style={styles.subtitle}>Find or create a voice lobby</Text>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton} onPress={createLobby}>
            <Icon name="add" size={24} color="#fff" />
            <Text style={styles.actionButtonText}>Create Lobby</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={joinByCode}>
            <Icon name="group-add" size={24} color="#fff" />
            <Text style={styles.actionButtonText}>Join by Code</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Public Lobbies</Text>
          
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading lobbies...</Text>
            </View>
          ) : lobbies.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="group" size={48} color="#666" />
              <Text style={styles.emptyText}>No public lobbies available</Text>
              <Text style={styles.emptySubtext}>Be the first to create one!</Text>
            </View>
          ) : (
            lobbies.map((lobby) => (
              <TouchableOpacity
                key={lobby.id}
                style={[
                  styles.lobbyCard,
                  currentLobbyId === lobby.id && styles.lobbyCardActive,
                ]}
                onPress={() => joinLobby(lobby.id)}
              >
                <View style={styles.lobbyHeader}>
                  <Text style={styles.lobbyName}>{lobby.name}</Text>
                  <View style={styles.lobbyCode}>
                    <Text style={styles.lobbyCodeText}>{lobby.lobbyCode}</Text>
                  </View>
                </View>

                <View style={styles.lobbyInfo}>
                  <View style={styles.lobbyHost}>
                    <Text style={styles.hostEmoji}>
                      {getPlatformEmoji(lobby.hostId as any)}
                    </Text>
                    <Text style={styles.hostText}>Host: {lobby.hostId}</Text>
                  </View>

                  <View style={styles.lobbyParticipants}>
                    <Icon name="people" size={16} color="#ccc" />
                    <Text style={styles.participantCount}>
                      {lobby.participants.length}/{lobby.maxParticipants}
                    </Text>
                  </View>
                </View>

                <View style={styles.lobbyFooter}>
                  <Text style={styles.lobbyTime}>
                    Created {new Date(lobby.createdAt).toLocaleDateString()}
                  </Text>
                  {currentLobbyId === lobby.id && (
                    <View style={styles.currentLobbyBadge}>
                      <Text style={styles.currentLobbyText}>Current</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 10,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#ccc',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 15,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#00d4ff',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  section: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: '#ccc',
    fontSize: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#ccc',
    fontSize: 16,
    marginTop: 10,
  },
  emptySubtext: {
    color: '#666',
    fontSize: 14,
    marginTop: 5,
  },
  lobbyCard: {
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#444',
  },
  lobbyCardActive: {
    borderColor: '#00d4ff',
    backgroundColor: '#1a3a4a',
  },
  lobbyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  lobbyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  lobbyCode: {
    backgroundColor: '#444',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  lobbyCodeText: {
    color: '#00d4ff',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  lobbyInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  lobbyHost: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hostEmoji: {
    fontSize: 16,
  },
  hostText: {
    color: '#ccc',
    fontSize: 14,
  },
  lobbyParticipants: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  participantCount: {
    color: '#ccc',
    fontSize: 14,
  },
  lobbyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lobbyTime: {
    color: '#666',
    fontSize: 12,
  },
  currentLobbyBadge: {
    backgroundColor: '#00d4ff',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  currentLobbyText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
