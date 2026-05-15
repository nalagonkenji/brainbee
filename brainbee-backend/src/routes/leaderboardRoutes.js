const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { verifyToken } = require('../middleware/auth');

// ─────────────────────────────────────────
// GET /api/leaderboard/:mode
// Replaces: getLeaderboardEntries() in
// Leaderboard.js and recordLeaderboardEntry()
// ─────────────────────────────────────────
router.get('/:mode', verifyToken, async (req, res) => {
  const { mode } = req.params;

  try {
    const result = await pool.query(
      `SELECT
         user_id,
         nickname,
         math_stars,
         english_stars,
         total_stars,
         math_current_level,
         english_current_level,
         highest_level,
         highest_math_score,
         highest_english_score,
         updated_at
       FROM leaderboard
       WHERE game_mode = $1
       ORDER BY total_stars DESC
       LIMIT 10`,
      [mode]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;