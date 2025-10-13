import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../../services/AuthService';
import { GamingPlatform, formatUsername } from '@gamebridge/shared';

const PLATFORM_OPTIONS = [
  { value: GamingPlatform.XBOX, label: 'Xbox', emoji: '🎮' },
  { value: GamingPlatform.PLAYSTATION, label: 'PlayStation', emoji: '🎯' },
  { value: GamingPlatform.PC, label: 'PC', emoji: '💻' },
  { value: GamingPlatform.MOBILE, label: 'Mobile', emoji: '📱' },
];

const STATUS_OPTIONS = [
  { value: 'online', label: 'Online', color: '#4CAF50' },
  { value: 'away', label: 'Away', color: '#FF9800' },
  { value: 'busy', label: 'Busy', color: '#F44336' },
  { value: 'invisible', label: 'Invisible', color: '#9E9E9E' },
  { value: 'in_game', label: 'In Game', color: '#2196F3' },
];

export default function ProfileScreen({ navigation }: any) {
  const { user, logout, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<GamingPlatform>(
    user?.platform || GamingPlatform.PC
  );
  const [selectedStatus, setSelectedStatus] = useState(user?.status || 'online');

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]
    );
  };

  const handleUpdateProfile = async () => {
    setIsLoading(true);
    try {
      await updateProfile({
        platform: selectedPlatform,
        status: selectedStatus,
      });
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const getPlatformEmoji = (platform: GamingPlatform) => {
    const option = PLATFORM_OPTIONS.find(p => p.value === platform);
    return option?.emoji || '🎮';
  };

  const getStatusColor = (status: string) => {
    const option = STATUS_OPTIONS.find(s => s.value === status);
    return option?.color || '#4CAF50';
  };

  const getStatusLabel = (status: string) => {
    const option = STATUS_OPTIONS.find(s => s.value === status);
    return option?.label || 'Online';
  };

  return (
    <LinearGradient colors={['#1a1a1a', '#2a2a2a']} style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarEmoji}>{getPlatformEmoji(user?.platform || GamingPlatform.PC)}</Text>
          </View>
          <Text style={styles.username}>
            {formatUsername(user?.username || '', user?.platform || GamingPlatform.PC)}
          </Text>
          <Text style={styles.email}>{user?.email}</Text>
          
          <View style={styles.statusContainer}>
            <View
              style={[
                styles.statusIndicator,
                { backgroundColor: getStatusColor(user?.status || 'online') },
              ]}
            />
            <Text style={styles.statusText}>
              {getStatusLabel(user?.status || 'online')}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Profile Settings</Text>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setIsEditing(!isEditing)}
            >
              <Icon name={isEditing ? 'close' : 'edit'} size={20} color="#00d4ff" />
            </TouchableOpacity>
          </View>

          {isEditing ? (
            <View style={styles.editForm}>
              <View style={styles.settingGroup}>
                <Text style={styles.settingLabel}>Gaming Platform</Text>
                <View style={styles.platformOptions}>
                  {PLATFORM_OPTIONS.map((platform) => (
                    <TouchableOpacity
                      key={platform.value}
                      style={[
                        styles.platformOption,
                        selectedPlatform === platform.value && styles.platformOptionSelected,
                      ]}
                      onPress={() => setSelectedPlatform(platform.value)}
                    >
                      <Text style={styles.platformEmoji}>{platform.emoji}</Text>
                      <Text
                        style={[
                          styles.platformText,
                          selectedPlatform === platform.value && styles.platformTextSelected,
                        ]}
                      >
                        {platform.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.settingGroup}>
                <Text style={styles.settingLabel}>Status</Text>
                <View style={styles.statusOptions}>
                  {STATUS_OPTIONS.map((status) => (
                    <TouchableOpacity
                      key={status.value}
                      style={[
                        styles.statusOption,
                        selectedStatus === status.value && styles.statusOptionSelected,
                      ]}
                      onPress={() => setSelectedStatus(status.value)}
                    >
                      <View
                        style={[
                          styles.statusOptionIndicator,
                          { backgroundColor: status.color },
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusOptionText,
                          selectedStatus === status.value && styles.statusOptionTextSelected,
                        ]}
                      >
                        {status.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.editButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setIsEditing(false);
                    setSelectedPlatform(user?.platform || GamingPlatform.PC);
                    setSelectedStatus(user?.status || 'online');
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
                  onPress={handleUpdateProfile}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.settingsList}>
              <View style={styles.settingItem}>
                <Icon name="games" size={20} color="#ccc" />
                <View style={styles.settingItemContent}>
                  <Text style={styles.settingItemLabel}>Gaming Platform</Text>
                  <Text style={styles.settingItemValue}>
                    {getPlatformEmoji(user?.platform || GamingPlatform.PC)} {PLATFORM_OPTIONS.find(p => p.value === user?.platform)?.label || 'PC'}
                  </Text>
                </View>
              </View>

              <View style={styles.settingItem}>
                <Icon name="circle" size={20} color={getStatusColor(user?.status || 'online')} />
                <View style={styles.settingItemContent}>
                  <Text style={styles.settingItemLabel}>Status</Text>
                  <Text style={styles.settingItemValue}>
                    {getStatusLabel(user?.status || 'online')}
                  </Text>
                </View>
              </View>

              <View style={styles.settingItem}>
                <Icon name="email" size={20} color="#ccc" />
                <View style={styles.settingItemContent}>
                  <Text style={styles.settingItemLabel}>Email</Text>
                  <Text style={styles.settingItemValue}>{user?.email}</Text>
                </View>
              </View>

              <View style={styles.settingItem}>
                <Icon name="schedule" size={20} color="#ccc" />
                <View style={styles.settingItemContent}>
                  <Text style={styles.settingItemLabel}>Member Since</Text>
                  <Text style={styles.settingItemValue}>
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Actions</Text>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleLogout}>
            <Icon name="logout" size={20} color="#F44336" />
            <Text style={styles.actionButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>GameBridge Voice v1.0.0</Text>
          <Text style={styles.footerSubtext}>
            Connect gamers across Xbox and PlayStation platforms
          </Text>
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
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#00d4ff',
  },
  avatarEmoji: {
    fontSize: 32,
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  email: {
    fontSize: 16,
    color: '#ccc',
    marginBottom: 16,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#ccc',
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  editButton: {
    padding: 8,
  },
  editForm: {
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 16,
  },
  settingGroup: {
    marginBottom: 24,
  },
  settingLabel: {
    fontSize: 16,
    color: '#ccc',
    marginBottom: 12,
    fontWeight: '500',
  },
  platformOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  platformOption: {
    flex: 1,
    backgroundColor: '#444',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#555',
    minWidth: '45%',
  },
  platformOptionSelected: {
    backgroundColor: '#00d4ff',
    borderColor: '#00d4ff',
  },
  platformEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  platformText: {
    color: '#ccc',
    fontSize: 12,
    fontWeight: '500',
  },
  platformTextSelected: {
    color: '#fff',
  },
  statusOptions: {
    gap: 8,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#444',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#555',
  },
  statusOptionSelected: {
    backgroundColor: '#00d4ff',
    borderColor: '#00d4ff',
  },
  statusOptionIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  statusOptionText: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: '500',
  },
  statusOptionTextSelected: {
    color: '#fff',
  },
  editButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#444',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#555',
  },
  cancelButtonText: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: 'bold',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#00d4ff',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  settingsList: {
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  settingItemContent: {
    flex: 1,
    marginLeft: 12,
  },
  settingItemLabel: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 2,
  },
  settingItemValue: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F44336',
  },
  actionButtonText: {
    color: '#F44336',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: '#555',
    textAlign: 'center',
  },
});
