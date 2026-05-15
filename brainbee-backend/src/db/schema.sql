-- ═══════════════════════════════════════════════════════════════
--  🐝 BrainBee — PostgreSQL Schema
--  Run this file once to set up the entire database.
--  psql -U postgres -d brainbee -f schema.sql
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- Extensions
-- ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- for gen_random_uuid()

-- ─────────────────────────────────────────────────────────────
-- 1. USERS
--    Replaces: localStorage 'brainbee_users'
--    Stores:   username, hashed password, role, nickname
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(50)  NOT NULL UNIQUE,
  password_hash TEXT         NOT NULL,
  role          VARCHAR(10)  NOT NULL DEFAULT 'student' CHECK (role IN ('admin', 'student')),
  nickname      VARCHAR(50)  DEFAULT '',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- 2. PLAYER DATA
--    Replaces: ALL brainbee_{mode}_* localStorage keys
--    One row per (user × game_mode). Upserted after every
--    game action that currently writes to localStorage.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS player_data (
  id                        SERIAL PRIMARY KEY,
  user_id                   INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_mode                 VARCHAR(10)  NOT NULL DEFAULT 'adventure' CHECK (game_mode IN ('adventure', 'practice')),

  -- Economy
  gold                      INTEGER      NOT NULL DEFAULT 0 CHECK (gold >= 0),

  -- Stars & Streaks
  math_stars                INTEGER      NOT NULL DEFAULT 0,
  english_stars             INTEGER      NOT NULL DEFAULT 0,
  math_streak               INTEGER      NOT NULL DEFAULT 0,
  english_streak            INTEGER      NOT NULL DEFAULT 0,

  -- Level Progress
  math_current_level        INTEGER      NOT NULL DEFAULT 1,
  english_current_level     INTEGER      NOT NULL DEFAULT 1,
  math_completed_levels     INTEGER[]    NOT NULL DEFAULT '{}',
  english_completed_levels  INTEGER[]    NOT NULL DEFAULT '{}',

  -- Avatar Shop
  owned_avatars             TEXT[]       NOT NULL DEFAULT '{"bee"}',
  equipped_avatar           VARCHAR(30)  NOT NULL DEFAULT 'bee',

  updated_at                TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  UNIQUE (user_id, game_mode)
);

-- Auto-update updated_at on every write
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_player_data_updated_at
  BEFORE UPDATE ON player_data
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 3. GAME HISTORY
--    Replaces: brainbee_{mode}_gameHistory in localStorage
--    One row per completed game session.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS game_history (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_mode      VARCHAR(10)  NOT NULL CHECK (game_mode IN ('adventure', 'practice')),
  subject        VARCHAR(10)  NOT NULL CHECK (subject IN ('math', 'english')),
  level          INTEGER      NOT NULL DEFAULT 1,
  correct_count  INTEGER      NOT NULL DEFAULT 0,
  total_questions INTEGER     NOT NULL DEFAULT 5,
  played_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_history_user ON game_history(user_id);
CREATE INDEX IF NOT EXISTS idx_game_history_mode ON game_history(game_mode);

-- ─────────────────────────────────────────────────────────────
-- 4. PRACTICE QUESTIONS
--    Replaces: brainbee_practice_questions in localStorage
--    Created by admins. The 'data' JSONB column holds
--    grammar/boss-battle-specific fields (grammarSentence,
--    grammarChoices, challenges, bossBattleQuestions, etc.)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS practice_questions (
  id           SERIAL PRIMARY KEY,
  created_by   INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject      VARCHAR(10)  NOT NULL CHECK (subject IN ('math', 'english')),
  style        VARCHAR(20)  NOT NULL CHECK (style IN ('spelling', 'grammar_checker', 'boss_battle', 'speech')),
  target_word  VARCHAR(100) NOT NULL DEFAULT '',
  data         JSONB        NOT NULL DEFAULT '{}',
  -- 'data' stores:
  --   spelling:        { distractors: [...] }
  --   grammar_checker: { grammarSentence, grammarCorrect, grammarChoices: [...] }
  --   boss_battle:     { bossBattleQuestions: [...], challenges: [...] }
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pq_subject ON practice_questions(subject);
CREATE INDEX IF NOT EXISTS idx_pq_style   ON practice_questions(style);

-- ─────────────────────────────────────────────────────────────
-- 5. LEADERBOARD VIEW
--    Replaces: brainbee_adventure_leaderboard /
--              brainbee_practice_leaderboard
--    This is a VIEW — no extra writes needed.
--    The API queries this view filtered by game_mode.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW leaderboard AS
SELECT
  u.id                                          AS user_id,
  u.nickname,
  pd.game_mode,
  pd.math_stars,
  pd.english_stars,
  (pd.math_stars + pd.english_stars)            AS total_stars,
  pd.math_current_level,
  pd.english_current_level,
  GREATEST(pd.math_current_level,
           pd.english_current_level)            AS highest_level,
  COALESCE((
    SELECT MAX(gh.correct_count)
    FROM game_history gh
    WHERE gh.user_id = u.id
      AND gh.subject = 'math'
      AND gh.game_mode = pd.game_mode
  ), 0)                                         AS highest_math_score,
  COALESCE((
    SELECT MAX(gh.correct_count)
    FROM game_history gh
    WHERE gh.user_id = u.id
      AND gh.subject = 'english'
      AND gh.game_mode = pd.game_mode
  ), 0)                                         AS highest_english_score,
  pd.updated_at
FROM users u
JOIN player_data pd ON pd.user_id = u.id;

-- ─────────────────────────────────────────────────────────────
-- 6. SEED — Default Admin Account
--    Username: admin
--    Password: admin123  (change this immediately after setup!)
--    password_hash below is bcrypt of 'admin123' with 10 rounds
-- ─────────────────────────────────────────────────────────────
INSERT INTO users (username, password_hash, role, nickname)
VALUES (
  'admin',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.',  -- 'password' placeholder — change via API
  'admin',
  'Admin'
)
ON CONFLICT (username) DO NOTHING;

-- Give admin a default player_data row for both modes
INSERT INTO player_data (user_id, game_mode)
SELECT id, 'adventure' FROM users WHERE username = 'admin'
ON CONFLICT (user_id, game_mode) DO NOTHING;

INSERT INTO player_data (user_id, game_mode)
SELECT id, 'practice' FROM users WHERE username = 'admin'
ON CONFLICT (user_id, game_mode) DO NOTHING;