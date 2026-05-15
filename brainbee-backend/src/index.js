const express = require('express');
const cors = require('cors');
require('dotenv').config();

// ── Route imports ──
const authRoutes        = require('./routes/authRoutes');
const playerRoutes      = require('./routes/playerRoutes');
const leaderboardRoutes = require('./routes/leaderboardRoutes');
const questionRoutes    = require('./routes/questionRoutes');

const app = express();

// ── Middleware ──
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://brainbee-three.vercel.app',
    'https://brainbee-kcc.vercel.app',
    'https://brainbee-9gdgnh2pq-nalagonkenji-9971s-projects.vercel.app'
  ],
  credentials: true,
}));
app.use(express.json());

// ── Routes ──
app.use('/api/auth',        authRoutes);
app.use('/api/player',      playerRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/questions',   questionRoutes);

// ── Health check ──
app.get('/', (req, res) => {
  res.json({ message: '🐝 BrainBee API is running!' });
});

// ── Start server ──
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 BrainBee backend running on http://localhost:${PORT}`);
});