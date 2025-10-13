import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Screens
import LoginScreen from './src/screens/Auth/LoginScreen';
import RegisterScreen from './src/screens/Auth/RegisterScreen';
import HomeScreen from './src/screens/Home/HomeScreen';
import LobbyScreen from './src/screens/Lobby/LobbyScreen';
import FriendsScreen from './src/screens/Friends/FriendsScreen';
import ProfileScreen from './src/screens/Profile/ProfileScreen';
import CreateLobbyScreen from './src/screens/Lobby/CreateLobbyScreen';
import JoinLobbyScreen from './src/screens/Lobby/JoinLobbyScreen';

// Services
import { AuthProvider, useAuth } from './src/services/AuthService';
import { SocketProvider } from './src/services/SocketService';
import { VoiceProvider } from './src/services/VoiceService';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Auth Stack Navigator
function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#1a1a1a' }
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

// Main Tab Navigator
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Home':
              iconName = 'home';
              break;
            case 'Friends':
              iconName = 'people';
              break;
            case 'Profile':
              iconName = 'person';
              break;
            default:
              iconName = 'circle';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#00d4ff',
        tabBarInactiveTintColor: '#666',
        tabBarStyle: {
          backgroundColor: '#2a2a2a',
          borderTopColor: '#333',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8
        },
        headerStyle: {
          backgroundColor: '#2a2a2a',
          borderBottomColor: '#333'
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold'
        }
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ title: 'GameBridge Voice' }}
      />
      <Tab.Screen 
        name="Friends" 
        component={FriendsScreen}
        options={{ title: 'Friends' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

// Main App Stack Navigator
function AppStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#2a2a2a',
          borderBottomColor: '#333'
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold'
        },
        cardStyle: { backgroundColor: '#1a1a1a' }
      }}
    >
      <Stack.Screen 
        name="MainTabs" 
        component={MainTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Lobby" 
        component={LobbyScreen}
        options={{ 
          title: 'Voice Lobby',
          headerBackTitleVisible: false
        }}
      />
      <Stack.Screen 
        name="CreateLobby" 
        component={CreateLobbyScreen}
        options={{ 
          title: 'Create Lobby',
          headerBackTitleVisible: false
        }}
      />
      <Stack.Screen 
        name="JoinLobby" 
        component={JoinLobbyScreen}
        options={{ 
          title: 'Join Lobby',
          headerBackTitleVisible: false
        }}
      />
    </Stack.Navigator>
  );
}

// Root Navigator Component
function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null; // You can add a loading screen here
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}

// Main App Component
export default function App() {
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      <AuthProvider>
        <SocketProvider>
          <VoiceProvider>
            <RootNavigator />
          </VoiceProvider>
        </SocketProvider>
      </AuthProvider>
    </>
  );
}
