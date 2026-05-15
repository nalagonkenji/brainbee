import React, { useMemo, useState, useEffect } from 'react';
import './App.css';

/* ===========================================================
   📊 Leaderboard helper — purely localStorage-based.
   Storage key: brainbee_leaderboard
   Shape: {
     [nickname]: {
       nickname, mathStars, englishStars, totalStars,
       highestMathLevel, highestEnglishLevel, highestLevel,
       highestMathScore, highestEnglishScore, updatedAt
     }
   }
   =========================================================== */

// 🔑 Default keys — kept separate per game mode
export const LB_KEY_ADVENTURE = 'brainbee_adventure_leaderboard';
export const LB_KEY_PRACTICE  = 'brainbee_practice_leaderboard';

export const recordLeaderboardEntry = (nickname, stats, key = LB_KEY_ADVENTURE) => {
  if (!nickname || !nickname.trim()) return;
  const all = JSON.parse(localStorage.getItem(key) || '{}');
  const prev = all[nickname] || {};
  const merged = {
    nickname,
    mathStars: Math.max(prev.mathStars || 0, stats.mathStars || 0),
    englishStars: Math.max(prev.englishStars || 0, stats.englishStars || 0),
    highestMathLevel: Math.max(prev.highestMathLevel || 0, stats.highestMathLevel || 0),
    highestEnglishLevel: Math.max(prev.highestEnglishLevel || 0, stats.highestEnglishLevel || 0),
    highestMathScore: Math.max(prev.highestMathScore || 0, stats.highestMathScore || 0),
    highestEnglishScore: Math.max(prev.highestEnglishScore || 0, stats.highestEnglishScore || 0),
    updatedAt: Date.now(),
  };
  merged.totalStars = merged.mathStars + merged.englishStars;
  merged.highestLevel = Math.max(merged.highestMathLevel, merged.highestEnglishLevel);
  all[nickname] = merged;
  localStorage.setItem(key, JSON.stringify(all));
};

export const getLeaderboardEntries = (key = LB_KEY_ADVENTURE) => {
  const all = JSON.parse(localStorage.getItem(key) || '{}');
  return Object.values(all);
};

const TABS = [
  { id: 'level',   label: '🏔 Highest Level',  field: 'highestLevel',        suffix: (v) => `Lv ${v}` },
  { id: 'stars',   label: '⭐ Most Stars',     field: 'totalStars',          suffix: (v) => `${v} ⭐` },
  { id: 'english', label: '📚 English Score',  field: 'highestEnglishScore', suffix: (v) => `${v} pts` },
  { id: 'math',    label: '➗ Math Score',     field: 'highestMathScore',    suffix: (v) => `${v} pts` },
];

const medal = (i) => (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`);

const Leaderboard = ({ currentNickname = '', onClose = () => {}, registeredNicknames = null, leaderboardKey = LB_KEY_ADVENTURE }) => {
  const [tab, setTab] = useState('level');
  const [entries, setEntries] = useState([]);
  const mode = leaderboardKey === LB_KEY_PRACTICE ? 'practice' : 'adventure';

  useEffect(() => {
    const token = localStorage.getItem('brainbee_token');
    fetch(`http://localhost:5000/api/leaderboard/${mode}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setEntries(data);
      })
      .catch(() => {
        const all = getLeaderboardEntries(leaderboardKey);
        setEntries(all);
      });
  }, [mode, leaderboardKey]);
  const active = TABS.find(t => t.id === tab);

  const ranked = [...entries]
    .filter(e => (e[active.field] || 0) > 0 || e.nickname === currentNickname)
    .sort((a, b) => (b[active.field] || 0) - (a[active.field] || 0))
    .slice(0, 10);

  return (
    <div className="lb-overlay" onClick={onClose}>
      <div className="lb-modal" onClick={e => e.stopPropagation()}>
        <div className="lb-header">
          <h2>🏆 Leaderboard</h2>
          <button className="lb-close" onClick={onClose}>✕</button>
        </div>

        <div className="lb-tabs">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`lb-tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="lb-list">
          {ranked.length === 0 ? (
            <div className="lb-empty">
              <div className="lb-empty-icon">🐝</div>
              <p>No scores yet — play a round to claim the top spot!</p>
            </div>
          ) : ranked.map((p, i) => {
            const isMe = p.nickname === currentNickname;
            return (
              <div key={p.nickname} className={`lb-row ${isMe ? 'me' : ''} rank-${i + 1}`}>
                <div className="lb-rank">{medal(i)}</div>
                <div className="lb-name">
                  {p.nickname}{isMe && <span className="lb-you">YOU</span>}
                </div>
                <div className="lb-score">{active.suffix(p[active.field] || 0)}</div>
              </div>
            );
          })}
        </div>

        <p className="lb-footer">Local leaderboard · stored on this device</p>
      </div>
    </div>
  );
};

export default Leaderboard;