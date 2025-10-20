import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
import { db } from '../database/connection';
import { GamingPlatform, validateUsername, validateEmail, validatePassword } from '../types';

const router = Router();

// Validation schemas
const registerSchema = Joi.object({
  username: Joi.string().min(3).max(20).pattern(/^[a-zA-Z0-9_]+$/).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).pattern(/^(?=.*[A-Za-z])(?=.*\d)/).required(),
  platform: Joi.string().valid('xbox', 'playstation', 'pc', 'mobile').required()
});

const loginSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required()
});

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details.map(d => d.message)
      });
    }

    const { username, email, password, platform } = value;

    // Check if user already exists
    const existingUser = await db.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Username or email already exists'
      });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const result = await db.query(
      `INSERT INTO users (username, email, password_hash, platform, is_online, status)
       VALUES ($1, $2, $3, $4, true, 'online')
       RETURNING id, username, email, platform, is_online, last_seen, created_at`,
      [username, email, passwordHash, platform]
    );

    const user = result.rows[0];

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        username: user.username,
        platform: user.platform 
      },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          platform: user.platform,
          isOnline: user.is_online,
          lastSeen: user.last_seen,
          createdAt: user.created_at
        },
        token
      },
      message: 'User registered successfully'
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details.map(d => d.message)
      });
    }

    const { username, password } = value;

    // Find user by username or email
    const result = await db.query(
      'SELECT id, username, email, password_hash, platform, is_online, last_seen, created_at FROM users WHERE username = $1 OR email = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Update user online status
    await db.query(
      'UPDATE users SET is_online = true, last_seen = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        username: user.username,
        platform: user.platform 
      },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          platform: user.platform,
          isOnline: true,
          lastSeen: new Date(),
          createdAt: user.created_at
        },
        token
      },
      message: 'Login successful'
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Logout user
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    // Update user offline status
    await db.query(
      'UPDATE users SET is_online = false, last_seen = CURRENT_TIMESTAMP WHERE id = $1',
      [decoded.userId]
    );

    res.json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get current user profile
router.get('/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    const result = await db.query(
      'SELECT id, username, email, platform, is_online, last_seen, status, created_at FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const user = result.rows[0];

    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        platform: user.platform,
        isOnline: user.is_online,
        lastSeen: user.last_seen,
        status: user.status,
        createdAt: user.created_at
      }
    });

  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Update user profile
router.put('/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    const updateSchema = Joi.object({
      username: Joi.string().min(3).max(20).pattern(/^[a-zA-Z0-9_]+$/),
      email: Joi.string().email(),
      platform: Joi.string().valid('xbox', 'playstation', 'pc', 'mobile'),
      status: Joi.string().valid('online', 'away', 'busy', 'invisible', 'in_game')
    });

    const { error, value } = updateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details.map(d => d.message)
      });
    }

    // Check if username/email already exists (if being updated)
    if (value.username || value.email) {
      const existingUser = await db.query(
        'SELECT id FROM users WHERE (username = $1 OR email = $2) AND id != $3',
        [value.username, value.email, decoded.userId]
      );

      if (existingUser.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'Username or email already exists'
        });
      }
    }

    // Build dynamic update query
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    Object.entries(value).forEach(([key, val]) => {
      if (val !== undefined) {
        updateFields.push(`${key} = $${paramCount}`);
        updateValues.push(val);
        paramCount++;
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    updateValues.push(decoded.userId);
    const query = `UPDATE users SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramCount} RETURNING *`;

    const result = await db.query(query, updateValues);
    const user = result.rows[0];

    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        platform: user.platform,
        isOnline: user.is_online,
        lastSeen: user.last_seen,
        status: user.status,
        createdAt: user.created_at
      },
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export { router as authRoutes };
