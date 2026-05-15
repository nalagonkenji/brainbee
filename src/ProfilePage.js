import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import './App.css';

const ProfilePage = ({
  nickname,
  gameHistory,
  mathStars,
  englishStars,
  goldCount,
  mathStreak,
  englishStreak,
  selectedMode,
  onClose,
  language,
  currentBadgeInfo,
  starsForNextBadge,
  ownedAvatars = ['bee'],
  equippedAvatar = 'bee',
  onEquipAvatar = () => {},
  onOpenShop = () => {},
  onOpenLeaderboard = () => {}
}) => {
  const [activeTab, setActiveTab] = React.useState('profile');
  const [showAvatarPicker, setShowAvatarPicker] = React.useState(false);

  const AVATARS = {
    bee: '/avatars/bee.png', cat: '/avatars/cat.png', dog: '/avatars/dog.png',
    unicorn: '/avatars/unicorn.png', dragon: '/avatars/dragon.png', astronaut: '/avatars/astronaut.png'
  };
  const equippedImg = AVATARS[equippedAvatar] || AVATARS.bee;

  const modeHistory = gameHistory.filter(record => record.mode === selectedMode);
  
  const getPerformanceData = () => {
    const checkpoints = [10, 20, 30, 40, 50];
    const performanceMap = {};
    checkpoints.forEach(cp => {
      performanceMap[cp] = { checkpoint: `Lvl ${cp}`, math: null, english: null };
    });
    ['math', 'english'].forEach(mode => {
      checkpoints.forEach(cp => {
        const startLevel = cp - 9;
        const endLevel = cp;
        const levelRecords = gameHistory.filter(
          record => record.mode === mode && record.level >= startLevel && record.level <= endLevel
        );
        if (levelRecords.length > 0) {
          const avgPercentage = levelRecords.reduce((sum, r) => sum + r.correctPercentage, 0) / levelRecords.length;
          performanceMap[cp][mode] = Math.round(avgPercentage);
        }
      });
    });
    return Object.values(performanceMap);
  };

  const performanceData = useMemo(() => getPerformanceData(), [gameHistory]);
  const highestStreak = selectedMode === 'math' ? mathStreak : englishStreak;
const currentStars = selectedMode === 'math' ? mathStars : englishStars;
const completedLevels = modeHistory.filter(r => r.correctCount > 0).length;

//  Pie Chart Analytics Calculations
const mathHistory = useMemo(() => gameHistory.filter(h => h.mode === 'math'), [gameHistory]);
const englishHistory = useMemo(() => gameHistory.filter(h => h.mode === 'english'), [gameHistory]);

const mathLevels = mathHistory.length;
const englishLevels = englishHistory.length;
const hasData = mathLevels > 0 || englishLevels > 0;

const mathTotalQ = mathHistory.reduce((sum, h) => sum + h.totalQuestions, 0);
const mathCorrectQ = mathHistory.reduce((sum, h) => sum + h.correctCount, 0);
const mathAcc = mathTotalQ > 0 ? Math.round((mathCorrectQ / mathTotalQ) * 100) : 0;

const englishTotalQ = englishHistory.reduce((sum, h) => sum + h.totalQuestions, 0);
const englishCorrectQ = englishHistory.reduce((sum, h) => sum + h.correctCount, 0);
const englishAcc = englishTotalQ > 0 ? Math.round((englishCorrectQ / englishTotalQ) * 100) : 0;

const levelPieData = [
  { name: 'Math', value: hasData ? mathLevels : 1 },
  { name: 'English', value: hasData ? englishLevels : 1 }
];
const accPieData = [
  { name: 'Math', value: hasData ? mathAcc : 1 },
  { name: 'English', value: hasData ? englishAcc : 1 }
];

const COLORS_OUTER = ['#00C853', '#8B5FE6']; // 🟢 Green, 🟣 Violet
const COLORS_INNER = ['#006400', '#4B0082']; // 🌲 Dark Green,  Dark Violet

  return (
    <div className="profile-fullscreen-overlay" onClick={onClose}>
      <div className="profile-fullscreen-content" onClick={e => e.stopPropagation()}>
        
        {/* Left Sidebar Navigation (Desktop only) */}
        <div className="profile-sidebar">
          <div className="profile-avatar-large clickable-avatar" onClick={() => setShowAvatarPicker(true)} title="Change avatar">
            <img src={equippedImg} alt="Avatar" className="avatar-img-large" />
          </div>
          
          <nav className="profile-nav">
            <button className={`nav-btn ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
              <span className="nav-icon">👤</span>
              <span className="nav-text">Profile</span>
            </button>
            <button className={`nav-btn ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
              <span className="nav-icon">📜</span>
              <span className="nav-text">History</span>
            </button>
            <button className={`nav-btn ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>
              <span className="nav-icon">📊</span>
              <span className="nav-text">Analytics</span>
            </button>
            <button className={`nav-btn ${activeTab === 'avatars' ? 'active' : ''}`} onClick={() => setActiveTab('avatars')}>
              <span className="nav-icon">🎭</span>
              <span className="nav-text">Avatars</span>
            </button>
          </nav>
          
          {/* Desktop-only back button inside sidebar */}
          <button className="close-profile-btn sidebar-back-btn" onClick={onClose}>
            ← Back to Map
          </button>
        </div>

        {/* Main Content Area */}
        <div className="profile-main-area">
          
          {/* 📱 Mobile Header — back button + title (no duplicate tabs) */}
          <div className="mobile-top-bar">
            <button className="mobile-close-btn" onClick={onClose}>← Back</button>
            <span className="mobile-title">My Profile</span>
          </div>

          {/* 📱 Mobile Tab Bar — only visible on mobile */}
          <div className="mobile-tab-bar">
            <button className={`mobile-tab-btn ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
              <span>👤</span><span>Profile</span>
            </button>
            <button className={`mobile-tab-btn ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
              <span>📜</span><span>History</span>
            </button>
            <button className={`mobile-tab-btn ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>
              <span>📊</span><span>Stats</span>
            </button>
            <button className={`mobile-tab-btn ${activeTab === 'avatars' ? 'active' : ''}`} onClick={() => setActiveTab('avatars')}>
              <span>🎭</span><span>Avatars</span>
            </button>
          </div>

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="tab-content profile-tab">
              
              {/* 1. Profile Header Card (Avatar - Name - Level) */}
              <div className="profile-header-card">
                <div className="header-avatar-container">
                   <div className="avatar-ring clickable-avatar" onClick={() => setShowAvatarPicker(true)} title="Change avatar">
                     <img src={equippedImg} alt="Avatar" className="header-avatar-img" />
                   </div>
                </div>
                <div className="header-info">
                  <h1 className="profile-welcome-text">{nickname || 'Player'}</h1>
                  <div className="level-badge-large">
                    🏆 Level {completedLevels + 1}
                  </div>
                </div>
              </div>

              {/* 2. Badge Display Card */}
              <div className="badge-display-card">
                <div className="badge-card-header">
                  <span>Current Badge</span>
                  {currentBadgeInfo.nextBadge && <span className="next-badge-label">Next: {currentBadgeInfo.nextBadge.name}</span>}
                </div>
                <div className="badge-content">
                  <div className="badge-image-wrapper">
                    {currentBadgeInfo.currentBadge ? (
                      <img src={currentBadgeInfo.currentBadge.image} alt={currentBadgeInfo.currentBadge.name} className="current-badge-img" onError={(e)=>{e.target.style.display='none'; e.target.nextElementSibling.style.display='block'}} />
                    ) : null}
                    <span className="badge-fallback-emoji" style={{display: 'none'}}>🥇</span>
                  </div>
                  <div className="badge-details">
                    <h3 className="badge-name">{currentBadgeInfo.currentBadge ? currentBadgeInfo.currentBadge.name : 'Beginner'}</h3>
                    <div className="badge-progress-bar-bg">
                      <div 
                        className="badge-progress-bar-fill" 
                        style={{width: `${Math.min((currentStars / starsForNextBadge) * 100, 100)}%`}}
                      ></div>
                    </div>
                    <span className="badge-progress-text">
                      {currentStars} / {starsForNextBadge} Stars
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. Stats Grid */}
              <div className="stats-grid-large">
                <div className="stat-card-large stars">
                  <div className="stat-icon-large">⭐</div>
                  <div className="stat-value-large">{currentStars}</div>
                  <div className="stat-label-large">Stars</div>
                </div>
                <div className="stat-card-large gold">
                  <div className="stat-icon-large">💰</div>
                  <div className="stat-value-large">{goldCount}</div>
                  <div className="stat-label-large">Gold</div>
                </div>
                <div className="stat-card-large streak">
                  <div className="stat-icon-large">🔥</div>
                  <div className="stat-value-large">{highestStreak}</div>
                  <div className="stat-label-large">Streak</div>
                </div>
                <div className="stat-card-large completed">
                  <div className="stat-icon-large">📚</div>
                  <div className="stat-value-large">{completedLevels}</div>
                  <div className="stat-label-large">Levels Done</div>
                </div>
              </div>

              {/* Daily Challenge (Optional, kept below stats) */}
              <div className="daily-challenge-card">
                <h3>📅 Daily Challenge</h3>
                <p className="stat-label-large">Play 3 more levels to earn a bonus star!</p>
                <div className="progress-bar-wrapper">
                  <div className="progress-fill" style={{width: '30%'}}></div>
                </div>
              </div>
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="tab-content history-tab">
              <h2 className="tab-title">📜 Battle History</h2>
              <div className="history-list-container">
                {gameHistory.length > 0 ? (
                  gameHistory.slice().reverse().map((record) => (
                    <div key={record.id} className="history-row">
                      <div className="history-icon">{record.mode === 'math' ? '🧮' : '📚'}</div>
                      <div className="history-details">
                        <span className="history-level-label">Level {record.level}</span>
                        <span className="history-score-label">{record.correctCount}/{record.totalQuestions} Correct</span>
                      </div>
                      <div className="history-rewards-pill">+{record.starsGained} ⭐</div>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">
                    <div className="empty-icon">🐝</div>
                    <p>No battles fought yet!</p>
                    <button className="play-cta-btn" onClick={onClose}>Start Playing</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Analytics Tab */}
            {activeTab === 'analytics' && (
         <div className="tab-content analytics-tab">
           <h2 className="tab-title">📊 Performance Analytics</h2>
           <div className="chart-wrapper analytics-chart-wrapper">
             <ResponsiveContainer width="100%" height={420}>
               <PieChart>
                 {/* 🌍 Outer Ring: Levels Completed */}
                 <Pie
                   data={levelPieData}
                   cx="50%"
                   cy="50%"
                   outerRadius="52%"
                   innerRadius="32%"
                   dataKey="value"
                   nameKey="name"
                 >
                   {levelPieData.map((entry, index) => (
                     <Cell key={`outer-${index}`} fill={COLORS_OUTER[index % COLORS_OUTER.length]} />
                   ))}
                 </Pie>
                 
                 {/* 🎯 Inner Ring: Accuracy Rate */}
                 <Pie
                   data={accPieData}
                   cx="50%"
                   cy="50%"
                   outerRadius="26%"
                   innerRadius="12%"
                   dataKey="value"
                   nameKey="name"
                 >
                   {accPieData.map((entry, index) => (
                     <Cell key={`inner-${index}`} fill={COLORS_INNER[index % COLORS_INNER.length]} />
                   ))}
                 </Pie>
                 
                 <Tooltip formatter={(value, name) => [hasData ? `${value}` : 'No data yet', name]} />
               </PieChart>
             </ResponsiveContainer>

             {/* Custom Legend */}
             <div className="analytics-legend">
               <div className="legend-section">
                 <div className="legend-section-label">🔵 Outer Ring — Levels Completed</div>
                 <div className="legend-items">
                   <div className="legend-item">
                     <span className="legend-dot" style={{ background: '#00C853' }}></span>
                     <span className="legend-text">Math Levels ({mathLevels})</span>
                   </div>
                   <div className="legend-item">
                     <span className="legend-dot" style={{ background: '#8B5FE6' }}></span>
                     <span className="legend-text">English Levels ({englishLevels})</span>
                   </div>
                 </div>
               </div>
               <div className="legend-section">
                 <div className="legend-section-label">🔴 Inner Ring — Correct Rate</div>
                 <div className="legend-items">
                   <div className="legend-item">
                     <span className="legend-dot" style={{ background: '#006400' }}></span>
                     <span className="legend-text">Math Accuracy ({mathAcc}%)</span>
                   </div>
                   <div className="legend-item">
                     <span className="legend-dot" style={{ background: '#4B0082' }}></span>
                     <span className="legend-text">English Accuracy ({englishAcc}%)</span>
                   </div>
                 </div>
               </div>
             </div>

             {!hasData && (
               <p style={{textAlign: 'center', color: 'rgba(36,48,79,0.55)', marginTop: '8px', fontSize: '13px'}}>
                 🎮 Play some levels to see your real stats!
               </p>
             )}
           </div>
         </div>
      )}

          {/* Avatars Tab */}
          {activeTab === 'avatars' && (
            <div className="tab-content avatars-tab">
              <h2 className="tab-title">🎭 My Avatars</h2>
              <p className="avatars-subtitle">Tap an owned avatar to equip it.</p>
              {ownedAvatars.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">🛒</div>
                  <p>You don't own any avatars yet.</p>
                </div>
              ) : (
                <div className="avatar-grid">
                  {ownedAvatars.map(id => (
                    <div
                      key={id}
                      className={`avatar-card ${id === equippedAvatar ? 'equipped' : ''}`}
                      onClick={() => onEquipAvatar(id)}
                    >
                      <img src={AVATARS[id]} alt={id} className="avatar-card-img" />
                      <div className="avatar-card-name">{id.charAt(0).toUpperCase() + id.slice(1)}</div>
                      <div className={`avatar-card-status ${id === equippedAvatar ? 'equipped-badge' : ''}`}>
                        {id === equippedAvatar ? '✓ Equipped' : 'Tap to equip'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <button className="visit-shop-btn" onClick={() => { onClose(); onOpenShop(); }}>
                🛒 Visit Shop for More
              </button>
            </div>
          )}

          {/* Avatar Picker Modal */}
          {showAvatarPicker && (
            <div className="avatar-picker-overlay" onClick={() => setShowAvatarPicker(false)}>
              <div className="avatar-picker-modal" onClick={e => e.stopPropagation()}>
                <div className="avatar-picker-header">
                  <h2>🎭 Choose Your Avatar</h2>
                  <button className="avatar-picker-close" onClick={() => setShowAvatarPicker(false)}>✕</button>
                </div>
                <p className="avatar-picker-sub">Select from avatars you own.</p>
                <div className="avatar-grid">
                  {ownedAvatars.map(id => (
                    <div
                      key={id}
                      className={`avatar-card ${id === equippedAvatar ? 'equipped' : ''}`}
                      onClick={() => { onEquipAvatar(id); setShowAvatarPicker(false); }}
                    >
                      <img src={AVATARS[id]} alt={id} className="avatar-card-img" />
                      <div className="avatar-card-name">{id.charAt(0).toUpperCase() + id.slice(1)}</div>
                      <div className={`avatar-card-status ${id === equippedAvatar ? 'equipped-badge' : ''}`}>
                        {id === equippedAvatar ? '✓ Equipped' : 'Tap to equip'}
                      </div>
                    </div>
                  ))}
                </div>
                <button className="visit-shop-btn" onClick={() => { setShowAvatarPicker(false); onClose(); onOpenShop(); }}>
                  🛒 Visit Shop for More
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default ProfilePage;