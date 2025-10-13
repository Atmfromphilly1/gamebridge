# GameBridge Voice - Cross-Platform Gaming Communication

A comprehensive voice chat application that enables seamless communication between Xbox and PlayStation players, built with modern web technologies.

## 🎮 Features

- **Cross-Platform Voice Chat**: Connect Xbox and PlayStation players in real-time voice lobbies
- **Mobile & Desktop Apps**: Native mobile apps (iOS/Android) and desktop app (Windows/Mac/Linux)
- **Real-Time Communication**: WebRTC-powered voice chat with Socket.io for signaling
- **Friend System**: Add friends, manage friend lists, and see online status
- **Lobby Management**: Create, join, and manage voice lobbies with up to 16 participants
- **Text Chat**: In-lobby text messaging alongside voice communication
- **Platform Integration**: Identify users by their gaming platform (Xbox, PlayStation, PC, Mobile)
- **Modern UI**: Beautiful, responsive interface with dark theme optimized for gaming

## 🏗️ Architecture

### Tech Stack
- **Backend**: Node.js + Express + Socket.io + PostgreSQL + Redis
- **Mobile**: React Native (iOS/Android)
- **Desktop**: Electron + React + TypeScript
- **Voice**: WebRTC with TURN/STUN servers
- **Real-time**: Socket.io for signaling and chat
- **Database**: PostgreSQL for data persistence, Redis for session management

### Project Structure
```
gamebridge-voice/
├── backend/           # Node.js API server
├── mobile/            # React Native app
├── desktop/           # Electron app
├── shared/            # Shared types and utilities
└── infrastructure/    # Deployment configs
```

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- PostgreSQL 12+
- Redis 6+
- React Native development environment (for mobile)
- Electron development environment (for desktop)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/gamebridge-voice.git
   cd gamebridge-voice
   ```

2. **Install dependencies**
   ```bash
   npm run install:all
   ```

3. **Set up the database**
   ```bash
   # Create PostgreSQL database
   createdb gamebridge_voice
   
   # Set up environment variables
   cp backend/env.example backend/.env
   # Edit backend/.env with your database credentials
   ```

4. **Start the development servers**
   ```bash
   # Start all services
   npm run dev
   
   # Or start individually:
   npm run dev:backend    # Backend API server
   npm run dev:mobile     # React Native app
   npm run dev:desktop    # Electron app
   ```

### Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gamebridge_voice
DB_USER=postgres
DB_PASSWORD=your_password

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# WebRTC Configuration
TURN_SERVER_URL=turn:your-turn-server:3478
TURN_SERVER_USERNAME=your-turn-username
TURN_SERVER_PASSWORD=your-turn-password
```

## 📱 Mobile App Setup

### iOS Development
```bash
cd mobile
npx react-native run-ios
```

### Android Development
```bash
cd mobile
npx react-native run-android
```

### Required Permissions
- **iOS**: Microphone access in `Info.plist`
- **Android**: `RECORD_AUDIO` permission in `AndroidManifest.xml`

## 🖥️ Desktop App Setup

### Development
```bash
cd desktop
npm run dev
```

### Building
```bash
cd desktop
npm run build
npm run dist
```

## 🔧 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### Lobby Endpoints
- `GET /api/lobby/list` - Get public lobbies
- `GET /api/lobby/:id` - Get lobby details
- `GET /api/lobby/code/:code` - Get lobby by code
- `GET /api/lobby/current/me` - Get user's current lobby

### Friends Endpoints
- `GET /api/friends/list` - Get friends list
- `GET /api/friends/requests` - Get friend requests
- `POST /api/friends/request` - Send friend request
- `POST /api/friends/request/:id/respond` - Respond to friend request
- `DELETE /api/friends/:id` - Remove friend

### Socket Events
- `lobby:create` - Create new lobby
- `lobby:join` - Join lobby
- `lobby:leave` - Leave lobby
- `voice:offer` - WebRTC offer
- `voice:answer` - WebRTC answer
- `voice:ice_candidate` - ICE candidate
- `chat:message` - Send chat message

## 🎯 Usage Guide

### For Console Gamers

1. **Download the mobile app** on your phone or tablet
2. **Create an account** and select your gaming platform (Xbox/PlayStation)
3. **Connect your headset** to your phone using:
   - Bluetooth headset
   - USB-C/Lightning audio adapter
   - Audio splitter cable
4. **Create or join a lobby** with friends
5. **Start gaming** on your console while using the app for voice chat

### Audio Setup Options

**Option 1: Bluetooth Headset**
- Connect Bluetooth headset to phone
- Use console's party chat audio output
- Mix game audio and voice chat

**Option 2: Audio Splitter**
- Connect headset to audio splitter
- One output to console, one to phone
- Get both game audio and voice chat

**Option 3: USB Audio Interface**
- Use USB audio interface
- Connect headset to interface
- Route audio between console and phone

## 🚀 Deployment

### Backend Deployment

**Using Railway:**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Deploy backend
cd backend
railway login
railway init
railway up
```

**Using Docker:**
```bash
# Build and run with Docker Compose
docker-compose up -d
```

### Mobile App Deployment

**iOS App Store:**
```bash
cd mobile
npx react-native run-ios --configuration Release
# Follow Xcode deployment process
```

**Google Play Store:**
```bash
cd mobile
npx react-native run-android --variant=release
# Follow Android deployment process
```

### Desktop App Distribution

**Build for all platforms:**
```bash
cd desktop
npm run dist
```

## 🔒 Security Considerations

- **JWT Authentication**: Secure token-based authentication
- **HTTPS/WSS**: Encrypted connections in production
- **Input Validation**: Comprehensive input sanitization
- **Rate Limiting**: API rate limiting to prevent abuse
- **CORS Configuration**: Proper CORS setup for cross-origin requests

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the [Wiki](https://github.com/yourusername/gamebridge-voice/wiki)
- **Issues**: Report bugs and request features on [GitHub Issues](https://github.com/yourusername/gamebridge-voice/issues)
- **Discord**: Join our community Discord server
- **Email**: support@gamebridge.voice

## 🙏 Acknowledgments

- **WebRTC**: For peer-to-peer voice communication
- **Socket.io**: For real-time signaling
- **React Native**: For cross-platform mobile development
- **Electron**: For desktop app development
- **PostgreSQL**: For reliable data persistence

---

**GameBridge Voice** - Connecting gamers across platforms, one voice chat at a time! 🎮🔊
