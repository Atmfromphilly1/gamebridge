import { Pool } from 'pg';
import Redis from 'ioredis';

// Database connection pool
export const db = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'gamebridge_voice',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Redis client for session management and caching
export const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
});

// Database initialization
export async function initializeDatabase() {
  try {
    // Test database connection
    const client = await db.connect();
    console.log('✅ PostgreSQL connected successfully');
    client.release();

    // Test Redis connection
    await redis.ping();
    console.log('✅ Redis connected successfully');

    // Create tables if they don't exist
    await createTables();
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

async function createTables() {
  const createTablesQuery = `
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username VARCHAR(20) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      platform VARCHAR(20) NOT NULL CHECK (platform IN ('xbox', 'playstation', 'pc', 'mobile')),
      is_online BOOLEAN DEFAULT FALSE,
      last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      status VARCHAR(20) DEFAULT 'online' CHECK (status IN ('online', 'away', 'busy', 'invisible', 'in_game')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Friends table
    CREATE TABLE IF NOT EXISTS friends (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      friend_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, friend_id)
    );

    -- Lobbies table
    CREATE TABLE IF NOT EXISTS lobbies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(50) NOT NULL,
      host_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      max_participants INTEGER DEFAULT 8,
      is_private BOOLEAN DEFAULT FALSE,
      lobby_code VARCHAR(6) UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Lobby participants table
    CREATE TABLE IF NOT EXISTS lobby_participants (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      lobby_id UUID NOT NULL REFERENCES lobbies(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      is_muted BOOLEAN DEFAULT FALSE,
      is_deafened BOOLEAN DEFAULT FALSE,
      joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(lobby_id, user_id)
    );

    -- Chat messages table
    CREATE TABLE IF NOT EXISTS chat_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      lobby_id UUID NOT NULL REFERENCES lobbies(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'user_joined', 'user_left')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Create indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_platform ON users(platform);
    CREATE INDEX IF NOT EXISTS idx_friends_user_id ON friends(user_id);
    CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON friends(friend_id);
    CREATE INDEX IF NOT EXISTS idx_lobbies_host_id ON lobbies(host_id);
    CREATE INDEX IF NOT EXISTS idx_lobbies_lobby_code ON lobbies(lobby_code);
    CREATE INDEX IF NOT EXISTS idx_lobby_participants_lobby_id ON lobby_participants(lobby_id);
    CREATE INDEX IF NOT EXISTS idx_lobby_participants_user_id ON lobby_participants(user_id);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_lobby_id ON chat_messages(lobby_id);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

    -- Create updated_at trigger function
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ language 'plpgsql';

    -- Create triggers for updated_at
    DROP TRIGGER IF EXISTS update_users_updated_at ON users;
    CREATE TRIGGER update_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

    DROP TRIGGER IF EXISTS update_lobbies_updated_at ON lobbies;
    CREATE TRIGGER update_lobbies_updated_at
        BEFORE UPDATE ON lobbies
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
  `;

  await db.query(createTablesQuery);
  console.log('✅ Database tables created/verified successfully');
}
