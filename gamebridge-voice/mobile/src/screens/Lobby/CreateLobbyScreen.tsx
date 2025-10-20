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
import { useAuth } from '../../services/AuthService';
import { useSocket } from '../../services/SocketService';
import { GamingPlatform } from '@gamebridge/shared';

export default function CreateLobbyScreen({ navigation }: any) {
  const [lobbyName, setLobbyName] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('8');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { user } = useAuth();
  const { emit, on, off } = useSocket();

  React.useEffect(() => {
    if (on) {
      on('lobby:created', handleLobbyCreated);
      on('lobby:error', handleLobbyError);
    }

    return () => {
      if (off) {
        off('lobby:created');
        off('lobby:error');
      }
    };
  }, []);

  const handleLobbyCreated = (lobby: any) => {
    navigation.navigate('Lobby', { lobbyId: lobby.id });
  };

  const handleLobbyError = (error: any) => {
    Alert.alert('Error', error.message);
    setIsLoading(false);
  };

  const createLobby = async () => {
    if (!lobbyName.trim()) {
      Alert.alert('Error', 'Please enter a lobby name');
      return;
    }

    const maxParticipantsNum = parseInt(maxParticipants);
    if (isNaN(maxParticipantsNum) || maxParticipantsNum < 2 || maxParticipantsNum > 16) {
      Alert.alert('Error', 'Max participants must be between 2 and 16');
      return;
    }

    setIsLoading(true);
    emit('lobby:create', {
      name: lobbyName.trim(),
      maxParticipants: maxParticipantsNum,
      isPrivate,
    });
  };

  return (
    <LinearGradient
      colors={['#0b1216', '#121a21']}
      style={styles.container}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Create New Lobby</Text>
          <Text style={styles.subtitle}>Set up your voice chat room</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Lobby Name</Text>
            <TextInput
              style={styles.input}
              value={lobbyName}
              onChangeText={setLobbyName}
              placeholder="Enter lobby name"
              placeholderTextColor="#666"
              maxLength={50}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Max Participants</Text>
            <TextInput
              style={styles.input}
              value={maxParticipants}
              onChangeText={setMaxParticipants}
              placeholder="8"
              placeholderTextColor="#666"
              keyboardType="numeric"
              maxLength={2}
            />
          </View>

          <TouchableOpacity
            style={styles.toggleContainer}
            onPress={() => setIsPrivate(!isPrivate)}
          >
            <View style={styles.toggleInfo}>
              <Icon name="lock" size={20} color="#ccc" />
              <View style={styles.toggleText}>
                <Text style={styles.toggleTitle}>Private Lobby</Text>
                <Text style={styles.toggleSubtitle}>
                  Only people with the lobby code can join
                </Text>
              </View>
            </View>
            <View style={[styles.toggle, isPrivate && styles.toggleActive]}>
              <View style={[styles.toggleThumb, isPrivate && styles.toggleThumbActive]} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.buttons}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.createButton, isLoading && styles.createButtonDisabled]}
            onPress={createLobby}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.createButtonText}>Create Lobby</Text>
            )}
          </TouchableOpacity>
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
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#444',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#444',
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  toggleText: {
    marginLeft: 12,
    flex: 1,
  },
  toggleTitle: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
    marginBottom: 2,
  },
  toggleSubtitle: {
    fontSize: 12,
    color: '#999',
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#444',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: '#00d4ff',
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  buttons: {
    flexDirection: 'row',
    gap: 15,
    paddingBottom: 30,
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
  createButton: {
    flex: 1,
    backgroundColor: '#00d4ff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
