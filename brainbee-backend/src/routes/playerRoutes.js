const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { verifyToken } = require('../middleware/auth');

// ─────────────────────────────────────────
// GET /api/player/:mode
// Replaces: loadModeData() in App.js
// ─────────────────────────────────────────
router.get('/:mode', verifyToken, async (req, res) => {
  const { mode } = req.params;
  const userId = req.user.id;

  try {
    const result = await pool.query(
      `SELECT * FROM player_data 
       WHERE user_id = $1 AND game_mode = $2`,
      [userId, mode]
    );

    if (result.rows.length === 0) {
      // Create default row if not exists
      await pool.query(
        `INSERT INTO player_data (user_id, game_mode) 
         VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [userId, mode]
      );
      return res.json({
        gold: 0,
        math_stars: 0,
        english_stars: 0,
        math_streak: 0,
        english_streak: 0,
        math_current_level: 1,
        english_current_level: 1,
        math_completed_levels: [],
        english_completed_levels: [],
        owned_avatars: ['bee'],
        equipped_avatar: 'bee',
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────
// PUT /api/player/:mode
// Replaces: all localStorage.setItem calls
// in App.js useEffect hooks
// ─────────────────────────────────────────
router.put('/:mode', verifyToken, async (req, res) => {
  const { mode } = req.params;
  const userId = req.user.id;
  const {
    gold,
    math_stars,
    english_stars,
    math_streak,
    english_streak,
    math_current_level,
    english_current_level,
    math_completed_levels,
    english_completed_levels,
    owned_avatars,
    equipped_avatar,
  } = req.body;

  try {
    await pool.query(
      `INSERT INTO player_data (
         user_id, game_mode, gold,
         math_stars, english_stars,
         math_streak, english_streak,
         math_current_level, english_current_level,
         math_completed_levels, english_completed_levels,
         owned_avatars, equipped_avatar
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (user_id, game_mode) DO UPDATE SET
         gold                     = EXCLUDED.gold,
         math_stars               = EXCLUDED.math_stars,
         english_stars            = EXCLUDED.english_stars,
         math_streak              = EXCLUDED.math_streak,
         english_streak           = EXCLUDED.english_streak,
         math_current_level       = EXCLUDED.math_current_level,
         english_current_level    = EXCLUDED.english_current_level,
         math_completed_levels    = EXCLUDED.math_completed_levels,
         english_completed_levels = EXCLUDED.english_completed_levels,
         owned_avatars            = EXCLUDED.owned_avatars,
         equipped_avatar          = EXCLUDED.equipped_avatar`,
      [
        userId, mode, gold ?? 0,
        math_stars ?? 0, english_stars ?? 0,
        math_streak ?? 0, english_streak ?? 0,
        math_current_level ?? 1, english_current_level ?? 1,
        math_completed_levels ?? [], english_completed_levels ?? [],
        owned_avatars ?? ['bee'], equipped_avatar ?? 'bee',
      ]
    );

    res.json({ message: 'Player data saved!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────
// POST /api/player/history
// Replaces: setGameHistory() in App.js
// ─────────────────────────────────────────
router.post('/history', verifyToken, async (req, res) => {
  const userId = req.user.id;
  const { game_mode, subject, level, correct_count, total_questions } = req.body;

  try {
    await pool.query(
      `INSERT INTO game_history 
       (user_id, game_mode, subject, level, correct_count, total_questions)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, game_mode, subject, level, correct_count, total_questions ?? 5]
    );
    res.status(201).json({ message: 'History saved!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────
// GET /api/player/history/:mode
// Replaces: gameHistory state in App.js
// ─────────────────────────────────────────
router.get('/history/:mode', verifyToken, async (req, res) => {
  const userId = req.user.id;
  const { mode } = req.params;

  try {
    const result = await pool.query(
      `SELECT * FROM game_history 
       WHERE user_id = $1 AND game_mode = $2
       ORDER BY played_at DESC`,
      [userId, mode]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;