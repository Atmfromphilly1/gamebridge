import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../../services/AuthService';
import { Friend, FriendRequest, GamingPlatform, formatUsername, formatLastSeen } from '@gamebridge/shared';

export default function FriendsScreen({ navigation }: any) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'search'>('friends');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const { user, token } = useAuth();

  useEffect(() => {
    loadFriends();
    loadFriendRequests();
  }, []);

  const loadFriends = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/friends/list', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      const data = await response.json();
      if (data.success) {
        setFriends(data.data);
      }
    } catch (error) {
      console.error('Failed to load friends:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadFriendRequests = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/friends/requests', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      const data = await response.json();
      if (data.success) {
        setFriendRequests(data.data);
      }
    } catch (error) {
      console.error('Failed to load friend requests:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadFriends(), loadFriendRequests()]);
    setRefreshing(false);
  };

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(`http://localhost:3000/api/friends/search?q=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      const data = await response.json();
      if (data.success) {
        setSearchResults(data.data);
      }
    } catch (error) {
      console.error('Failed to search users:', error);
    }
  };

  const sendFriendRequest = async (username: string) => {
    try {
      const response = await fetch('http://localhost:3000/api/friends/request', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username }),
      });
      
      const data = await response.json();
      if (data.success) {
        Alert.alert('Success', 'Friend request sent!');
      } else {
        Alert.alert('Error', data.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send friend request');
    }
  };

  const respondToFriendRequest = async (requestId: string, accepted: boolean) => {
    try {
      const response = await fetch(`http://localhost:3000/api/friends/request/${requestId}/respond`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accepted }),
      });
      
      const data = await response.json();
      if (data.success) {
        loadFriendRequests();
        loadFriends();
        Alert.alert('Success', accepted ? 'Friend request accepted!' : 'Friend request declined');
      } else {
        Alert.alert('Error', data.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to respond to friend request');
    }
  };

  const removeFriend = async (friendId: string) => {
    Alert.alert(
      'Remove Friend',
      'Are you sure you want to remove this friend?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`http://localhost:3000/api/friends/${friendId}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });
              
              const data = await response.json();
              if (data.success) {
                loadFriends();
                Alert.alert('Success', 'Friend removed');
              } else {
                Alert.alert('Error', data.error);
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to remove friend');
            }
          },
        },
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

  const renderFriends = () => (
    <ScrollView
      style={styles.list}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {friends.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="people" size={48} color="#666" />
          <Text style={styles.emptyText}>No friends yet</Text>
          <Text style={styles.emptySubtext}>Search for users to add as friends</Text>
        </View>
      ) : (
        friends.map((friend) => (
          <View key={friend.id} style={styles.friendCard}>
            <View style={styles.friendInfo}>
              <Text style={styles.friendEmoji}>{getPlatformEmoji(friend.platform)}</Text>
              <View style={styles.friendDetails}>
                <Text style={styles.friendName}>
                  {formatUsername(friend.username, friend.platform)}
                </Text>
                <Text style={styles.friendStatus}>
                  {friend.isOnline ? 'Online' : `Last seen ${formatLastSeen(friend.lastSeen)}`}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removeFriend(friend.id)}
            >
              <Icon name="close" size={20} color="#F44336" />
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  );

  const renderFriendRequests = () => (
    <ScrollView style={styles.list}>
      {friendRequests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="person-add" size={48} color="#666" />
          <Text style={styles.emptyText}>No pending requests</Text>
        </View>
      ) : (
        friendRequests.map((request) => (
          <View key={request.id} style={styles.requestCard}>
            <View style={styles.requestInfo}>
              <Text style={styles.requestEmoji}>{getPlatformEmoji('pc' as GamingPlatform)}</Text>
              <View style={styles.requestDetails}>
                <Text style={styles.requestName}>{request.fromUsername}</Text>
                <Text style={styles.requestTime}>
                  {formatLastSeen(request.createdAt)}
                </Text>
              </View>
            </View>
            <View style={styles.requestButtons}>
              <TouchableOpacity
                style={styles.acceptButton}
                onPress={() => respondToFriendRequest(request.id, true)}
              >
                <Icon name="check" size={20} color="#4CAF50" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.declineButton}
                onPress={() => respondToFriendRequest(request.id, false)}
              >
                <Icon name="close" size={20} color="#F44336" />
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );

  const renderSearch = () => (
    <View style={styles.searchContainer}>
      <View style={styles.searchInputContainer}>
        <Icon name="search" size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={(text) => {
            setSearchQuery(text);
            searchUsers(text);
          }}
          placeholder="Search for users..."
          placeholderTextColor="#666"
        />
      </View>
      
      <ScrollView style={styles.searchResults}>
        {searchResults.map((user) => (
          <View key={user.id} style={styles.searchResultCard}>
            <View style={styles.searchResultInfo}>
              <Text style={styles.searchResultEmoji}>{getPlatformEmoji(user.platform)}</Text>
              <View style={styles.searchResultDetails}>
                <Text style={styles.searchResultName}>
                  {formatUsername(user.username, user.platform)}
                </Text>
                <Text style={styles.searchResultStatus}>
                  {user.isOnline ? 'Online' : `Last seen ${formatLastSeen(user.lastSeen)}`}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => sendFriendRequest(user.username)}
            >
              <Icon name="person-add" size={20} color="#00d4ff" />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <LinearGradient colors={['#1a1a1a', '#2a2a2a']} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Friends</Text>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
          onPress={() => setActiveTab('friends')}
        >
          <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>
            Friends ({friends.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
          onPress={() => setActiveTab('requests')}
        >
          <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
            Requests ({friendRequests.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'search' && styles.activeTab]}
          onPress={() => setActiveTab('search')}
        >
          <Text style={[styles.tabText, activeTab === 'search' && styles.activeTabText]}>
            Search
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {activeTab === 'friends' && renderFriends()}
        {activeTab === 'requests' && renderFriendRequests()}
        {activeTab === 'search' && renderSearch()}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#00d4ff',
  },
  tabText: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#00d4ff',
  },
  content: {
    flex: 1,
  },
  list: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#ccc',
    fontSize: 16,
    marginTop: 16,
  },
  emptySubtext: {
    color: '#666',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  friendCard: {
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  friendEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  friendDetails: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  friendStatus: {
    fontSize: 12,
    color: '#ccc',
  },
  removeButton: {
    padding: 8,
  },
  requestCard: {
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  requestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  requestEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  requestDetails: {
    flex: 1,
  },
  requestName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  requestTime: {
    fontSize: 12,
    color: '#ccc',
  },
  requestButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    padding: 8,
  },
  declineButton: {
    padding: 8,
  },
  searchContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#444',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#fff',
  },
  searchResults: {
    flex: 1,
  },
  searchResultCard: {
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  searchResultInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  searchResultEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  searchResultDetails: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  searchResultStatus: {
    fontSize: 12,
    color: '#ccc',
  },
  addButton: {
    padding: 8,
  },
});
