const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const { verifyAdmin, verifyToken } = require('../middleware/auth');
require('dotenv').config();

// ─────────────────────────────────────────
// POST /api/auth/login
// Replaces: handleLogin() in App.js
// ─────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Username and password required' });

  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1', [username]
    );
    const user = result.rows[0];
    if (!user)
      return res.status(401).json({ error: 'Invalid username or password' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match)
      return res.status(401).json({ error: 'Invalid username or password' });

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id:       user.id,
        username: user.username,
        role:     user.role,
        nickname: user.nickname,
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────
// POST /api/auth/register
// Replaces: handleCreateUser() in App.js
// Admin only!
// ─────────────────────────────────────────
router.post('/register', verifyAdmin, async (req, res) => {
  const { username, password, role, nickname } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Username and password required' });

  try {
    const exists = await pool.query(
      'SELECT id FROM users WHERE username = $1', [username]
    );
    if (exists.rows.length > 0)
      return res.status(409).json({ error: 'Username already exists' });

    const password_hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (username, password_hash, role, nickname)
       VALUES ($1, $2, $3, $4) RETURNING id, username, role, nickname`,
      [username, password_hash, role || 'student', nickname || '']
    );
    const newUser = result.rows[0];

    // Create default player_data for both modes
    await pool.query(
      `INSERT INTO player_data (user_id, game_mode) VALUES ($1, 'adventure'), ($1, 'practice')
       ON CONFLICT (user_id, game_mode) DO NOTHING`,
      [newUser.id]
    );

    res.status(201).json({ message: 'Account created!', user: newUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────
// GET /api/auth/users
// Replaces: users state in App.js (admin panel list)
// Admin only!
// ─────────────────────────────────────────
router.get('/users', verifyAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, role, nickname, created_at FROM users ORDER BY created_at ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────
// DELETE /api/auth/users/:id
// Replaces: handleDeleteUser() in App.js
// Admin only!
// ─────────────────────────────────────────
router.delete('/users/:id', verifyAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────
// PATCH /api/auth/users/:id/nickname
// Saves nickname after first login
// ─────────────────────────────────────────
router.patch('/users/:id/nickname', verifyToken, async (req, res) => {
  const { nickname } = req.body;
  try {
    await pool.query(
      'UPDATE users SET nickname = $1 WHERE id = $2',
      [nickname, req.params.id]
    );
    res.json({ message: 'Nickname saved!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/me — get own user data (any logged in user)
router.get('/me', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, role, nickname FROM users WHERE id = $1',
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;