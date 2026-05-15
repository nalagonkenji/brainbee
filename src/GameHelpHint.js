import React, { useState, useCallback } from 'react';
import './GameHelpHint.css';

// ─────────────────────────────────────────────────────────────────────
// 📖 Instructions per game mode
// ─────────────────────────────────────────────────────────────────────
const INSTRUCTIONS = {
  math: {
    title: '🔢 How to Play Math!',
    gradient: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
    accent: '#FF6B6B',
    items: [
      { icon: '👀', text: 'Look at the equation — one number is hiding behind the blank!' },
      { icon: '🔢', text: 'The number bubbles at the bottom are your clues.' },
      { icon: '👆', text: 'Tap a number bubble, then tap the blank box to place it there.' },
      { icon: '🖱️', text: 'You can also drag a number and drop it into the blank!' },
      { icon: '↩️', text: 'Tap a filled box to take the number back and try again.' },
      { icon: '🎉', text: 'Fill in the correct number to earn gold coins and stars!' },
    ],
    closeText: "Let's Solve It! 🚀",
  },
  spelling: {
    title: '🐝 How to Play Spelling Bee!',
    gradient: 'linear-gradient(135deg, #4ECDC4 0%, #44CF6C 100%)',
    accent: '#4ECDC4',
    items: [
      { icon: '🔊', text: 'Tap the speaker button to hear the word out loud!' },
      { icon: '📦', text: 'The letter boxes at the top are where your answer goes.' },
      { icon: '🔤', text: 'Tap a letter bubble below, then tap an empty box to place it.' },
      { icon: '🖱️', text: 'You can also drag letters and drop them into the boxes!' },
      { icon: '↩️', text: 'Tap a filled box to remove that letter and try a different one.' },
      { icon: '✨', text: 'Spell the whole word correctly to earn gold and stars!' },
    ],
    closeText: "Let's Spell! 🐝",
  },
  grammar: {
    title: '📝 How to Play Grammar!',
    gradient: 'linear-gradient(135deg, #A29BFE 0%, #6C5CE7 100%)',
    accent: '#A29BFE',
    items: [
      { icon: '📖', text: 'Read the sentence carefully — there is a blank somewhere inside it!' },
      { icon: '🤔', text: 'Think about which word fits best in the blank.' },
      { icon: '👆', text: 'Tap one of the four answer buttons to fill the blank.' },
      { icon: '✅', text: 'The correct answer turns green — wrong answers turn red.' },
      { icon: '⚡', text: 'You only get one chance per question, so think before you tap!' },
      { icon: '🏆', text: 'Tap the right answer to earn gold coins and bonus stars!' },
    ],
    closeText: 'Got it! 📝',
  },
};

const HINT_COST = 30;

// ─────────────────────────────────────────────────────────────────────
// 🧩 GameHelpHint Component
// ─────────────────────────────────────────────────────────────────────
const GameHelpHint = ({
  activeGame,
  englishGameStyle,
  goldCount,
  onSpendGold,
  onHintMath,
  onHintSpelling,
  onHintGrammar,
  isAnswered,
}) => {
  const [showHelp, setShowHelp]         = useState(false);
  const [hintUsed, setHintUsed]         = useState(false);
  const [burstOn, setBurstOn]           = useState(false);
  const [shakeBroke, setShakeBroke]     = useState(false);
  const [noGoldMsg, setNoGoldMsg]       = useState(false);

  const instructionKey = (() => {
    if (activeGame === 'math') return 'math';
    if (englishGameStyle === 'grammar_checker') return 'grammar';
    return 'spelling';
  })();
  const info = INSTRUCTIONS[instructionKey];

  const handleHelpOpen  = useCallback(() => setShowHelp(true),  []);
  const handleHelpClose = useCallback(() => setShowHelp(false), []);

  const handleHint = useCallback(() => {
    if (isAnswered || hintUsed) return;

    if (goldCount < HINT_COST) {
      setShakeBroke(true);
      setNoGoldMsg(true);
      setTimeout(() => { setShakeBroke(false); setNoGoldMsg(false); }, 2800);
      return;
    }

    onSpendGold(HINT_COST);
    setHintUsed(true);
    setBurstOn(true);
    setTimeout(() => setBurstOn(false), 800);

    if (activeGame === 'math')                          onHintMath?.();
    else if (englishGameStyle === 'grammar_checker')    onHintGrammar?.();
    else                                                onHintSpelling?.();
  }, [isAnswered, hintUsed, goldCount, onSpendGold, activeGame, englishGameStyle,
      onHintMath, onHintSpelling, onHintGrammar]);

  const canAfford   = goldCount >= HINT_COST;
  const hintDisabled = isAnswered || hintUsed;

  return (
    <>
      {/* ── Floating button cluster ── */}
      <div className="ghh-cluster">

        {/* 💡 Hint Button */}
        <div className="ghh-hint-wrapper">
          <button
            className={[
              'ghh-btn ghh-hint-btn',
              !canAfford   ? 'ghh--broke'    : '',
              hintDisabled ? 'ghh--disabled' : '',
              shakeBroke   ? 'ghh--shake'    : '',
              burstOn      ? 'ghh--burst-flash' : '',
            ].filter(Boolean).join(' ')}
            onClick={handleHint}
            aria-label={`Use a hint — costs ${HINT_COST} gold`}
          >
            <span className="ghh-icon">💡</span>
            <span className="ghh-cost">-{HINT_COST}🪙</span>
          </button>

          {/* Not-enough-gold tooltip */}
          {noGoldMsg && (
            <div className="ghh-no-gold" role="alert">
              <span className="ghh-no-gold-icon">🪙</span>
              <span>Not enough gold!<br /><strong>Keep playing to earn more 🐝</strong></span>
            </div>
          )}

          {/* Gold burst particles */}
          {burstOn && (
            <div className="ghh-burst-wrap" aria-hidden="true">
              {['🪙','✨','⭐','💫','🌟'].map((e, i) => (
                <span key={i} className={`ghh-particle ghh-p${i}`}>{e}</span>
              ))}
            </div>
          )}
        </div>

        {/* ❓ Help Button */}
        <button
          className="ghh-btn ghh-help-btn"
          onClick={handleHelpOpen}
          aria-label="How to play"
        >
          <span className="ghh-icon">?</span>
        </button>
      </div>

      {/* ── Help Modal ── */}
      {showHelp && (
        <div
          className="ghh-backdrop"
          onClick={handleHelpClose}
          role="dialog"
          aria-modal="true"
          aria-label="Game instructions"
        >
          <div
            className="ghh-modal"
            onClick={e => e.stopPropagation()}
            style={{ '--ghh-accent': info.accent }}
          >
            {/* Decorative blobs */}
            <div className="ghh-blob ghh-blob-a" aria-hidden="true" />
            <div className="ghh-blob ghh-blob-b" aria-hidden="true" />

            {/* Header */}
            <div className="ghh-modal-header" style={{ background: info.gradient }}>
              <span className="ghh-header-bee" aria-hidden="true">🐝</span>
              <h2 className="ghh-modal-title">{info.title}</h2>
              <button className="ghh-modal-x" onClick={handleHelpClose} aria-label="Close">✕</button>
            </div>

            {/* Steps */}
            <ul className="ghh-steps" role="list">
              {info.items.map((item, i) => (
                <li key={i} className="ghh-step" style={{ animationDelay: `${i * 0.06}s` }}>
                  <span className="ghh-step-icon" aria-hidden="true">{item.icon}</span>
                  <span className="ghh-step-text">{item.text}</span>
                </li>
              ))}
            </ul>

            {/* Hint tip */}
            <div className="ghh-hint-tip">
              <span className="ghh-hint-tip-icon">💡</span>
              <p>Stuck? Use the <strong>Hint button</strong> to reveal the answer!
                It costs <strong>{HINT_COST} 🪙 gold</strong> — spend wisely!</p>
            </div>

            {/* CTA */}
            <button
              className="ghh-cta"
              onClick={handleHelpClose}
              style={{ background: info.gradient }}
            >
              {info.closeText}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default GameHelpHint;
