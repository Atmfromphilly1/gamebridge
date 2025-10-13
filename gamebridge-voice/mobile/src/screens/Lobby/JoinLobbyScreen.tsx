import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useSocket } from '../../services/SocketService';

export default function JoinLobbyScreen({ navigation }: any) {
  const [lobbyCode, setLobbyCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { emit, on, off } = useSocket();

  React.useEffect(() => {
    if (on) {
      on('lobby:joined', handleLobbyJoined);
      on('lobby:error', handleLobbyError);
    }

    return () => {
      if (off) {
        off('lobby:joined');
        off('lobby:error');
      }
    };
  }, []);

  const handleLobbyJoined = (lobby: any) => {
    navigation.navigate('Lobby', { lobbyId: lobby.id });
  };

  const handleLobbyError = (error: any) => {
    Alert.alert('Error', error.message);
    setIsLoading(false);
  };

  const joinLobby = async () => {
    if (!lobbyCode.trim()) {
      Alert.alert('Error', 'Please enter a lobby code');
      return;
    }

    if (lobbyCode.trim().length !== 6) {
      Alert.alert('Error', 'Lobby code must be 6 characters');
      return;
    }

    setIsLoading(true);
    emit('lobby:join', { lobbyCode: lobbyCode.trim().toUpperCase() });
  };

  return (
    <LinearGradient
      colors={['#1a1a1a', '#2a2a2a']}
      style={styles.container}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Icon name="group-add" size={48} color="#00d4ff" />
          <Text style={styles.title}>Join Lobby</Text>
          <Text style={styles.subtitle}>Enter the 6-character lobby code</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Lobby Code</Text>
            <TextInput
              style={styles.input}
              value={lobbyCode}
              onChangeText={(text) => setLobbyCode(text.toUpperCase())}
              placeholder="ABCDEF"
              placeholderTextColor="#666"
              maxLength={6}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <Text style={styles.inputHint}>
              Enter the 6-character code shared by the lobby host
            </Text>
          </View>
        </View>

        <View style={styles.buttons}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.joinButton, isLoading && styles.joinButtonDisabled]}
            onPress={joinLobby}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.joinButtonText}>Join Lobby</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Don't have a lobby code? Ask a friend to share their lobby code or create your own lobby.
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 20,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    color: '#ccc',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#333',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 24,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#444',
    textAlign: 'center',
    fontFamily: 'monospace',
    letterSpacing: 4,
  },
  inputHint: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  buttons: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#333',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#444',
  },
  cancelButtonText: {
    color: '#ccc',
    fontSize: 16,
    fontWeight: 'bold',
  },
  joinButton: {
    flex: 1,
    backgroundColor: '#00d4ff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  joinButtonDisabled: {
    opacity: 0.6,
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    paddingBottom: 30,
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
  },
});
