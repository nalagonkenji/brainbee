import React, { useState, useRef, useEffect } from 'react';
import { apiLogin, apiRegister, apiGetUsers, apiDeleteUser, apiGetPlayer, apiSavePlayer, apiSaveHistory, apiGetLeaderboard, apiGetQuestions, apiSaveQuestion, apiEditQuestion, apiDeleteQuestion, apiGenerateQuestions } from './api';
import './App.css';
import AppFooter, { AuthFooter } from './AppFooter';
import ProfilePage from './ProfilePage';
import Shop, { getAvatarById } from './Shop';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Leaderboard, { recordLeaderboardEntry, getLeaderboardEntries, LB_KEY_ADVENTURE, LB_KEY_PRACTICE } from './Leaderboard';
import GameHelpHint from './GameHelpHint';


// 🌍 Translation System
const translations = {
  en: {
    greeting: 'Hello, Adventurer!',
    subGreeting: 'Ready for an educational adventure?',
    enterName: 'Enter your name:',
    okay: 'Okay!',
    home: 'Home',
    chooseSubject: 'Choose Your Subject',
    math: 'Math',
    english: 'English',
    letsGo: "Let's Go!",
    mathMode: 'Math Mode',
    englishMode: 'English Mode',
    selectMode: 'Select Mode',
    startGame: 'Start Game',
    settings: 'Settings',
    language: 'Language',
    music: 'Music',
    selectLanguage: 'Select Language:',
    englishLang: 'English',
    tagalog: 'Tagalog',
    changeLanguage: 'Change Language?',
    yes: 'Yes',
    no: 'No',
    confirm: 'Confirm',
    back: 'Back',
    level: 'Level',
    correctCount: 'Correct',
    totalQuestions: 'Questions',
    question: 'Question',
    dragTap: 'Drag or tap letters to spell the word!',
    tapListen: 'Tap to listen!',
    spellingBee: 'Spelling Bee',
  },
  tl: {
    greeting: 'Kamusta, Adventurer!',
    subGreeting: 'Handa na ba para sa isang educational adventure?',
    enterName: 'Ipasok ang iyong pangalan:',
    okay: 'Okay!',
    home: 'Tahanan',
    chooseSubject: 'Pumili ng Paksa',
    math: 'Matematika',
    english: 'Ingles',
    letsGo: 'Tara Na!',
    mathMode: 'Math Mode',
    englishMode: 'English Mode',
    selectMode: 'Pumili ng Mode',
    startGame: 'Magsimula ng Laro',
    settings: 'Mga Setting',
    language: 'Wika',
    music: 'Musika',
    selectLanguage: 'Pumili ng Wika:',
    englishLang: 'Ingles',
    tagalog: 'Tagalog',
    changeLanguage: 'Magbago ng Wika?',
    yes: 'Oo',
    no: 'Hindi',
    confirm: 'Kumpirmahin',
    back: 'Bumalik',
    level: 'Antas',
    correctCount: 'Tama',
    totalQuestions: 'Katanungan',
    question: 'Katanungan',
    dragTap: 'I-drag o pindutin ang mga titik upang i-spell ang salita!',
    tapListen: 'Pindutin upang makinig!',
    spellingBee: 'Spelling Bee',
  }
};

const badgeSystem = {
math: [
{ name: 'Beginner', image: '/badges/beginner.png', starsRequired: 0 },
{ name: 'Novice', image: '/badges/novice.png', starsRequired: 10 },
{ name: 'Adept', image: '/badges/adept.png', starsRequired: 15 },
{ name: 'Expert', image: '/badges/expert.png', starsRequired: 20 },
{ name: 'Master Bee', image: '/badges/masterbee.png', starsRequired: 25 },
],
english: [
{ name: 'Beginner', image: '/badges/beginner.png', starsRequired: 0 },
{ name: 'Novice', image: '/badges/novice.png', starsRequired: 10 },
{ name: 'Adept', image: '/badges/adept.png', starsRequired: 15 },
{ name: 'Expert', image: '/badges/expert.png', starsRequired: 20 },
{ name: 'Master Bee', image: '/badges/masterbee.png', starsRequired: 25 },
]
};

// Helper function to get current badge and progress
const getBadgeInfo = (stars, mode) => {
  const badges = badgeSystem[mode] || badgeSystem.math;
  for (let i = badges.length - 1; i >= 0; i--) {
    if (stars >= badges[i].starsRequired) {
      return {
        currentBadgeIndex: i,
        currentBadge: badges[i],
        nextBadge: i < badges.length - 1 ? badges[i + 1] : null,
        starsForCurrentBadge: stars,
        starsNeeded: i < badges.length - 1 ? badges[i + 1].starsRequired : badges[i].starsRequired,
      };
    }
  }
  return {
    currentBadgeIndex: -1,
    currentBadge: null,
    nextBadge: badges[0],
    starsForCurrentBadge: 0,
    starsNeeded: badges[0].starsRequired,
  };
};

// Initialize Capacitor if running in mobile app
const isNativePlatform = () => {
  return window.Capacitor?.isNativePlatform?.() || false;
};

// Handle device initialization for Capacitor apps
if (typeof document !== 'undefined') {
  let lastTouchEnd = 0;
  document.addEventListener('touchend', function(event) {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      event.preventDefault();
    }
    lastTouchEnd = now;
  }, false);

  document.addEventListener('touchstart', (e) => {
  }, { passive: true });
}

// 🎵 Web Audio API Sound Generator
const playSound = (type) => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (type === 'correct' || type === 'celebration') {
      const freqs = type === 'celebration' ? [523.25, 659.25, 783.99, 1046.5, 1318.5] : [523.25, 659.25, 783.99];
      freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'triangle'; osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.12);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.12 + 0.5);
    osc.start(ctx.currentTime + i * 0.12);
    osc.stop(ctx.currentTime + i * 0.12 + 0.5);
  });
    } else if (type === 'wrong') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(150, ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.3);
    } else if (type === 'click') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine'; osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'unlock') {
      [440, 554.37, 659.25, 880].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine'; osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.15 + 0.4);
        osc.start(ctx.currentTime + i * 0.15);
        osc.stop(ctx.currentTime + i * 0.15 + 0.4);
      });
    } else if (type === 'jump') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.3);
    } else if (type && type.startsWith('letter_')) {
      const letter = type.split('_')[1].toUpperCase();
      const letterFreqs = {
        'A': 440, 'B': 494, 'C': 523, 'D': 587, 'E': 659, 'F': 698, 'G': 784,
        'H': 880, 'I': 988, 'J': 1047, 'K': 1175, 'L': 1319, 'M': 1479, 'N': 1661,
        'O': 1865, 'P': 2093, 'Q': 2349, 'R': 2637, 'S': 2960, 'T': 3322, 'U': 3729,
        'V': 4186, 'W': 4699, 'X': 5274, 'Y': 5920, 'Z': 6645
      };
      const freq = letterFreqs[letter] || 440;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine'; osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.25);
    }
  } catch (e) { console.warn('Audio not supported'); }
};

// 🗣️ PURE WEB TTS (Uses standard browser Speech Synthesis API)
const speakWord = async (word, language = 'en') => {
  if (!word || !('speechSynthesis' in window)) return;
  const langCode = language === 'tl' ? 'fil-PH' : 'en-US';
  
  try {
    window.speechSynthesis.cancel();
    if (window.speechSynthesis.paused) window.speechSynthesis.resume();

    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = langCode;
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    utterance.volume = 1.0;

    const ensureVoices = () => new Promise((resolve) => {
      if (window.speechSynthesis.getVoices().length > 0) resolve();
      else {
        window.speechSynthesis.onvoiceschanged = () => {
          window.speechSynthesis.onvoiceschanged = null;
          resolve();
        };
        setTimeout(resolve, 500);
      }
    });

    await ensureVoices();
    const voices = window.speechSynthesis.getVoices();
    const targetVoice = language === 'tl'
      ? voices.find(v => v.lang?.startsWith('fil') || v.lang?.startsWith('tl'))
      : voices.find(v => v.lang?.startsWith('en-US') || v.lang?.startsWith('en'));
    
    if (targetVoice) utterance.voice = targetVoice;
    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.warn("🔇 TTS skipped:", e.message);
  }
};

// 🎯 Math Question Bank (50 Levels)
const levelQuestions = {
  1: [
    { left: 3, right: 20, answer: '17' },
    { left: 5, right: 15, answer: '10' },
    { left: 2, right: 12, answer: '10' },
    { left: 7, right: 25, answer: '18' },
    { left: 4, right: 14, answer: '10' },
  ],
  2: [
    { left: 8, right: 30, answer: '22' },
    { left: 6, right: 24, answer: '18' },
    { left: 9, right: 35, answer: '26' },
    { left: 5, right: 20, answer: '15' },
    { left: 7, right: 28, answer: '21' },
  ],
  3: [
    { left: 12, right: 45, answer: '33' },
    { left: 10, right: 40, answer: '30' },
    { left: 15, right: 50, answer: '35' },
    { left: 8, right: 32, answer: '24' },
    { left: 11, right: 42, answer: '31' },
  ],
  4: [
    { left: 18, right: 65, answer: '47' },
    { left: 15, right: 55, answer: '40' },
    { left: 20, right: 70, answer: '50' },
    { left: 12, right: 48, answer: '36' },
    { left: 16, right: 60, answer: '44' },
  ],
  5: [
    { left: 25, right: 88, answer: '63' },
    { left: 22, right: 75, answer: '53' },
    { left: 30, right: 95, answer: '65' },
    { left: 18, right: 66, answer: '48' },
    { left: 28, right: 85, answer: '57' },
  ],
  6: [
    { left: 35, right: 112, answer: '77' },
    { left: 40, right: 125, answer: '85' },
    { left: 28, right: 99, answer: '71' },
    { left: 45, right: 130, answer: '85' },
    { left: 32, right: 105, answer: '73' },
  ],
  7: [
    { left: 42, right: 145, answer: '103' },
    { left: 38, right: 138, answer: '100' },
    { left: 50, right: 160, answer: '110' },
    { left: 35, right: 130, answer: '95' },
    { left: 45, right: 155, answer: '110' },
  ],
  8: [
    { left: 55, right: 175, answer: '120' },
    { left: 48, right: 160, answer: '112' },
    { left: 60, right: 185, answer: '125' },
    { left: 52, right: 170, answer: '118' },
    { left: 58, right: 182, answer: '124' },
  ],
  9: [
    { left: 65, right: 205, answer: '140' },
    { left: 70, right: 215, answer: '145' },
    { left: 58, right: 192, answer: '134' },
    { left: 75, right: 225, answer: '150' },
    { left: 62, right: 198, answer: '136' },
  ],
  10: [
    { left: 85, right: 250, answer: '165' },
    { left: 90, right: 270, answer: '180' },
    { left: 78, right: 235, answer: '157' },
    { left: 95, right: 285, answer: '190' },
    { left: 88, right: 260, answer: '172' },
  ],
  11: [
    { left: 105, right: 310, answer: '205' },
    { left: 110, right: 325, answer: '215' },
    { left: 98, right: 295, answer: '197' },
    { left: 115, right: 340, answer: '225' },
    { left: 108, right: 320, answer: '212' },
  ],
  12: [
    { left: 125, right: 375, answer: '250' },
    { left: 130, right: 390, answer: '260' },
    { left: 118, right: 355, answer: '237' },
    { left: 135, right: 405, answer: '270' },
    { left: 128, right: 385, answer: '257' },
  ],
  13: [
    { left: 145, right: 440, answer: '295' },
    { left: 150, right: 455, answer: '305' },
    { left: 138, right: 420, answer: '282' },
    { left: 155, right: 470, answer: '315' },
    { left: 148, right: 450, answer: '302' },
  ],
  14: [
    { left: 165, right: 505, answer: '340' },
    { left: 170, right: 520, answer: '350' },
    { left: 158, right: 485, answer: '327' },
    { left: 175, right: 535, answer: '360' },
    { left: 168, right: 515, answer: '347' },
  ],
  15: [
    { left: 185, right: 570, answer: '385' },
    { left: 190, right: 585, answer: '395' },
    { left: 178, right: 550, answer: '372' },
    { left: 195, right: 600, answer: '405' },
    { left: 188, right: 580, answer: '392' },
  ],
  16: [
    { left: 205, right: 635, answer: '430' },
    { left: 210, right: 650, answer: '440' },
    { left: 198, right: 615, answer: '417' },
    { left: 215, right: 665, answer: '450' },
    { left: 208, right: 645, answer: '437' },
  ],
  17: [
    { left: 225, right: 700, answer: '475' },
    { left: 230, right: 715, answer: '485' },
    { left: 218, right: 680, answer: '462' },
    { left: 235, right: 730, answer: '495' },
    { left: 228, right: 710, answer: '482' },
  ],
  18: [
    { left: 245, right: 765, answer: '520' },
    { left: 250, right: 780, answer: '530' },
    { left: 238, right: 745, answer: '507' },
    { left: 255, right: 795, answer: '540' },
    { left: 248, right: 775, answer: '527' },
  ],
  19: [
    { left: 265, right: 830, answer: '565' },
    { left: 270, right: 845, answer: '575' },
    { left: 258, right: 810, answer: '552' },
    { left: 275, right: 860, answer: '585' },
    { left: 268, right: 840, answer: '572' },
  ],
  20: [
    { left: 285, right: 895, answer: '610' },
    { left: 290, right: 910, answer: '620' },
    { left: 278, right: 875, answer: '597' },
    { left: 295, right: 925, answer: '630' },
    { left: 288, right: 905, answer: '617' },
  ],
  21: [
    { left: 305, right: 960, answer: '655' },
    { left: 310, right: 975, answer: '665' },
    { left: 298, right: 940, answer: '642' },
    { left: 315, right: 990, answer: '675' },
    { left: 308, right: 970, answer: '662' },
  ],
  22: [
    { left: 325, right: 1025, answer: '700' },
    { left: 330, right: 1040, answer: '710' },
    { left: 318, right: 1005, answer: '687' },
    { left: 335, right: 1055, answer: '720' },
    { left: 328, right: 1035, answer: '707' },
  ],
  23: [
    { left: 345, right: 1090, answer: '745' },
    { left: 350, right: 1105, answer: '755' },
    { left: 338, right: 1070, answer: '732' },
    { left: 355, right: 1120, answer: '765' },
    { left: 348, right: 1100, answer: '752' },
  ],
  24: [
    { left: 365, right: 1155, answer: '790' },
    { left: 370, right: 1170, answer: '800' },
    { left: 358, right: 1135, answer: '777' },
    { left: 375, right: 1185, answer: '810' },
    { left: 368, right: 1165, answer: '797' },
  ],
  25: [
    { left: 385, right: 1220, answer: '835' },
    { left: 390, right: 1235, answer: '845' },
    { left: 378, right: 1200, answer: '822' },
    { left: 395, right: 1250, answer: '855' },
    { left: 388, right: 1230, answer: '842' },
  ],
  26: [
    { left: 405, right: 1285, answer: '880' },
    { left: 410, right: 1300, answer: '890' },
    { left: 398, right: 1265, answer: '867' },
    { left: 415, right: 1315, answer: '900' },
    { left: 408, right: 1295, answer: '887' },
  ],
  27: [
    { left: 425, right: 1350, answer: '925' },
    { left: 430, right: 1365, answer: '935' },
    { left: 418, right: 1330, answer: '912' },
    { left: 435, right: 1380, answer: '945' },
    { left: 428, right: 1360, answer: '932' },
  ],
  28: [
    { left: 445, right: 1415, answer: '970' },
    { left: 450, right: 1430, answer: '980' },
    { left: 438, right: 1395, answer: '957' },
    { left: 455, right: 1445, answer: '990' },
    { left: 448, right: 1425, answer: '977' },
  ],
  29: [
    { left: 465, right: 1480, answer: '1015' },
    { left: 470, right: 1495, answer: '1025' },
    { left: 458, right: 1460, answer: '1002' },
    { left: 475, right: 1510, answer: '1035' },
    { left: 468, right: 1490, answer: '1022' },
  ],
  30: [
    { left: 485, right: 1545, answer: '1060' },
    { left: 490, right: 1560, answer: '1070' },
    { left: 478, right: 1525, answer: '1047' },
    { left: 495, right: 1575, answer: '1080' },
    { left: 488, right: 1555, answer: '1067' },
  ],
  31: [
    { left: 505, right: 1610, answer: '1105' },
    { left: 510, right: 1625, answer: '1115' },
    { left: 498, right: 1590, answer: '1092' },
    { left: 515, right: 1640, answer: '1125' },
    { left: 508, right: 1620, answer: '1112' },
  ],
  32: [
    { left: 525, right: 1675, answer: '1150' },
    { left: 530, right: 1690, answer: '1160' },
    { left: 518, right: 1655, answer: '1137' },
    { left: 535, right: 1705, answer: '1170' },
    { left: 528, right: 1685, answer: '1157' },
  ],
  33: [
    { left: 545, right: 1740, answer: '1195' },
    { left: 550, right: 1755, answer: '1205' },
    { left: 538, right: 1720, answer: '1182' },
    { left: 555, right: 1770, answer: '1215' },
    { left: 548, right: 1750, answer: '1202' },
  ],
  34: [
    { left: 565, right: 1805, answer: '1240' },
    { left: 570, right: 1820, answer: '1250' },
    { left: 558, right: 1785, answer: '1227' },
    { left: 575, right: 1835, answer: '1260' },
    { left: 568, right: 1815, answer: '1247' },
  ],
  35: [
    { left: 585, right: 1870, answer: '1285' },
    { left: 590, right: 1885, answer: '1295' },
    { left: 578, right: 1850, answer: '1272' },
    { left: 595, right: 1900, answer: '1305' },
    { left: 588, right: 1880, answer: '1292' },
  ],
  36: [
    { left: 605, right: 1935, answer: '1330' },
    { left: 610, right: 1950, answer: '1340' },
    { left: 598, right: 1915, answer: '1317' },
    { left: 615, right: 1965, answer: '1350' },
    { left: 608, right: 1945, answer: '1337' },
  ],
  37: [
    { left: 625, right: 2000, answer: '1375' },
    { left: 630, right: 2015, answer: '1385' },
    { left: 618, right: 1980, answer: '1362' },
    { left: 635, right: 2030, answer: '1395' },
    { left: 628, right: 2010, answer: '1382' },
  ],
  38: [
    { left: 645, right: 2065, answer: '1420' },
    { left: 650, right: 2080, answer: '1430' },
    { left: 638, right: 2045, answer: '1407' },
    { left: 655, right: 2095, answer: '1440' },
    { left: 648, right: 2075, answer: '1427' },
  ],
  39: [
    { left: 665, right: 2130, answer: '1465' },
    { left: 670, right: 2145, answer: '1475' },
    { left: 658, right: 2110, answer: '1452' },
    { left: 675, right: 2160, answer: '1485' },
    { left: 668, right: 2140, answer: '1472' },
  ],
  40: [
    { left: 685, right: 2195, answer: '1510' },
    { left: 690, right: 2210, answer: '1520' },
    { left: 678, right: 2175, answer: '1497' },
    { left: 695, right: 2225, answer: '1530' },
    { left: 688, right: 2205, answer: '1517' },
  ],
  41: [
    { left: 705, right: 2260, answer: '1555' },
    { left: 710, right: 2275, answer: '1565' },
    { left: 698, right: 2240, answer: '1542' },
    { left: 715, right: 2290, answer: '1575' },
    { left: 708, right: 2270, answer: '1562' },
  ],
  42: [
    { left: 725, right: 2325, answer: '1600' },
    { left: 730, right: 2340, answer: '1610' },
    { left: 718, right: 2305, answer: '1587' },
    { left: 735, right: 2355, answer: '1620' },
    { left: 728, right: 2335, answer: '1607' },
  ],
  43: [
    { left: 745, right: 2390, answer: '1645' },
    { left: 750, right: 2405, answer: '1655' },
    { left: 738, right: 2370, answer: '1632' },
    { left: 755, right: 2420, answer: '1665' },
    { left: 748, right: 2400, answer: '1652' },
  ],
  44: [
    { left: 765, right: 2455, answer: '1690' },
    { left: 770, right: 2470, answer: '1700' },
    { left: 758, right: 2435, answer: '1677' },
    { left: 775, right: 2485, answer: '1710' },
    { left: 768, right: 2465, answer: '1697' },
  ],
  45: [
    { left: 785, right: 2520, answer: '1735' },
    { left: 790, right: 2535, answer: '1745' },
    { left: 778, right: 2500, answer: '1722' },
    { left: 795, right: 2550, answer: '1755' },
    { left: 788, right: 2530, answer: '1742' },
  ],
  46: [
    { left: 805, right: 2585, answer: '1780' },
    { left: 810, right: 2600, answer: '1790' },
    { left: 798, right: 2565, answer: '1767' },
    { left: 815, right: 2615, answer: '1800' },
    { left: 808, right: 2595, answer: '1787' },
  ],
  47: [
    { left: 825, right: 2650, answer: '1825' },
    { left: 830, right: 2665, answer: '1835' },
    { left: 818, right: 2630, answer: '1812' },
    { left: 835, right: 2680, answer: '1845' },
    { left: 828, right: 2660, answer: '1832' },
  ],
  48: [
    { left: 845, right: 2715, answer: '1870' },
    { left: 850, right: 2730, answer: '1880' },
    { left: 838, right: 2695, answer: '1857' },
    { left: 855, right: 2745, answer: '1890' },
    { left: 848, right: 2725, answer: '1877' },
  ],
  49: [
    { left: 865, right: 2780, answer: '1915' },
    { left: 870, right: 2795, answer: '1925' },
    { left: 858, right: 2760, answer: '1902' },
    { left: 875, right: 2810, answer: '1935' },
    { left: 868, right: 2790, answer: '1922' },
  ],
  50: [
    { left: 885, right: 2845, answer: '1960' },
    { left: 890, right: 2860, answer: '1970' },
    { left: 878, right: 2825, answer: '1947' },
    { left: 895, right: 2875, answer: '1980' },
    { left: 888, right: 2855, answer: '1967' },
  ],
};

// 📚 English Word Bank (50 Levels)
const englishWords = {
  1: ['cat', 'dog', 'sun', 'hat', 'red', 'big', 'run', 'pen'],
  2: ['fish', 'tree', 'bird', 'cake', 'blue', 'jump', 'star', 'milk'],
  3: ['apple', 'happy', 'water', 'green', 'train', 'book', 'smile', 'cloud'],
  4: ['orange', 'purple', 'school', 'friend', 'family', 'garden', 'summer', 'planet'],
  5: ['birthday', 'elephant', 'butterfly', 'rainbow', 'teacher', 'dinosaur', 'adventure', 'chocolate'],
  6: ['universe', 'mountain', 'beautiful', 'wonderful', 'knowledge', 'celebrate', 'imagine', 'treasure'],
  7: ['adventure', 'symphony', 'lighthouse', 'magnificent', 'serendipity', 'eloquent', 'phenomenal', 'whisper'],
  8: ['library', 'history', 'medicine', 'technology', 'butterfly', 'geometry', 'atmosphere', 'architecture'],
  9: ['independence', 'celebration', 'neighborhood', 'communication', 'environment', 'responsibility', 'vocabulary', 'government'],
  10: ['contemporary', 'civilization', 'photography', 'laboratory', 'encyclopedia', 'psychologist', 'encyclopedia', 'bibliography'],
  11: ['mathematics', 'electricity', 'encyclopedia', 'catastrophe', 'archaeology', 'philosophy', 'bibliography', 'adolescent'],
  12: ['extraordinary', 'pharmaceutical', 'kaleidoscope', 'atmosphere', 'encyclopedia', 'pterodactyl', 'serendipitous', 'quincessential'],
  13: ['accidental', 'archaeology', 'calligraphy', 'delicate', 'eloquence', 'flourish', 'graceful', 'hierarchy'],
  14: ['immigrant', 'jeopardize', 'knowledge', 'labyrinth', 'majesty', 'necessary', 'obedience', 'parallel'],
  15: ['questionnaire', 'responsible', 'satisfaction', 'talented', 'ultimate', 'vengeance', 'witness', 'xerophone'],
  16: ['yacht', 'zealous', 'abbreviate', 'boutique', 'certainly', 'delicious', 'eloquent', 'favorable'],
  17: ['gaseous', 'hierarchy', 'ingenious', 'juncture', 'kinesiology', 'landscape', 'manuscript', 'necessary'],
  18: ['obsequious', 'perseverance', 'quadrant', 'restaurant', 'sanctuary', 'tolerance', 'unanimous', 'vulnerable'],
  19: ['warehouse', 'xenophobia', 'youthful', 'zealously', 'acceleration', 'beneficial', 'conscientious', 'dexterity'],
  20: ['efficiency', 'figurative', 'gorgeous', 'hypothesis', 'idealistic', 'jurisdiction', 'knowledge', 'luminous'],
  21: ['magnificent', 'nutritious', 'observation', 'philosophy', 'quotation', 'revolutionary', 'sympathetic', 'tremendous'],
  22: ['ultimate', 'vulnerable', 'withdrawal', 'xenophobic', 'yearning', 'zealousness', 'abandonment', 'bureaucracy'],
  23: ['calculated', 'demonstrated', 'equivalent', 'feasibility', 'gregarious', 'harmonious', 'illustrate', 'jurisdiction'],
  24: ['kindergarten', 'liabilities', 'manufacture', 'notoriously', 'obscure', 'particularly', 'quintessential', 'remarkable'],
  25: ['subsequently', 'troublesome', 'ultimate', 'villainous', 'whimsical', 'xenophobic', 'youthfulness', 'zealotry'],
  26: ['abbreviation', 'bureaucratic', 'camouflage', 'delinquent', 'emphasize', 'fahrenheit', 'genealogy', 'household'],
  27: ['iridescent', 'jeopardized', 'knowledge', 'literally', 'mayonnaise', 'nuisance', 'obstacle', 'parliament'],
  28: ['questionnaire', 'recognize', 'subpoena', 'tertiary', 'unequivocal', 'vacillate', 'wednesday', 'xenophobe'],
  29: ['yielding', 'zigzagging', 'abolitionist', 'bureaucrats', 'collateral', 'democracy', 'envelope', 'fluorescent'],
  30: ['gastronomic', 'hereditary', 'indigenous', 'jurisdiction', 'kaleidoscopic', 'lieutenant', 'magnificent', 'nostalgic'],
  31: ['obliterate', 'parliamentary', 'questionnaire', 'resplendent', 'sequestration', 'tremendous', 'ubiquitous', 'vindication'],
  32: ['whimsically', 'xerophytes', 'youngster', 'zealousness', 'aberration', 'bibliophile', 'categorical', 'delectable'],
  33: ['effervescent', 'flamboyant', 'gregariousness', 'historical', 'incandescent', 'jubilation', 'kaleidoscope', 'labyrinthine'],
  34: ['magnificent', 'nomenclature', 'obfuscate', 'perplexing', 'quintessentially', 'requisition', 'subliminal', 'terrestrial'],
  35: ['unanimously', 'vitrification', 'wraithlike', 'xenophobic', 'yearning', 'zealotry', 'abandoned', 'bureaucratic'],
  36: ['calculated', 'determinant', 'eminently', 'fascinating', 'gregarious', 'hypothetical', 'illustrious', 'juxtaposition'],
  37: ['kaleidoscopic', 'labyrinthine', 'magnificent', 'nomenclature', 'obsequious', 'perpendicular', 'quintessential', 'resplendent'],
  38: ['substantiate', 'terrarium', 'unequivocal', 'veneration', 'wanderlust', 'xenial', 'youthfulness', 'zealousness'],
  39: ['abbreviation', 'bothersome', 'categorical', 'deleterious', 'effulgent', 'florescence', 'gregariousness', 'heredity'],
  40: ['incinerator', 'justification', 'knowledge', 'luminescence', 'magnificent', 'nomenclature', 'obfuscation', 'persecution'],
  41: ['questionnaire', 'requisition', 'sublimation', 'treacherous', 'ubiquitous', 'veneration', 'withdrawal', 'xenophobic'],
  42: ['yellowish', 'zealously', 'abbreviation', 'beneficiary', 'clarification', 'delightful', 'exhilaration', 'fortification'],
  43: ['genuflect', 'humanitarian', 'illumination', 'jeopardized', 'kaleidoscope', 'lamentation', 'mystification', 'notification'],
  44: ['obliterate', 'perspicacious', 'qualifications', 'ramification', 'supplementary', 'terminology', 'unification', 'validation'],
  45: ['windowpane', 'xenophobic', 'yearbook', 'zealousness', 'accentuation', 'bifurcation', 'clarification', 'defenestration'],
  46: ['effervescence', 'fortification', 'glorious', 'hypothetical', 'indefinite', 'justification', 'kaleidoscopic', 'labyrinthian'],
  47: ['magnificence', 'nomenclature', 'obliteration', 'perspicacity', 'quantification', 'rectification', 'substantiation', 'testification'],
  48: ['unequivocally', 'verification', 'weathering', 'xerophytic', 'yearning', 'zestfulness', 'abbreviation', 'biographical'],
  49: ['circumference', 'determination', 'elaboration', 'felicitation', 'gratification', 'horticultural', 'illumination', 'justification'],
  50: ['kaleidoscopically', 'lamentation', 'magnification', 'notification', 'obfuscation', 'perspiration', 'qualifications', 'ramifications']
};

// 🎲 Generate Letter Pool (correct letters + random distractors)
const generateLetterPool = (word, length = 7) => {
  const correctLetters = word.split('');
  const distractors = [];
  const alphabet = 'abcdefghijklmnopqrstuvwxyz';
  while (distractors.length < length - correctLetters.length) {
    const letter = alphabet[Math.floor(Math.random() * 26)];
    if (!correctLetters.includes(letter) && !distractors.includes(letter)) {
      distractors.push(letter);
    }
  }
  const pool = [...correctLetters, ...distractors];
  return pool.sort(() => Math.random() - 0.5);
};

// 📍 Level positions for 2-column grid layout (50 Levels)
// Using CSS Grid now - no longer need absolute positioning
const levelPositions = {
  1: {}, 2: {}, 3: {}, 4: {}, 5: {}, 6: {}, 7: {}, 8: {}, 9: {}, 10: {},
  11: {}, 12: {}, 13: {}, 14: {}, 15: {}, 16: {}, 17: {}, 18: {}, 19: {}, 20: {},
  21: {}, 22: {}, 23: {}, 24: {}, 25: {}, 26: {}, 27: {}, 28: {}, 29: {}, 30: {},
  31: {}, 32: {}, 33: {}, 34: {}, 35: {}, 36: {}, 37: {}, 38: {}, 39: {}, 40: {},
  41: {}, 42: {}, 43: {}, 44: {}, 45: {}, 46: {}, 47: {}, 48: {}, 49: {}, 50: {},
};

function App() {
  // 🔑 Read the active game mode from localStorage BEFORE any useState so that
  //    the very first render already loads the correct mode's data.
  const _initialMode = (() => {
    try { return localStorage.getItem('brainbee_gameMode') || 'adventure'; } catch { return 'adventure'; }
  })();

  const [currentScreen, setCurrentScreen] = useState('greeting');
  const [showIntro, setShowIntro] = useState(true);
  const [nickname, setNickname] = useState('');
  const [nicknameError, setNicknameError] = useState('');
  const [isInputMode, setIsInputMode] = useState(false);
  const inputRef = useRef(null);
  const [showAdminLeaderboard, setShowAdminLeaderboard] = useState(false);
  // Greeting Transition States
  const [isHomepageBlurred, setIsHomepageBlurred] = useState(false);
  const [showGreetingOverlay, setShowGreetingOverlay] = useState(false);
  const [isBeeCheerful, setIsBeeCheerful] = useState(false);
  const [showGreetingMessage, setShowGreetingMessage] = useState(false);
  const [showOkayBtn, setShowOkayBtn] = useState(false);

  // Game States
  const [selectedMode, setSelectedMode] = useState('math');
  const [pendingSelectedMode, setPendingSelectedMode] = useState('math');
  const [showModeModal, setShowModeModal] = useState(false);
  const [activeGame, setActiveGame] = useState(null);
  // ✅ BUG FIX: Track currentLevel and completedLevels SEPARATELY per subject
  // so Math progress never bleeds into English and vice versa
  const [mathCurrentLevel, setMathCurrentLevel] = useState(() => {
    try { return parseInt(localStorage.getItem(`brainbee_${_initialMode}_mathCurrentLevel`) || '1'); } catch { return 1; }
  });
  const [englishCurrentLevel, setEnglishCurrentLevel] = useState(() => {
    try { return parseInt(localStorage.getItem(`brainbee_${_initialMode}_englishCurrentLevel`) || '1'); } catch { return 1; }
  });
  const [mathCompletedLevels, setMathCompletedLevels] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(`brainbee_${_initialMode}_mathCompletedLevels`) || '[]')); } catch { return new Set(); }
  });
  const [englishCompletedLevels, setEnglishCompletedLevels] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(`brainbee_${_initialMode}_englishCompletedLevels`) || '[]')); } catch { return new Set(); }
  });
  // Convenience derived values — always refer to the active subject
  const currentLevel = selectedMode === 'math' ? mathCurrentLevel : englishCurrentLevel;
  const setCurrentLevel = selectedMode === 'math' ? setMathCurrentLevel : setEnglishCurrentLevel;
  const completedLevels = selectedMode === 'math' ? mathCompletedLevels : englishCompletedLevels;
  const setCompletedLevels = selectedMode === 'math' ? setMathCompletedLevels : setEnglishCompletedLevels;
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  

  // Transition State
  const [isTransitioning, setIsTransitioning] = useState(false);

  const [mathState, setMathState] = useState({
  question: null,
  displayLeft: null,
  displayRight: null,
  displayAnswer: null,
  hiddenValue: '',
  blanks: [],
  placedIndices: [],
  pool: [],
  isAnswered: false,
  correctCount: 0,
  totalQuestions: 5,
  usedIndices: [],
  hiddenPart: 'answer', // 'left', 'right', or 'answer'
});

const [englishState, setEnglishState] = useState({
  word: null,
  blanks: [],
  placedIndices: [], // 🔹 NEW
  pool: [],
  isAnswered: false,
  correctCount: 0,
  totalQuestions: 5,
  usedIndices: [],
});

  const [selectedPoolNum, setSelectedPoolNum] = useState(null);
  const [selectedLetter, setSelectedLetter] = useState(null);
  const [mathFeedback, setMathFeedback] = useState(null);
  const [englishFeedback, setEnglishFeedback] = useState(null);
// 🎙️ Reading Mode States (Offline Vosk)
const [englishGameStyle, setEnglishGameStyle] = useState('spelling');
const [isListening, setIsListening] = useState(false);
const [voskModel, setVoskModel] = useState(null);
const [isVoskLoading, setIsVoskLoading] = useState(true);
const speechRecognitionRef = useRef(null);
const recognizerRef = useRef(null);
const mediaRecorderRef = useRef(null);
const audioChunksRef = useRef([]);
const englishStateRef = useRef(englishState);
const questionIndexRef = useRef(currentQuestionIndex);

useEffect(() => { englishStateRef.current = englishState; }, [englishState]);
useEffect(() => { questionIndexRef.current = currentQuestionIndex; }, [currentQuestionIndex]);
  const [showLevelComplete, setShowLevelComplete] = useState(false);
  const [isAvatarJumping, setIsAvatarJumping] = useState(false);

  // Gold & Badge States — seeded from the active mode's storage on first load
const [goldCount, setGoldCount] = useState(() => {
  try { return parseInt(localStorage.getItem(`brainbee_${_initialMode}_gold`) || '0'); } catch { return 0; }
});
const [showBadgeModal, setShowBadgeModal] = useState(false);
const [selectedBadgeMode, setSelectedBadgeMode] = useState(null);
const [flyingGolds, setFlyingGolds] = useState([]);
const [mathStars, setMathStars] = useState(() => {
  try { return parseInt(localStorage.getItem(`brainbee_${_initialMode}_mathStars`) || '0'); } catch { return 0; }
});
const [englishStars, setEnglishStars] = useState(() => {
  try { return parseInt(localStorage.getItem(`brainbee_${_initialMode}_englishStars`) || '0'); } catch { return 0; }
});
const [confetti, setConfetti] = useState([]);

  // Language & Music States
  const [language, setLanguage] = useState('en');
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [ownedAvatars, setOwnedAvatars] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`brainbee_${_initialMode}_owned_avatars`) || '["bee"]'); }
    catch { return ['bee']; }
  });
  const [equippedAvatar, setEquippedAvatar] = useState(() => {
    return localStorage.getItem(`brainbee_${_initialMode}_equipped_avatar`) || 'bee';
  });
  const [showLanguageConfirm, setShowLanguageConfirm] = useState(false);
  const [pendingLanguage, setPendingLanguage] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [bossBattle, setBossBattle] = useState({ active: false, mode: null, level: null, challenges: [], answered: {}, results: {}, hp: 5, defeated: false, currentIndex: 0 });
  const [bossHit, setBossHit] = useState(false);
  const [draggedBossOption, setDraggedBossOption] = useState(null);
  // 🔍 Word Search states
  const [wsSelecting, setWsSelecting] = useState(false);
  const [wsStart, setWsStart] = useState(null);
  const [wsEnd, setWsEnd] = useState(null);
  const [wsFoundWords, setWsFoundWords] = useState([]);
  const [wsHighlight, setWsHighlight] = useState([]); // cells currently highlighted during drag
  const [showRankUp, setShowRankUp] = useState(null); // { name, image } of new badge
  const [showBossIntroModal, setShowBossIntroModal] = useState(false);
  const [pendingBossChallenges, setPendingBossChallenges] = useState([]);
  const pendingPracticeBossRef = useRef(null);
  const audioRef = useRef(null);
  const bossAudioRef = useRef(null);

  // Game History & Profile States
  const [gameHistory, setGameHistory] = useState([]);
  const [mathStreak, setMathStreak] = useState(() => {
    try { return parseInt(localStorage.getItem(`brainbee_${_initialMode}_mathStreak`) || '0'); } catch { return 0; }
  });
  const [englishStreak, setEnglishStreak] = useState(() => {
    try { return parseInt(localStorage.getItem(`brainbee_${_initialMode}_englishStreak`) || '0'); } catch { return 0; }
  });
    const [showProfile, setShowProfile] = useState(false);
  
    // 🔐 Auth & Admin States (Consolidated)
  const [gameMode, setGameMode] = useState('adventure'); // Default: Adventure
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [users, setUsers] = useState([]);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginMsg, setLoginMsg] = useState('');
  const [adminView, setAdminView] = useState('manage'); // Default to Manage Users tab
  const [adminForm, setAdminForm] = useState({ username: '', password: '', role: 'student' });
    // 📝 Practice Questions States
  const [practiceQuestions, setPracticeQuestions] = useState([]);
  const [questionForm, setQuestionForm] = useState({ subject: 'english', style: 'spelling', targetWord: '', bossBattleQuestions: ['','','','',''], bossBattleCurrentInput: '', grammarSentence: '', grammarCorrect: '', grammarChoices: ['','',''] });
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [grammarState, setGrammarState] = useState({ sentence: '', correct: '', choices: [], selectedChoice: null, isAnswered: false, correctCount: 0, totalQuestions: 1 });

  // 💡 Hint system states
  const [hintUsedMath, setHintUsedMath] = useState(false);
  const [hintUsedSpelling, setHintUsedSpelling] = useState(false);
  const [hintUsedGrammar, setHintUsedGrammar] = useState(false);
  const [practiceRegularScore, setPracticeRegularScore] = useState({ correct: 0, total: 0 });
  const [practiceBossScore, setPracticeBossScore] = useState({ correct: 0, total: 0 });
  const [showStylePreview, setShowStylePreview] = useState(false);
  const [previewStyle, setPreviewStyle] = useState('');
  const [showModuleUpload, setShowModuleUpload] = useState(false);
  const [moduleFile, setModuleFile] = useState(null);
  const [moduleFileName, setModuleFileName] = useState('');
  const [moduleGenerating, setModuleGenerating] = useState(false);
  const [moduleGeneratedQs, setModuleGeneratedQs] = useState([]);
  const [moduleStep, setModuleStep] = useState('upload'); // 'upload' | 'review'
  const [moduleDragOver, setModuleDragOver] = useState(false);
  const [moduleSubject, setModuleSubject] = useState('english'); // ✅ Fixes 'moduleSubject' is not defined
  
  // Question type configuration state
  const [moduleQuestionConfig, setModuleQuestionConfig] = useState({
    // English defaults
    spelling: 3,
    speech: 2,
    grammar_checker: 2,
    boss_battle: 2,
    // Math defaults
    arithmetic: 3,
  });

  // Reset hint flags on every new question
  useEffect(() => {
    setHintUsedMath(false);
    setHintUsedSpelling(false);
    setHintUsedGrammar(false);
  }, [currentQuestionIndex]);

// 🗃️ Load Practice Questions from Backend
useEffect(() => {
  if (!isLoggedIn) return;
  apiGetQuestions().then(data => {
    if (Array.isArray(data)) setPracticeQuestions(data);
  });
}, [isLoggedIn]);

// 🗃️ Load Game History from Backend
useEffect(() => {
  if (!isLoggedIn) return;
  const token = localStorage.getItem('brainbee_token');
  fetch(`http://localhost:5000/api/player/history/${gameMode}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  .then(r => r.json())
  .then(data => {
    if (Array.isArray(data)) {
      const formatted = data.map(h => ({
        id: h.id,
        mode: h.subject,
        level: h.level,
        correctCount: h.correct_count,
        totalQuestions: h.total_questions,
        starsGained: h.correct_count,
        correctPercentage: Math.round((h.correct_count / h.total_questions) * 100),
      }));
      setGameHistory(formatted);
    }
  })
  .catch(() => setGameHistory([]));
}, [isLoggedIn, gameMode]);

// ♻️ loadModeData — swaps ALL game data to the given mode's localStorage bucket
const loadModeData = (mode) => {
  const g = (key) => { try { return localStorage.getItem(`brainbee_${mode}_${key}`); } catch { return null; } };
  setGameHistory(JSON.parse(g('gameHistory') || '[]'));
  setGoldCount(parseInt(g('gold') || '0'));
  setMathStars(parseInt(g('mathStars') || '0'));
  setEnglishStars(parseInt(g('englishStars') || '0'));
  setOwnedAvatars(JSON.parse(g('owned_avatars') || '["bee"]'));
  setEquippedAvatar(g('equipped_avatar') || 'bee');
  setMathStreak(parseInt(g('mathStreak') || '0'));
  setEnglishStreak(parseInt(g('englishStreak') || '0'));
  // ✅ BUG FIX: restore per-subject completed levels & current level
  setMathCompletedLevels(new Set(JSON.parse(g('mathCompletedLevels') || '[]')));
  setEnglishCompletedLevels(new Set(JSON.parse(g('englishCompletedLevels') || '[]')));
  setMathCurrentLevel(parseInt(g('mathCurrentLevel') || '1'));
  setEnglishCurrentLevel(parseInt(g('englishCurrentLevel') || '1'));
};

// 🔄 When the player switches between Adventure ↔ Practice, reload the correct data bucket
const _modeInitialized = useRef(false);
useEffect(() => {
  if (!_modeInitialized.current) { _modeInitialized.current = true; return; }
  loadModeData(gameMode);
  // Also reset any active game so the player isn't mid-level during a mode switch
  setActiveGame(null);
  setShowLevelComplete(false);
}, [gameMode]); // eslint-disable-line react-hooks/exhaustive-deps

// 💾 Save Game History to mode-specific LocalStorage key
useEffect(() => {
  localStorage.setItem(`brainbee_${gameMode}_gameHistory`, JSON.stringify(gameHistory));
}, [gameHistory]); // gameMode is read from closure — not in deps to avoid cross-mode overwrite on switch

// 💾 Persist owned avatars (mode-specific)
useEffect(() => {
  localStorage.setItem(`brainbee_${gameMode}_owned_avatars`, JSON.stringify(ownedAvatars));
}, [ownedAvatars]);

// 💾 Persist equipped avatar (mode-specific)
useEffect(() => {
  localStorage.setItem(`brainbee_${gameMode}_equipped_avatar`, equippedAvatar);
}, [equippedAvatar]);

// 💾 Persist gold (mode-specific)
useEffect(() => {
  localStorage.setItem(`brainbee_${gameMode}_gold`, String(goldCount));
}, [goldCount]);

// 💾 Persist math & english stars (mode-specific)
useEffect(() => {
  localStorage.setItem(`brainbee_${gameMode}_mathStars`, String(mathStars));
}, [mathStars]);
useEffect(() => {
  localStorage.setItem(`brainbee_${gameMode}_englishStars`, String(englishStars));
}, [englishStars]);

// 💾 Persist streaks (mode-specific)
useEffect(() => {
  localStorage.setItem(`brainbee_${gameMode}_mathStreak`, String(mathStreak));
}, [mathStreak]);
useEffect(() => {
  localStorage.setItem(`brainbee_${gameMode}_englishStreak`, String(englishStreak));
}, [englishStreak]);

// 💾 Persist completed levels per subject (mode-specific)
useEffect(() => {
  localStorage.setItem(`brainbee_${gameMode}_mathCompletedLevels`, JSON.stringify([...mathCompletedLevels]));
}, [mathCompletedLevels]);
useEffect(() => {
  localStorage.setItem(`brainbee_${gameMode}_englishCompletedLevels`, JSON.stringify([...englishCompletedLevels]));
}, [englishCompletedLevels]);

// 💾 Persist currentLevel per subject (mode-specific)
useEffect(() => {
  localStorage.setItem(`brainbee_${gameMode}_mathCurrentLevel`, String(mathCurrentLevel));
}, [mathCurrentLevel]);
useEffect(() => {
  localStorage.setItem(`brainbee_${gameMode}_englishCurrentLevel`, String(englishCurrentLevel));
}, [englishCurrentLevel]);

// 🏆 Sync current player to backend whenever stats change
const mathCompletedArr = [...mathCompletedLevels].join(',');
const englishCompletedArr = [...englishCompletedLevels].join(',');
useEffect(() => {
  if (!nickname || !isLoggedIn) return;
  apiSavePlayer(gameMode, {
    gold: goldCount,
    math_stars: mathStars,
    english_stars: englishStars,
    math_streak: mathStreak,
    english_streak: englishStreak,
    math_current_level: mathCurrentLevel,
    english_current_level: englishCurrentLevel,
    math_completed_levels: mathCompletedArr ? mathCompletedArr.split(',').map(Number) : [],
    english_completed_levels: englishCompletedArr ? englishCompletedArr.split(',').map(Number) : [],
    owned_avatars: ownedAvatars,
    equipped_avatar: equippedAvatar,
  });
}, [nickname, mathStars, englishStars, mathCompletedArr, englishCompletedArr, gameMode, goldCount, isLoggedIn]);

const handleGenerateFromModule = async () => {
    if (!moduleFile) return;
    
    // Validate subject selection
    if (!moduleSubject) {
      alert('⚠️ Please select a subject (Math or English) first!');
      return;
    }
    
    setModuleGenerating(true);
    
    try {
      console.log('📤 Uploading file to backend:', moduleFile.name);
      console.log('📚 Subject:', moduleSubject);
      console.log('⚙️ Config:', moduleQuestionConfig);
      
      // Filter config based on subject and pass to API
      let configToSend = {};
      if (moduleSubject === 'english') {
        configToSend = {
          spelling: Number(moduleQuestionConfig.spelling) || 0,
          speech: Number(moduleQuestionConfig.speech) || 0,
          grammar_checker: Number(moduleQuestionConfig.grammar_checker) || 0,
          boss_battle: Number(moduleQuestionConfig.boss_battle) || 0,
        };
      } else if (moduleSubject === 'math') {
        configToSend = {
          arithmetic: Number(moduleQuestionConfig.arithmetic) || 0,
          boss_battle: Number(moduleQuestionConfig.boss_battle) || 0,
        };
      }
      
      // ✅ Call YOUR backend API with question configuration
      const response = await apiGenerateQuestions(moduleFile, moduleSubject, configToSend);
      
      console.log('📥 Backend response:', response);
      
      if (!response.success) {
        alert(`❌ ${response.error || 'Failed to generate questions'}`);
        setModuleGenerating(false);
        return;
      }

      if (!response.questions || response.questions.length === 0) {
        alert('❌ No questions were generated. Please try a different PDF.');
        setModuleGenerating(false);
        return;
      }

      console.log(`✅ Received ${response.questions.length} questions from backend`);

      // Process questions to add distractors and format boss battles
      const processed = response.questions.map((q, i) => {
        const result = {
          ...q,
          id: q.id || (Date.now() + i),
          createdAt: q.createdAt || new Date().toISOString(),
        };

        // Add distractors for spelling style
        if (q.style === 'spelling' && !q.distractors) {
          result.distractors = generateDistractors(q.targetWord);
        }

        // Process boss battle questions
        if (q.style === 'boss_battle' && q.bossBattleQuestions) {
          // Check if bossBattleQuestions is already in correct format (with question, choices, correctAnswer)
          if (Array.isArray(q.bossBattleQuestions) && q.bossBattleQuestions[0]?.question) {
            // Already formatted correctly
            result.bossBattleQuestions = q.bossBattleQuestions;
          } else if (Array.isArray(q.bossBattleQuestions)) {
            // Convert simple word array to challenge format
            result.challenges = q.bossBattleQuestions.map((word, j) => {
              const qs2 = q.bossBattleQuestions || [];
              const fakeOptions = qs2.filter(w => w !== word).slice(0, 3);
              const options = makeBossOptions(word, fakeOptions);
              return { 
                id: `bb-${i}-${j}`, 
                prompt: `Choose the correct spelling: ${word.toUpperCase()}`, 
                correct: word, 
                options 
              };
            });
          }
        }

        return result;
      });

      console.log('✅ Processed questions:', processed);

      setModuleGeneratedQs(processed);
      setModuleStep('review');
      
    } catch (err) {
      console.error('❌ AI generation error:', err);
      alert(`❌ Failed to generate questions. Please try again.\n\nError: ${err.message || 'Unknown error'}`);
    }

    
    
    setModuleGenerating(false);
};

// 💾 Save AI Generated Questions to Database
const handleSaveGeneratedQuestions = async () => {
  if (!moduleGeneratedQs.length) return;
  try {
    // Batch save all generated questions to the backend
    const savePromises = moduleGeneratedQs.map(q => apiSaveQuestion(q));
    await Promise.all(savePromises);
    
    // Refresh the local question list from the database
    const updated = await apiGetQuestions();
    if (Array.isArray(updated)) setPracticeQuestions(updated);
    
    alert(`✅ Successfully saved ${moduleGeneratedQs.length} questions to the database!`);
    setShowModuleUpload(false);
    setModuleGeneratedQs([]);
  } catch (err) {
    console.error('❌ Error saving generated questions:', err);
    alert('❌ Failed to save questions. Please try again.');
  }
};

// 👁️ Style preview image map
  const stylePreviewMap = {
    spelling:        '/previews/preview-spelling.png',
    speech:          '/previews/preview-speech.png',
    grammar_checker: '/previews/preview-grammar.png',
    boss_battle:     '/previews/preview-boss-battle.png',
    arithmetic:      '/previews/preview-math.png',
  };

  // 🔤 Generate Distractors for Spelling Mode
  const generateDistractors = (word) => {
    const letters = word.toLowerCase().split('');
    const distractors = [];
    const alphabet = 'abcdefghijklmnopqrstuvwxyz';
    while (distractors.length < 4) {
      const l = alphabet[Math.floor(Math.random() * 26)];
      if (!letters.includes(l) && !distractors.includes(l)) distractors.push(l);
    }
    return [...letters, ...distractors].sort(() => Math.random() - 0.5);
  };

  // 💾 Handle Save Question (Create/Update)
  const handleSaveQuestion = () => {
    // --- Grammar Checker question ---
    if (questionForm.style === 'grammar_checker') {
      if (!questionForm.grammarSentence || !questionForm.grammarSentence.includes('(blank)')) {
        alert('⚠️ Please include (blank) in your sentence!');
        return;
      }
      if (!questionForm.grammarCorrect.trim()) {
        alert('⚠️ Please enter the correct answer!');
        return;
      }
      const filledChoices = questionForm.grammarChoices.map(c => c.trim()).filter(Boolean);
      if (filledChoices.length < 3) {
        alert('⚠️ Please enter at least 3 wrong choices!');
        return;
      }
      // Take exactly 3 wrong choices + 1 correct = 4 total choices
      const wrongThree = filledChoices.slice(0, 3);
      const allChoices = [...wrongThree, questionForm.grammarCorrect.trim()].sort(() => Math.random() - 0.5);
      const newQ = {
        id: editingQuestionId || Date.now(),
        subject: 'english',
        style: 'grammar_checker',
        targetWord: questionForm.grammarCorrect.trim(),
        grammarSentence: questionForm.grammarSentence.trim(),
        grammarCorrect: questionForm.grammarCorrect.trim(),
        grammarChoices: allChoices,
        createdAt: new Date().toISOString()
      };
      setPracticeQuestions(prev => {
        const updated = editingQuestionId
          ? prev.map(q => q.id === editingQuestionId ? newQ : q)
          : [...prev, newQ];
        return updated;
      });
      setQuestionForm({ subject: 'english', style: 'spelling', targetWord: '', bossBattleQuestions: ['','','','',''], bossBattleCurrentInput: '', grammarSentence: '', grammarCorrect: '', grammarChoices: ['','',''] });
      const gEditId = editingQuestionId;
      setEditingQuestionId(null);
      if (gEditId) {
        apiEditQuestion(gEditId, newQ).then(() => {
          apiGetQuestions().then(data => { if (Array.isArray(data)) setPracticeQuestions(data); });
        });
      } else {
        apiSaveQuestion(newQ).then(() => {
          apiGetQuestions().then(data => { if (Array.isArray(data)) setPracticeQuestions(data); });
        });
      }
      return;
    }

    // --- Boss Battle: save as a set of 5 challenges ---
    if (questionForm.style === 'boss_battle') {
      const qs = questionForm.bossBattleQuestions.map(w => w.trim()).filter(Boolean);
      if (qs.length < 5) {
        alert('⚠️ Please fill in all 5 boss battle questions!');
        return;
      }
      // Build challenges array depending on subject
      const challenges = qs.map((word, i) => {
        if (questionForm.subject === 'math') {
          const num = word.replace(/[^0-9]/g, '');
          const leftVal = Math.floor(Math.random() * 10) + 1;
          const answerVal = parseInt(num) || 10;
          const rightVal = leftVal + answerVal;
          const options = makeBossOptions(rightVal, [rightVal+1, Math.max(0,rightVal-1), rightVal+2, rightVal-2]);
          return { id: `bb-math-${i}`, prompt: `${leftVal} + ${answerVal} = ?`, correct: String(rightVal), options, word };
        } else {
          // English boss battle: choose the correct word from options
          const fakeOptions = qs.filter(w => w !== word).slice(0, 3);
          const options = makeBossOptions(word, fakeOptions);
          return { id: `bb-eng-${i}`, prompt: `Choose the correct spelling: ${word.toUpperCase()}`, correct: word, options };
        }
      });
      const newQ = {
        id: editingQuestionId || Date.now(),
        subject: questionForm.subject,
        style: 'boss_battle',
        targetWord: qs[0], // representative label
        bossBattleQuestions: qs,
        challenges,
        createdAt: new Date().toISOString()
      };
      setPracticeQuestions(prev => {
        const updated = editingQuestionId
          ? prev.map(q => q.id === editingQuestionId ? newQ : q)
          : [...prev, newQ];
        return updated;
      });
      setQuestionForm({ subject: 'english', style: 'spelling', targetWord: '', bossBattleQuestions: ['','','','',''], bossBattleCurrentInput: '', grammarSentence: '', grammarCorrect: '', grammarChoices: ['','',''] });
      const bEditId = editingQuestionId;
      setEditingQuestionId(null);
      if (bEditId) {
        apiEditQuestion(bEditId, newQ).then(() => {
          apiGetQuestions().then(data => { if (Array.isArray(data)) setPracticeQuestions(data); });
        });
      } else {
        apiSaveQuestion(newQ).then(() => {
          apiGetQuestions().then(data => { if (Array.isArray(data)) setPracticeQuestions(data); });
        });
      }
      return;
    }

    // --- Normal question ---
    if (!questionForm.targetWord) return;
    const newQ = {
      id: editingQuestionId || Date.now(),
      subject: questionForm.subject,
      style: questionForm.style,
      targetWord: questionForm.targetWord,
      distractors: questionForm.style === 'spelling' ? generateDistractors(questionForm.targetWord) : [],
      createdAt: new Date().toISOString()
    };
    setPracticeQuestions(prev => {
      const updated = editingQuestionId 
        ? prev.map(q => q.id === editingQuestionId ? newQ : q) 
        : [...prev, newQ];
      return updated;
    });
    setQuestionForm({ subject: 'english', style: 'spelling', targetWord: '', bossBattleQuestions: ['','','','',''], bossBattleCurrentInput: '', grammarSentence: '', grammarCorrect: '', grammarChoices: ['','',''] });
    const nEditId = editingQuestionId;
    setEditingQuestionId(null);
    if (nEditId) {
      apiEditQuestion(nEditId, newQ).then(() => {
        apiGetQuestions().then(data => { if (Array.isArray(data)) setPracticeQuestions(data); });
      });
    } else {
      apiSaveQuestion(newQ).then(() => {
        apiGetQuestions().then(data => { if (Array.isArray(data)) setPracticeQuestions(data); });
      });
    }
  };

  // ✏️ Handle Edit Question
  const handleEditQuestion = (q) => {
    setEditingQuestionId(q.id);
    setQuestionForm({
      subject: q.subject,
      style: q.style,
      targetWord: q.targetWord,
      bossBattleQuestions: q.bossBattleQuestions || ['','','','',''],
      bossBattleCurrentInput: '',
      grammarSentence: q.grammarSentence || '',
      grammarCorrect: q.grammarCorrect || '',
      grammarChoices: q.style === 'grammar_checker'
        ? (q.grammarChoices || []).filter(c => c !== q.grammarCorrect).concat(['','','']).slice(0,3)
        : ['','',''],
    });
  };

  // 🗑️ Handle Delete Question
  const handleDeleteQuestion = (id) => {
    if (window.confirm('Delete this question?')) {
      // Remove from UI immediately (optimistic update)
      setPracticeQuestions(prev => prev.filter(q => q.id !== id));
      // ✅ Delete from database so it stays gone after reload
      apiDeleteQuestion(id).catch(err => {
        console.error('Failed to delete question from DB:', err);
        // Rollback UI if API call fails by re-fetching
        apiGetQuestions().then(data => {
          if (Array.isArray(data)) setPracticeQuestions(data);
        });
      });
    }
  };

  // 🎮 Load Practice Question into Game State
  const loadPracticeQuestion = (index) => {
  // ✅ FIX: Only load questions for the currently selected subject
  const subjectQuestions = practiceQuestions.filter(q => q.subject === selectedMode);
  if (index >= subjectQuestions.length) return;
  const q = subjectQuestions[index];

  // ⚔️ Boss Battle style — activate boss battle engine
  if (q.style === 'boss_battle') {
    const challenges = q.challenges || [];
    const isEnglish = q.subject === 'english';

    // For English practice boss battle → generate word search grid
    let wordSearchData = null;
    if (isEnglish) {
      const words = (q.bossBattleQuestions || []).map(w => w.trim().toUpperCase()).filter(Boolean);
      wordSearchData = generateWordSearchGrid(words);
      setWsFoundWords([]);
      setWsStart(null);
      setWsEnd(null);
      setWsSelecting(false);
      setWsHighlight([]);
    }

    // Store the full practice boss state so startBossFromModal can restore it exactly
    const fullPracticeBossState = {
      active: true,
      mode: q.subject,
      level: 'practice',
      challenges,
      answered: {},
      results: {},
      hp: 5,
      defeated: false,
      currentIndex: 0,
      isPractice: true,
      isWordSearch: isEnglish,
      wordSearchGrid: wordSearchData ? wordSearchData.grid : null,
      wordSearchWords: wordSearchData ? wordSearchData.placed.map(p => p.word) : [],
      wordSearchPlaced: wordSearchData ? wordSearchData.placed : [],
    };
    pendingPracticeBossRef.current = fullPracticeBossState;

    // Set up the game screen (so the background is visible behind the intro modal)
    if (q.subject === 'math') {
      setMathState(prev => ({ ...prev, totalQuestions: subjectQuestions.length, correctCount: 0 }));
      setActiveGame('math');
    } else {
      setEnglishState(prev => ({ ...prev, totalQuestions: subjectQuestions.length, correctCount: 0 }));
      setActiveGame('english');
    }
    setCurrentQuestionIndex(index);

    // Show the boss intro modal — startBossFromModal will apply fullPracticeBossState
    setShowBossIntroModal(true);
    return;
  }

  if (q.subject === 'math') {
    const targetNum = q.targetWord.replace(/[^0-9]/g, '');
    if (!targetNum) {
      setMathFeedback({ type: 'wrong', message: '⚠️ Please enter a valid number!' });
      return;
    }
    const leftVal = Math.floor(Math.random() * 10) + 1;
    const answerVal = parseInt(targetNum);
    const rightVal = leftVal + answerVal;
    const correctDigits = targetNum.split('').map(Number);
    const distractors = Array.from({ length: Math.max(3, 6 - correctDigits.length) }, () => Math.floor(Math.random() * 10));
    const pool = [...correctDigits, ...distractors].sort(() => Math.random() - 0.5);
    setMathState({
      question: { left: leftVal, right: rightVal, answer: answerVal },
      displayLeft: leftVal,
      displayRight: rightVal,
      displayAnswer: null,
      hiddenValue: targetNum,
      blanks: Array(targetNum.length).fill(null),
      placedIndices: Array(targetNum.length).fill(null),
      pool,
      isAnswered: false,
      correctCount: 0,
      totalQuestions: subjectQuestions.length,
      usedIndices: [],
      hiddenPart: 'answer',
    });
    setActiveGame('math');
    setMathFeedback(null);
    setBossBattle({ active: false, mode: null, level: null, challenges: [], answered: {}, results: {}, hp: 5, defeated: false, currentIndex: 0 });
  } else if (q.subject === 'english') {
    if (q.style === 'spelling') {
      setEnglishState({
        word: q.targetWord,
        blanks: Array(q.targetWord.length).fill(null),
        placedIndices: Array(q.targetWord.length).fill(null),
        pool: q.distractors,
        isAnswered: false,
        correctCount: 0,
        totalQuestions: subjectQuestions.length,
        usedIndices: [],
      });
      setEnglishGameStyle('spelling');
    } else if (q.style === 'grammar_checker') {
      // Shuffle choices fresh each time to avoid memorization
      const shuffled = [...(q.grammarChoices || [])].sort(() => Math.random() - 0.5);
      setGrammarState({
        sentence: q.grammarSentence,
        correct: q.grammarCorrect,
        choices: shuffled,
        selectedChoice: null,
        isAnswered: false,
        correctCount: 0,
        totalQuestions: subjectQuestions.length,
      });
      setEnglishGameStyle('grammar_checker');
      setEnglishState(prev => ({ ...prev, isAnswered: false, correctCount: 0, totalQuestions: subjectQuestions.length }));
    } else {
      setEnglishState({
        word: q.targetWord,
        blanks: [],
        placedIndices: [],
        pool: [],
        isAnswered: false,
        correctCount: 0,
        totalQuestions: subjectQuestions.length,
        usedIndices: [],
      });
      setEnglishGameStyle('reading');
    }
    setActiveGame('english');
    setEnglishFeedback(null);
    setBossBattle({ active: false, mode: null, level: null, challenges: [], answered: {}, results: {}, hp: 5, defeated: false, currentIndex: 0 });
  }
  setCurrentQuestionIndex(index);
};

// 🆕 Auto-advance questions in Practice Mode
useEffect(() => {
  if (gameMode === 'practice' && activeGame && !showLevelComplete) {
    loadPracticeQuestion(currentQuestionIndex);
  }
}, [currentQuestionIndex, gameMode, activeGame, showLevelComplete, selectedMode]);

  // 🚀 Start Practice Game
  const startPracticeGame = () => {
    setPracticeRegularScore({ correct: 0, total: 0 });
    setPracticeBossScore({ correct: 0, total: 0 });
    const subjectQuestions = practiceQuestions.filter(q => q.subject === selectedMode);
    if (subjectQuestions.length === 0) {
      setEnglishFeedback({ type: 'wrong', message: `⚠️ No practice questions configured for ${selectedMode === 'math' ? 'Math' : 'English'}!` });
      setTimeout(() => setEnglishFeedback(null), 3000);
      return;
    }
    playSound('click');
    setIsTransitioning(true);

    setTimeout(() => {
      setActiveGame(selectedMode);
      setCurrentLevel(1);
      loadPracticeQuestion(0);
    }, 400);

    setTimeout(() => {
      setIsTransitioning(false);
    }, 1000);
  };
  const [showPassword, setShowPassword] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [usersWithPass, setUsersWithPass] = useState({});


  const [adminTab, setAdminTab] = useState('create');
  const [adminLbTab, setAdminLbTab] = useState('totalStars');
  const [allStudentData, setAllStudentData] = useState([]); // leaderboard rows from API for admin views
  const [playerStatusFilter, setPlayerStatusFilter] = useState('all');
  const [playerActivityMap, setPlayerActivityMap] = useState({}); // Track player activity

  // Player Status Helper Function
  const getPlayerStatus = (username) => {
    const lastActive = playerActivityMap[username] || { timestamp: Date.now() - 60000, activity: 'Unknown', gameMode: null };
    const timeDiff = Date.now() - lastActive.timestamp;
    const isOnline = timeDiff < 5 * 60 * 1000; // Online if active in last 5 minutes
    
    const formatTime = (ms) => {
      const mins = Math.floor(ms / 60000);
      if (mins === 0) return 'Just now';
      if (mins === 1) return '1 min ago';
      if (mins < 60) return `${mins} mins ago`;
      const hours = Math.floor(mins / 60);
      if (hours === 1) return '1 hour ago';
      return `${hours} hours ago`;
    };

    const currentActivity = lastActive.gameMode === 'practice' ? '🎯 Practice Game' : 
                           lastActive.gameMode === 'adventure' ? '🗺️ Adventure Game' : 
                           '⏸️ Idle';
    
    const getPlayDuration = () => {
      const sessionDuration = lastActive.sessionDuration || 0;
      if (sessionDuration === 0) return '-';
      const secs = Math.floor(sessionDuration / 1000);
      const mins = Math.floor(secs / 60);
      const hours = Math.floor(mins / 60);
      if (hours > 0) return `${hours}h ${mins % 60}m`;
      if (mins > 0) return `${mins}m ${secs % 60}s`;
      return `${secs}s`;
    };

    return {
      isOnline,
      lastActiveText: formatTime(timeDiff),
      currentActivity,
      playDuration: getPlayDuration(),
    };
  };

 useEffect(() => {
  const storedMode = localStorage.getItem('brainbee_gameMode') || 'adventure';
  setGameMode(storedMode);
  const savedUser = JSON.parse(localStorage.getItem('brainbee_current_user') || 'null');
  const savedToken = localStorage.getItem('brainbee_token');

  if (savedUser && savedToken) {
    // ✅ Validate token with server before restoring session
    fetch('http://localhost:5000/api/auth/me', {
      headers: { 'Authorization': `Bearer ${savedToken}` },
    })
      .then(r => {
        if (!r.ok) throw new Error('Token invalid or expired');
        return r.json();
      })
      .then(freshUser => {
        // Token confirmed valid — restore session with fresh user data
        const mergedUser = { ...savedUser, ...freshUser };
        setCurrentUser(mergedUser);
        setIsLoggedIn(true);
        setIsAdmin(mergedUser.role === 'admin');
        localStorage.setItem('brainbee_current_user', JSON.stringify(mergedUser));

        // ✅ Skip greeting screen if user already has a nickname
        const restoredNickname = mergedUser.nickname?.trim() || '';
        if (restoredNickname && mergedUser.role !== 'admin') {
          setNickname(restoredNickname);
          setCurrentScreen('home');
          setIsHomepageBlurred(false);
          setShowGreetingOverlay(false);
        }

        apiGetUsers().then(data => {
          if (Array.isArray(data)) setUsers(data);
        });

        if (mergedUser.role === 'admin') {
          Promise.all([
            apiGetLeaderboard('adventure'),
            apiGetLeaderboard('practice'),
          ]).then(([adv, prac]) => {
            const map = {};
            const merge = (rows) => {
              if (!Array.isArray(rows)) return;
              rows.forEach(r => {
                if (!map[r.user_id]) {
                  map[r.user_id] = { ...r };
                } else {
                  map[r.user_id].total_stars            = Math.max(map[r.user_id].total_stars || 0,               r.total_stars || 0);
                  map[r.user_id].math_stars             = Math.max(map[r.user_id].math_stars || 0,                r.math_stars || 0);
                  map[r.user_id].english_stars          = Math.max(map[r.user_id].english_stars || 0,             r.english_stars || 0);
                  map[r.user_id].highest_level          = Math.max(map[r.user_id].highest_level || 1,             r.highest_level || 1);
                  map[r.user_id].highest_math_score     = Math.max(map[r.user_id].highest_math_score || 0,        r.highest_math_score || 0);
                  map[r.user_id].highest_english_score  = Math.max(map[r.user_id].highest_english_score || 0,     r.highest_english_score || 0);
                }
              });
            };
            merge(adv);
            merge(prac);
            setAllStudentData(Object.values(map));
          }).catch(() => {});
        }
      })
      .catch(() => {
        // Token invalid, expired, or server unreachable — clear stale session
        localStorage.removeItem('brainbee_token');
        localStorage.removeItem('brainbee_current_user');
        setIsLoggedIn(false);
        setIsAdmin(false);
        setCurrentUser(null);
      });
  }
}, []);

  // Refresh student leaderboard data when admin visits leaderboard or students tabs
  useEffect(() => {
    if (!isAdmin) return;
    if (adminView !== 'leaderboard' && adminView !== 'students') return;
    Promise.all([
      apiGetLeaderboard('adventure'),
      apiGetLeaderboard('practice'),
    ]).then(([adv, prac]) => {
      const map = {};
      const merge = (rows) => {
        if (!Array.isArray(rows)) return;
        rows.forEach(r => {
          if (!map[r.user_id]) {
            map[r.user_id] = { ...r };
          } else {
            map[r.user_id].total_stars            = Math.max(map[r.user_id].total_stars || 0,               r.total_stars || 0);
            map[r.user_id].math_stars             = Math.max(map[r.user_id].math_stars || 0,                r.math_stars || 0);
            map[r.user_id].english_stars          = Math.max(map[r.user_id].english_stars || 0,             r.english_stars || 0);
            map[r.user_id].highest_level          = Math.max(map[r.user_id].highest_level || 1,             r.highest_level || 1);
            map[r.user_id].highest_math_score     = Math.max(map[r.user_id].highest_math_score || 0,        r.highest_math_score || 0);
            map[r.user_id].highest_english_score  = Math.max(map[r.user_id].highest_english_score || 0,     r.highest_english_score || 0);
          }
        });
      };
      merge(adv);
      merge(prac);
      setAllStudentData(Object.values(map));
    }).catch(() => {});
  }, [isAdmin, adminView]);

  // Save mode changes to localStorage
  useEffect(() => {
    localStorage.setItem('brainbee_gameMode', gameMode);
  }, [gameMode]);

const handleLogin = async () => {
  if (!loginForm.username || !loginForm.password) return;
  setLoginMsg('⏳ Logging in...');
  const res = await apiLogin(loginForm.username, loginForm.password);
  if (res.token) {
    const user = res.user;
    localStorage.setItem('brainbee_token', res.token);
    localStorage.setItem('brainbee_current_user', JSON.stringify(user));
    setIsLoggedIn(true);
    setIsAdmin(user.role === 'admin');
    setCurrentUser(user);
    setGameMode(user.role === 'admin' ? 'adventure' : 'practice');
    playSound('unlock');
    setShowSettings(false);
    setLoginMsg('');
    // Clear old localStorage game history to prevent bleed-in
    localStorage.removeItem(`brainbee_adventure_gameHistory`);
    localStorage.removeItem(`brainbee_practice_gameHistory`);
    setGameHistory([]);
    // Load users list for admin
    if (user.role === 'admin') {
      apiGetUsers().then(data => { if (Array.isArray(data)) setUsers(data); });
    }
    // Load player data from backend
    const mode = user.role === 'admin' ? 'adventure' : 'practice';
    const playerData = await apiGetPlayer(mode);
    if (!playerData.error) {
      setGoldCount(playerData.gold || 0);
      setMathStars(playerData.math_stars || 0);
      setEnglishStars(playerData.english_stars || 0);
      setMathStreak(playerData.math_streak || 0);
      setEnglishStreak(playerData.english_streak || 0);
      setMathCurrentLevel(playerData.math_current_level || 1);
      setEnglishCurrentLevel(playerData.english_current_level || 1);
      setMathCompletedLevels(new Set(playerData.math_completed_levels || []));
      setEnglishCompletedLevels(new Set(playerData.english_completed_levels || []));
      setOwnedAvatars(playerData.owned_avatars || ['bee']);
      setEquippedAvatar(playerData.equipped_avatar || 'bee');
    }
    if (user.role === 'student') {
      // Fetch fresh user data to get latest nickname from DB
      fetch(`http://localhost:5000/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${res.token}` }
      })
      .then(r => r.json())
      .then(freshUser => {
        const latestNickname = freshUser?.nickname || user.nickname || '';
        const hasNickname = latestNickname.trim().length > 0;
        if (hasNickname) {
          setNickname(latestNickname);
          const updatedUser = { ...user, nickname: latestNickname };
          setCurrentUser(updatedUser);
          localStorage.setItem('brainbee_current_user', JSON.stringify(updatedUser));
          setCurrentScreen('home');
          setIsHomepageBlurred(false);
          setShowGreetingOverlay(false);
        } else {
          setCurrentScreen('greeting');
          setNickname('');
          setIsInputMode(false);
        }
      });
    }
  } else {
    setLoginMsg('❌ ' + (res.error || 'Invalid username or password!'));
    playSound('wrong');
  }
};

  const openConfirmModal = (type) => {
    const copy = {
      logout: {
        icon: '🚪',
        title: 'Log out now?',
        message: 'Your progress is already saved on this device. You can come back and continue anytime.',
        confirmText: 'Yes, log out',
        cancelText: 'Stay here',
        tone: 'logout',
      },
      adventure: {
        icon: '🗺️',
        title: 'Switch to Adventure?',
        message: 'Practice mode will close and you will return to the colorful level map.',
        confirmText: 'Go Adventure',
        cancelText: 'Keep Practicing',
        tone: 'adventure',
      },
      practice: {
        icon: '📖',
        title: 'Switch to Practice?',
        message: 'You are about to enter Practice Mode. Admin-configured questions will be used.',
        confirmText: 'Start Practice',
        cancelText: 'Stay in Adventure',
        tone: 'practice',
      },
    };
    setConfirmAction({ type, ...copy[type] });
    playSound('click');
  };

  const closeConfirmModal = () => {
    setConfirmAction(null);
    playSound('click');
  };

  const handlePracticeSwitch = () => {
    if (gameMode === 'practice') return;
    if (!isLoggedIn) {
      setShowLogin(true);
    } else {
      setShowSettings(false);
      openConfirmModal('practice');
    }
  };

  const handleAdventureSwitch = () => {
    if (gameMode === 'adventure') return;
    setShowSettings(false);
    openConfirmModal('adventure');
  };

  const confirmModalAction = () => {
    if (!confirmAction) return;
    if (confirmAction.type === 'logout') {
      setIsLoggedIn(false);
      setIsAdmin(false);
      setCurrentUser(null);
      localStorage.removeItem('brainbee_current_user');
      localStorage.removeItem('brainbee_token');
      setGameMode('adventure');
      localStorage.setItem('brainbee_gameMode', 'adventure');
      setCurrentScreen('greeting');
      setNickname('');
      setLoginForm({ username: '', password: '' });
      setLoginMsg('');
      setUsers([]);
      setPracticeQuestions([]);
      setShowSettings(false);
      setShowAdmin(false);
      setConfirmAction(null);
      playSound('click');
      return;
    }

    if (confirmAction.type === 'adventure') {
      setGameMode('adventure');
      localStorage.setItem('brainbee_gameMode', 'adventure');
      setActiveGame(null);
      setShowLevelComplete(false);
      setShowSettings(false);
      setConfirmAction(null);
      playSound('unlock');
    }

    if (confirmAction.type === 'practice') {
      setGameMode('practice');
      localStorage.setItem('brainbee_gameMode', 'practice');
      setActiveGame(null);
      setShowLevelComplete(false);
      setShowSettings(false);
      setConfirmAction(null);
      playSound('unlock');
    }
  };

  const handleLogout = () => {
    openConfirmModal('logout');
  };

 const handleCreateUser = async () => {
  if (!adminForm.username || !adminForm.password) return;
  setLoginMsg('⏳ Creating account...');
  const res = await apiRegister({
    username: adminForm.username,
    password: adminForm.password,
    role: adminForm.role,
    nickname: '',
  });
  if (res.user) {
    setLoginMsg('✅ Account created!');
    playSound('celebration');
    apiGetUsers().then(data => { if (Array.isArray(data)) setUsers(data); });
    setAdminForm({ username: '', password: '', role: 'student' });
    setShowPassword(false);
    setTimeout(() => setLoginMsg(''), 2000);
  } else {
    setLoginMsg('⚠️ ' + (res.error || 'Could not create account'));
    playSound('wrong');
  }
};

  const handleEditUser = (user) => {
    setEditingUser(user);
    setAdminForm({ username: user.username, password: user.password, role: user.role });
    setLoginMsg('✏️ Editing: ' + user.username);
  };

 const handleDeleteUser = async (userId) => {
  if (window.confirm('Delete this account?')) {
    await apiDeleteUser(userId);
    apiGetUsers().then(data => { if (Array.isArray(data)) setUsers(data); });
    setLoginMsg('🗑️ Account deleted');
    setTimeout(() => setLoginMsg(''), 2000);
  }
};

  const toggleUserPassword = (userId) => {
    setUsersWithPass(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

 const initMathGame = (level) => {
  const questions = levelQuestions[level];
  const q = questions[0];
  const leftVal = q.left;
  const rightVal = q.right;
  const answerVal = rightVal - leftVal;
  const answerStr = answerVal.toString();

  // Randomize which part to hide: left, right, or answer
  const hiddenPart = ['left', 'right', 'answer'][Math.floor(Math.random() * 3)];
  let displayLeft = leftVal, displayRight = rightVal, displayAnswer = answerVal;
  let hiddenValueStr = '';

  if (hiddenPart === 'left') {
    displayLeft = null; hiddenValueStr = leftVal.toString();
  } else if (hiddenPart === 'right') {
    displayRight = null; hiddenValueStr = rightVal.toString();
  } else {
    displayAnswer = null; hiddenValueStr = answerStr;
  }

  const correctDigits = hiddenValueStr.split('').map(Number);
  const distractors = Array.from({ length: 3 }, () => Math.floor(Math.random() * 10));
  const pool = [...correctDigits, ...distractors].sort(() => Math.random() - 0.5);

  setMathState({
    question: q,
    displayLeft, displayRight, displayAnswer,
    hiddenValue: hiddenValueStr,
    blanks: Array(hiddenValueStr.length).fill(null),
    placedIndices: Array(hiddenValueStr.length).fill(null),
    pool,
    isAnswered: false,
    correctCount: 0,
    totalQuestions: questions.length,
    usedIndices: [],
    hiddenPart,
  });
  setCurrentQuestionIndex(0);
  setMathFeedback(null);
  setSelectedPoolNum(null);
  setShowLevelComplete(false);
  setBossBattle({ active: false, mode: null, level: null, challenges: [], answered: {}, results: {}, hp: 5, defeated: false, currentIndex: 0 });
};
const initEnglishGame = (level) => {
const words = englishWords[level];
const word = words[0];
const pool = generateLetterPool(word, 7);
setEnglishState({
word,
blanks: Array(word.length).fill(null),
placedIndices: Array(word.length).fill(null),
pool,
isAnswered: false,
correctCount: 0,
totalQuestions: 5,  // ✅ Fixed: 5 questions like Math
usedIndices: [],
});
setCurrentQuestionIndex(0);
setEnglishFeedback(null);
setSelectedLetter(null);
setShowLevelComplete(false);
setBossBattle({ active: false, mode: null, level: null, challenges: [], answered: {}, results: {}, hp: 5, defeated: false, currentIndex: 0 });
};

  // ── 💡 Spend gold (called by GameHelpHint) ──────────────────────
  const handleSpendGold = (amount) => {
    setGoldCount(prev => Math.max(0, prev - amount));
  };

  // ── 💡 Math Hint: auto-fill all blank digit slots ────────────────
  const handleHintMath = () => {
    if (mathState.isAnswered || hintUsedMath) return;
    setHintUsedMath(true);
    const correctDigits = mathState.hiddenValue.split('').map(Number);
    const usedPoolIndices = [];
    const newPlacedIndices = correctDigits.map((digit) => {
      const idx = mathState.pool.findIndex(
        (p, pi) => p === digit && !usedPoolIndices.includes(pi)
      );
      if (idx >= 0) usedPoolIndices.push(idx);
      return idx >= 0 ? idx : 0;
    });
    setMathState(prev => ({
      ...prev,
      blanks: correctDigits,
      placedIndices: newPlacedIndices,
      usedIndices: newPlacedIndices,
      isAnswered: true,
    }));
    setTimeout(() => {
      setMathFeedback({ type: 'correct', message: '💡 Hint used! Here\'s the answer!' });
      playSound('celebration');
      addConfetti();
      setTimeout(() => {
        setMathFeedback(null);
        if (currentQuestionIndex < mathState.totalQuestions - 1) {
          setCurrentQuestionIndex(prev => prev + 1);
        } else {
          const newCompleted = new Set(completedLevels);
          newCompleted.add(currentLevel);
          setCompletedLevels(newCompleted);
          setShowLevelComplete(true);
          playSound('celebration');
        }
      }, 2000);
    }, 350);
  };

  // ── 💡 Spelling Hint: auto-fill all letter blanks ────────────────
  const handleHintSpelling = () => {
    if (englishState.isAnswered || hintUsedSpelling) return;
    setHintUsedSpelling(true);
    const wordLetters = englishState.word.toUpperCase().split('');
    const usedPoolIndices = [];
    const newPlacedIndices = wordLetters.map((letter) => {
      const idx = englishState.pool.findIndex(
        (p, pi) => p.toUpperCase() === letter && !usedPoolIndices.includes(pi)
      );
      if (idx >= 0) usedPoolIndices.push(idx);
      return idx >= 0 ? idx : 0;
    });
    setEnglishState(prev => ({
      ...prev,
      blanks: wordLetters,
      placedIndices: newPlacedIndices,
      usedIndices: newPlacedIndices,
      isAnswered: true,
    }));
    setTimeout(() => {
      setEnglishFeedback({ type: 'correct', message: `💡 Hint used! The word is "${englishState.word}"!` });
      playSound('celebration');
      addConfetti();
      setTimeout(() => {
        setEnglishFeedback(null);
        if (currentQuestionIndex < englishState.totalQuestions - 1) {
          setCurrentQuestionIndex(prev => prev + 1);
        } else {
          const newCompleted = new Set(completedLevels);
          newCompleted.add(currentLevel);
          setCompletedLevels(newCompleted);
          setShowLevelComplete(true);
          playSound('celebration');
        }
      }, 2000);
    }, 350);
  };

  // ── 💡 Grammar Hint: auto-select correct choice ──────────────────
  const handleHintGrammar = () => {
    if (grammarState.isAnswered || hintUsedGrammar) return;
    setHintUsedGrammar(true);
    const correct = grammarState.correct;
    setGrammarState(prev => ({ ...prev, selectedChoice: correct, isAnswered: true }));
    setEnglishFeedback({ type: 'correct', message: `💡 Hint used! The answer is "${correct}"!` });
    playSound('celebration');
    addConfetti();
    setTimeout(() => {
      setEnglishFeedback(null);
      if (currentQuestionIndex < grammarState.totalQuestions - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
      } else {
        const newCompleted = new Set(completedLevels);
        newCompleted.add(currentLevel);
        setCompletedLevels(newCompleted);
        setShowLevelComplete(true);
        playSound('celebration');
      }
    }, 2200);
  };

  const startGame = (level) => {
    playSound('click');
    setIsTransitioning(true);

    // Let the circle expand to cover the screen (~400ms), then mount the game
    setTimeout(() => {
      setActiveGame(selectedMode);
      // Both subjects share the same level — keep them in sync
      setMathCurrentLevel(level);
      setEnglishCurrentLevel(level);
      setShowModeModal(false);
      if (selectedMode === 'math') {
        initMathGame(level);
      } else {
        initEnglishGame(level);
      }
    }, 400);

    // Hide transition overlay after the full animation completes (1s)
    setTimeout(() => {
      setIsTransitioning(false);
    }, 1000);
  };
  

  const handleContinue = () => {
  setTimeout(() => { 
    setIsInputMode(true);
  }, 300);
}

const handleOkay = () => {
playSound('click');

// 🚫 Block if nickname is empty
if (!nickname.trim()) {
  setNicknameError('⚠️ Please enter a nickname before continuing!');
  playSound('wrong');
  return;
}
setNicknameError('');

// 💾 SAVE NICKNAME TO BACKEND + LOCAL
if (nickname.trim().length > 0 && currentUser) {
  const updatedCurrentUser = { ...currentUser, nickname: nickname.trim() };
  setCurrentUser(updatedCurrentUser);
  localStorage.setItem('brainbee_current_user', JSON.stringify(updatedCurrentUser));
  // Save to backend
  fetch(`http://localhost:5000/api/auth/users/${currentUser.id}/nickname`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('brainbee_token')}`,
    },
    body: JSON.stringify({ nickname: nickname.trim() }),
  }).then(() => {
    apiGetUsers().then(data => {
      if (Array.isArray(data)) setUsers(data);
    });
  });
}

setTimeout(() => {
setCurrentScreen('home');
setIsHomepageBlurred(true);
setShowGreetingOverlay(true);
}, 250);
}

  const dismissGreeting = () => {
    setShowGreetingOverlay(false);
    setIsHomepageBlurred(false);
  };



 const handleModeConfirm = () => {
    playSound('click');
    setShowModeModal(false);
    setIsTransitioning(true);
    
    setTimeout(() => {
        setSelectedMode(pendingSelectedMode);
        // ✅ BUG FIX: Reset question index so the new subject starts fresh
        setCurrentQuestionIndex(0);
        setActiveGame(null);
        setShowLevelComplete(false);
        setIsTransitioning(false);
    }, 1000);
};

  // Greeting Timers
  useEffect(() => {
    if (showGreetingOverlay) {
      const t1 = setTimeout(() => setIsBeeCheerful(true), 2500);
      const t2 = setTimeout(() => {
    setShowGreetingMessage(true);
    setShowOkayBtn(true);
}, 1500);
      const t3 = setTimeout(() => dismissGreeting(), 10000);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }
  }, [showGreetingOverlay]);

// Auto-hide intro screen with fade out
useEffect(() => {
  if (showIntro) {
    const timer = setTimeout(() => {
      const introElement = document.getElementById('introScreen');
      if (introElement) {
        introElement.style.animation = 'introFadeOut 1s ease-in forwards';
      }
      setTimeout(() => {
        setShowIntro(false);
      }, 1000);
    }, 2500);
    
    return () => clearTimeout(timer);
  }
}, [showIntro]);

  // Save mode changes
  useEffect(() => {
    localStorage.setItem('brainbee_gameMode', gameMode);
  }, [gameMode]);

 useEffect(() => {
	if (!audioRef.current) {
		const audio = new Audio('/bgmusic.mp3');
		audio.loop = true;
		audio.volume = 0.3;
		audioRef.current = audio;
	}

	if (currentScreen === 'home' && activeGame === null) {
		if (musicEnabled) {
			audioRef.current.play().catch(err => console.warn('Music play failed:', err));
		} else {
			audioRef.current.pause();
		}
	} else {
		audioRef.current.pause();
	}

	return () => {
	};
}, [currentScreen, musicEnabled, activeGame]);


// Find the useEffect that starts around line 665 and replace it with this fixed version:

useEffect(() => {
let isMounted = true;
const initializeSpeechRecognition = async () => {
try {
console.log('[v0] 📥 Initializing speech recognition...');
  // Try to load Vosk first
  try {
    const testResponse = await fetch('/vosk-model-small-en-us-0.15/conf/mfcc.conf');
    if (testResponse.ok) {
      console.log('[v0] ✅ Model files found, initializing Vosk...');
      const { createModel } = await import('vosk-browser');
      
      const model = await Promise.race([
        createModel('/vosk-model-small-en-us-0.15'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 8000))
      ]);
      
      if (isMounted) {
        setVoskModel(model);
        console.log('[v0] ✅ Vosk model loaded successfully!');
      }
     }
  } catch (voskErr) {
    console.log('[v0] ℹ Vosk model unavailable, using Web Speech API fallback:', voskErr.message);
  }
  
  // Initialize Web Speech API as fallback
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition && isMounted) {
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = language === 'en' ? 'en-US' : 'tl-PH';
    
    // Create the answer processor function
    const processEnglishAnswer = (transcript) => {
      const currentState = englishStateRef.current;
      if (currentState.isAnswered || !transcript) return;
      
      const isCorrect = transcript.toLowerCase() === currentState.word.toLowerCase();
      console.log('[v0] Comparing:', transcript, 'vs', currentState.word, 'Result:', isCorrect);
      
      playSound(isCorrect ? 'correct' : 'wrong');
      if (isCorrect) {
        addConfetti();
        triggerGoldReward();
      }
      
      const newCorrectCount = isCorrect ? currentState.correctCount + 1 : currentState.correctCount;
setEnglishState(prev => ({
  ...prev,
  isAnswered: true,
  correctCount: newCorrectCount,
}));
      
      setEnglishFeedback({
        type: isCorrect ? 'correct' : 'wrong',
        message: isCorrect 
          ? `🎉 Correct! "${currentState.word}" is right!`
          : `❌ Not quite. The word was "${currentState.word}"`
      });
      
      // Auto-advance to next question after feedback display time
      setTimeout(() => {
        if (isMounted) {
          // Check if there are more questions
          const currentIndex = questionIndexRef.current;
          const currentLvl = currentLevel;
          if (currentIndex < currentState.totalQuestions - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setEnglishFeedback(null);
            setEnglishState(prev => ({ ...prev, isAnswered: false }));
          } else {
            // Level complete
            const newCompleted = new Set(completedLevels);
            newCompleted.add(currentLvl);
            setCompletedLevels(newCompleted);
            setShowLevelComplete(true);
            playSound('celebration');
          }
        }
      }, isCorrect ? 2000 : 2500);
    };
    
    recognition.onstart = () => {
      if (isMounted) {
        setIsListening(true);
        console.log('[v0] 🎤 Speech recognition started');
      }
    };
    
    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      transcript = transcript.trim().toLowerCase();
      console.log('[v0] Recognized speech:', transcript);
      
      if (isMounted && activeGame === 'english') {
        processEnglishAnswer(transcript);
      }
    };
    
    recognition.onerror = (event) => {
      console.error('[v0] Speech recognition error:', event.error);
      if (isMounted) {
        setIsListening(false);
        setEnglishFeedback({
          type: 'wrong',
          message: 'Could not understand. Please try again.'
        });
      }
    };
    
    recognition.onend = () => {
      if (isMounted) {
        setIsListening(false);
      }
    };
    
    recognizerRef.current = recognition;
    console.log('[v0] ✅ Web Speech API initialized as fallback');
  }
  
  if (isMounted) {
    setIsVoskLoading(false);
  }
} catch (err) {
  console.error('[v0] ❌ Error initializing speech recognition:', err);
  if (isMounted) {
    setIsVoskLoading(false);
    setEnglishFeedback({
      type: 'wrong',
      message: 'Speech recognition not available on this device.'
    });
  }
}
};
initializeSpeechRecognition();
return () => {
isMounted = false;
if (recognizerRef.current) {
recognizerRef.current.abort?.();
recognizerRef.current.free?.();
}
};
}, [language, activeGame]); // Removed englishState from dependencies

const handleReadingResult = (transcript) => {
  const currentState = englishStateRef.current;
  if (currentState.isAnswered) return;

  const target = currentState.word.toLowerCase();
  const normalizedTranscript = transcript.replace(/[^a-z\s]/g, '').trim();
  const normalizedTarget = target.replace(/[^a-z\s]/g, '').trim();

  setEnglishState(prev => ({ ...prev, isAnswered: true }));

  if (normalizedTranscript === normalizedTarget || normalizedTranscript.includes(normalizedTarget)) {
    setEnglishFeedback({ type: 'correct', message: `🎉 Perfect! You said "${currentState.word}" right!` });
    playSound('celebration');
    addConfetti();
    triggerGoldReward();
    setEnglishState(prev => ({ ...prev, correctCount: prev.correctCount + 1 }));
  } else {
    setEnglishFeedback({ type: 'wrong', message: `💪 The word was "${currentState.word}". You said: "${transcript}"` });
    playSound('wrong');
  }

  setTimeout(() => {
    setEnglishFeedback(null);
    setEnglishState(prev => ({ ...prev, isAnswered: false, blanks: Array(prev.word.length).fill(null), usedIndices: [] }));
    const currentIndex = questionIndexRef.current;
    if (currentIndex < currentState.totalQuestions - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      const newCompleted = new Set(completedLevels);
      newCompleted.add(currentLevel);
      setCompletedLevels(newCompleted);
      setShowLevelComplete(true);
      playSound('celebration');
    }
  }, 2500);
};

// 🎙️ Web Speech API Listener (Vosk offline disabled for web build)
const startOfflineListening = async () => {
  console.log("🌐 Web Speech API handles listening automatically via UI.");
  // Vosk functions removed to prevent ESLint 'no-undef' errors.
  // The Web Speech API is already initialized in the useEffect.
};

// 🎙️ Stop Web Listener
const stopOfflineListening = async () => {
  console.log("🌐 Web Speech API stops listening automatically.");
  // Vosk processing removed for web build.
};

// Find this useEffect (around line 665-730) and replace it with:

useEffect(() => {
  // 🚫 SKIP if in practice mode - practice questions are loaded manually
  if (gameMode === 'practice') return;
  
  if (activeGame && !showLevelComplete) {
    if (activeGame === 'math') {
      const questions = levelQuestions[currentLevel];
      if (currentQuestionIndex < questions.length) {
        const q = questions[currentQuestionIndex];
        const leftVal = q.left;
        const rightVal = q.right;
        const answerVal = rightVal - leftVal;
        const answerStr = answerVal.toString();
        
        const hiddenPart = ['left', 'right', 'answer'][Math.floor(Math.random() * 3)];
        let displayLeft = leftVal, displayRight = rightVal, displayAnswer = answerVal;
        let hiddenValueStr = '';

        if (hiddenPart === 'left') { displayLeft = null; hiddenValueStr = leftVal.toString(); }
        else if (hiddenPart === 'right') { displayRight = null; hiddenValueStr = rightVal.toString(); }
        else { displayAnswer = null; hiddenValueStr = answerStr; }

        const correctDigits = hiddenValueStr.split('').map(Number);
        const distractors = Array.from({ length: 3 }, () => Math.floor(Math.random() * 10));
        const pool = [...correctDigits, ...distractors].sort(() => Math.random() - 0.5);

        setMathState(prev => ({
          ...prev,
          question: q,
          displayLeft, displayRight, displayAnswer,
          hiddenValue: hiddenValueStr,
          blanks: Array(hiddenValueStr.length).fill(null),
          placedIndices: Array(hiddenValueStr.length).fill(null),
          pool,
          isAnswered: false,
          usedIndices: [],
          hiddenPart,
        }));
        setSelectedPoolNum(null);
        setMathFeedback(null);
      }
    } else if (activeGame === 'english') {
const words = englishWords[currentLevel];
if (currentQuestionIndex < 5) {  // ✅ Only 5 questions
const word = words[currentQuestionIndex];
        const pool = generateLetterPool(word, 7);
        setEnglishState(prev => ({
          ...prev,
          word,
          blanks: Array(word.length).fill(null),
          placedIndices: Array(word.length).fill(null),
          pool,
          isAnswered: false,
          usedIndices: []
        }));
        setSelectedLetter(null);
        setEnglishFeedback(null);
        if (currentLevel === 1 && currentQuestionIndex === 1) {
          setEnglishGameStyle('reading');
        } else {
          setEnglishGameStyle('spelling');
        }
      }
    }
  }
}, [currentQuestionIndex, activeGame, currentLevel, showLevelComplete, gameMode]); // Added gameMode to dependencies

  // Math Game Handlers - Support both Desktop Drag and Mobile Touch
  const handleDragStart = (e, num, index) => {
    e.dataTransfer.setData("text/plain", JSON.stringify({ value: num, index: index }));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e, index) => {
    e.preventDefault();
    const data = JSON.parse(e.dataTransfer.getData("text/plain"));
    const itemValue = data.value;
    const sourceIndex = data.index;

    if (activeGame === 'math') {
      if (mathState.isAnswered) return;
      if (itemValue && mathState.blanks[index] === null) {
        updateMathBlank(index, Number(itemValue), sourceIndex);
        playSound('click');
      }
    } else if (activeGame === 'english') {
      if (englishState.isAnswered) return;
      if (itemValue && englishState.blanks[index] === null) {
        updateEnglishBlank(index, itemValue, sourceIndex);
        playSound('click');
      }
    }
  };

  const handlePoolClick = (item, index) => {
    playSound('click');
    speakWord(item);
    if (activeGame === 'math') {
      setSelectedPoolNum(selectedPoolNum?.index === index ? null : { value: item, index: index });
    } else {
      setSelectedLetter(selectedLetter?.index === index ? null : { value: item, index: index });
    }
  };

  const handleBlankClick = (index) => {
  if (activeGame === 'math') {
    if (mathState.isAnswered) return;
    
    // 🔄 UNDO: If blank is already filled, remove it & return to pool
    if (mathState.blanks[index] !== null) {
      const newBlanks = [...mathState.blanks];
      newBlanks[index] = null;
      
      const poolIdxToRelease = mathState.placedIndices[index];
      const newUsedIndices = mathState.usedIndices.filter(i => i !== poolIdxToRelease);
      const newPlacedIndices = [...mathState.placedIndices];
      newPlacedIndices[index] = null;
      
      setMathState(prev => ({
        ...prev,
        blanks: newBlanks,
        usedIndices: newUsedIndices,
        placedIndices: newPlacedIndices
      }));
      playSound('click');
      return;
    }

    if (selectedPoolNum !== null && mathState.blanks[index] === null) {
      updateMathBlank(index, selectedPoolNum.value, selectedPoolNum.index);
      setSelectedPoolNum(null);
    }
  } else if (activeGame === 'english') {
    if (englishState.isAnswered) return;
    
    // 🔄 UNDO: If blank is already filled, remove it & return to pool
    if (englishState.blanks[index] !== null) {
      const newBlanks = [...englishState.blanks];
      newBlanks[index] = null;
      
      const poolIdxToRelease = englishState.placedIndices[index];
      const newUsedIndices = englishState.usedIndices.filter(i => i !== poolIdxToRelease);
      const newPlacedIndices = [...englishState.placedIndices];
      newPlacedIndices[index] = null;
      
      setEnglishState(prev => ({
        ...prev,
        blanks: newBlanks,
        usedIndices: newUsedIndices,
        placedIndices: newPlacedIndices
      }));
      playSound('click');
      return;
    }

    if (selectedLetter !== null && englishState.blanks[index] === null) {
      updateEnglishBlank(index, selectedLetter.value, selectedLetter.index);
      setSelectedLetter(null);
    }
  }
};

  const addConfetti = () => {
  const newConfetti = [];
  for (let i = 0; i < 50; i++) {
    newConfetti.push({
      id: Date.now() + i,
      left: Math.random() * 100,
      top: -10 - Math.random() * 20,
      delay: Math.random() * 0.5,
      size: 8 + Math.random() * 10,
      color: ['#FF6B6B', '#4ECDC4', '#FFD166', '#95E1D3', '#AA96DA', '#FF9A9E', '#FECFEF'][Math.floor(Math.random() * 7)]
    });
  }
  setConfetti(newConfetti);
  setTimeout(() => setConfetti([]), 3000);
};
  const triggerGoldReward = () => {
  const newGolds = [1, 2, 3, 4, 5].map(i => Date.now() + i);
  setFlyingGolds(prev => [...prev, ...newGolds]);
  setGoldCount(prev => prev + 5);

  // Badge rank-up uses total combined stars — shared across both subjects
  if (activeGame === 'math') {
    const prevBadge = getBadgeInfo(mathStars + englishStars, 'math');
    const newBadge  = getBadgeInfo(mathStars + englishStars + 1, 'math');
    setMathStars(prev => prev + 1);
    if (newBadge.currentBadgeIndex > prevBadge.currentBadgeIndex) {
      setTimeout(() => setShowRankUp(newBadge.currentBadge), 400);
    }
  } else if (activeGame === 'english') {
    const prevBadge = getBadgeInfo(mathStars + englishStars, 'math');
    const newBadge  = getBadgeInfo(mathStars + englishStars + 1, 'math');
    setEnglishStars(prev => prev + 1);
    if (newBadge.currentBadgeIndex > prevBadge.currentBadgeIndex) {
      setTimeout(() => setShowRankUp(newBadge.currentBadge), 400);
    }
  }

  setTimeout(() => {
    setFlyingGolds(prev => prev.filter(id => !newGolds.includes(id)));
  }, 1100);
};

const updateMathBlank = (index, num, sourceIndex) => {
  const newBlanks = [...mathState.blanks];
  newBlanks[index] = num;
  const newPlacedIndices = [...(mathState.placedIndices || Array(mathState.blanks.length).fill(null))];
  newPlacedIndices[index] = sourceIndex;
  
  setMathState(prev => ({
    ...prev,
    blanks: newBlanks,
    usedIndices: [...prev.usedIndices, sourceIndex],
    placedIndices: newPlacedIndices
  }));
  
  if (newBlanks.every(b => b !== null)) {
    const formedNum = newBlanks.join('');
    const target = mathState.hiddenValue; // 🔹 Dynamic target matches hidden part
    setMathState(prev => ({ ...prev, isAnswered: true }));
    
    if (formedNum === target) {
      const newCorrectCount = mathState.correctCount + 1;
      setMathFeedback({ type: 'correct', message: '🎉 Amazing Job! You got it right!' });
      playSound('celebration');
      addConfetti();
      triggerGoldReward();
      setMathState(prev => ({ ...prev, correctCount: newCorrectCount }));
      setTimeout(() => {
        setMathFeedback(null);
        if (currentQuestionIndex < mathState.totalQuestions - 1) {
          setCurrentQuestionIndex(prev => prev + 1);
        } else {
          const newCompleted = new Set(completedLevels);
          newCompleted.add(currentLevel);
          setCompletedLevels(newCompleted);
          setShowLevelComplete(true);
          playSound('celebration');
        }
      }, 2000);
    } else {
      setMathFeedback({ type: 'wrong', message: `💪 Oops! The correct number is ${target}.` });
      playSound('wrong');
      setTimeout(() => {
        setMathFeedback(null);
        if (currentQuestionIndex < mathState.totalQuestions - 1) {
          setCurrentQuestionIndex(prev => prev + 1);
        } else {
          const newCompleted = new Set(completedLevels);
          newCompleted.add(currentLevel);
          setCompletedLevels(newCompleted);
          setShowLevelComplete(true);
          playSound('celebration');
        }
      }, 2500);
    }
  }
};

const updateEnglishBlank = (index, letter, sourceIndex) => {
  const newBlanks = [...englishState.blanks];
  newBlanks[index] = letter.toUpperCase();
  playSound(`letter_${letter.toLowerCase()}`);
  const newPlacedIndices = [...(englishState.placedIndices || Array(englishState.blanks.length).fill(null))];
  newPlacedIndices[index] = sourceIndex; // 🔹 Track which pool index is here
  
  setEnglishState(prev => ({
    ...prev,
    blanks: newBlanks,
    usedIndices: [...prev.usedIndices, sourceIndex],
    placedIndices: newPlacedIndices
  }));
  
  if (newBlanks.every(b => b !== null)) {
const formedWord = newBlanks.join('').toLowerCase();
const target = englishState.word.toLowerCase();
setEnglishState(prev => ({ ...prev, isAnswered: true }));
if (formedWord === target) {
      const newCorrectCount = englishState.correctCount + 1;
      setEnglishFeedback({ type: 'correct', message: `🎉 Great Spelling! "${target}" is correct!` });
      playSound('celebration');
      addConfetti();
      triggerGoldReward();
      setEnglishState(prev => ({ ...prev, correctCount: newCorrectCount }));
      setTimeout(() => {
        setEnglishFeedback(null);
        if (currentQuestionIndex < englishState.totalQuestions - 1) {
          setCurrentQuestionIndex(prev => prev + 1);
        } else {
          const newCompleted = new Set(completedLevels);
          newCompleted.add(currentLevel);
          setCompletedLevels(newCompleted);
          setShowLevelComplete(true);
          playSound('celebration');
        }
      }, 2000);
    } else {
      setEnglishFeedback({ type: 'wrong', message: `💪 Try again! The word is "${target}"` });
      playSound('wrong');
      setTimeout(() => {
        setEnglishFeedback(null);
        if (currentQuestionIndex < englishState.totalQuestions - 1) {
          setCurrentQuestionIndex(prev => prev + 1);
        } else {
          const newCompleted = new Set(completedLevels);
          newCompleted.add(currentLevel);
          setCompletedLevels(newCompleted);
          setShowLevelComplete(true);
          playSound('celebration');
        }
      }, 2500);
    }
  }
};


// ═══════════════════════════════════════════════════════════
// 🔍 WORD SEARCH GENERATOR (inside App for closure access)
// ═══════════════════════════════════════════════════════════
const generateWordSearchGrid = (words) => {
  const SIZE = 10;
  const grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(''));
  const placed = [];

  const DIRS = [
    [0, 1], [1, 0], [1, 1], [0, -1], [-1, 0], [1, -1],
  ];

  const canPlace = (word, r, c, dr, dc) => {
    for (let i = 0; i < word.length; i++) {
      const nr = r + dr * i, nc = c + dc * i;
      if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) return false;
      if (grid[nr][nc] !== '' && grid[nr][nc] !== word[i]) return false;
    }
    return true;
  };

  const placeWord = (word) => {
    const upper = word.toUpperCase();
    const shuffledDirs = [...DIRS].sort(() => Math.random() - 0.5);
    for (let attempt = 0; attempt < 100; attempt++) {
      const [dr, dc] = shuffledDirs[attempt % shuffledDirs.length];
      const r = Math.floor(Math.random() * SIZE);
      const c = Math.floor(Math.random() * SIZE);
      if (canPlace(upper, r, c, dr, dc)) {
        const cells = [];
        for (let i = 0; i < upper.length; i++) {
          grid[r + dr * i][c + dc * i] = upper[i];
          cells.push({ r: r + dr * i, c: c + dc * i });
        }
        placed.push({ word: upper, cells });
        return true;
      }
    }
    return false;
  };

  const sorted = [...words].sort((a, b) => b.length - a.length);
  sorted.forEach(w => placeWord(w));

  const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      if (grid[r][c] === '') grid[r][c] = alpha[Math.floor(Math.random() * 26)];

  return { grid, placed };
};

const getLineCells = (start, end) => {
  if (!start || !end) return [];
  const dr = Math.sign(end.r - start.r);
  const dc = Math.sign(end.c - start.c);
  const rowDiff = Math.abs(end.r - start.r);
  const colDiff = Math.abs(end.c - start.c);
  if (rowDiff !== 0 && colDiff !== 0 && rowDiff !== colDiff) return [];
  const cells = [];
  let r = start.r, c = start.c;
  const steps = Math.max(rowDiff, colDiff);
  for (let i = 0; i <= steps; i++) {
    cells.push({ r, c });
    r += dr; c += dc;
  }
  return cells;
};

const cellKey = (r, c) => `${r}-${c}`;

const makeBossOptions = (correct, pool = []) => {
  const values = [correct, ...pool].filter(v => v !== undefined && v !== null);
  const unique = [...new Set(values.map(v => String(v)))].slice(0, 4);
  while (unique.length < 4) {
    const next = String(Number(correct) + unique.length + Math.ceil(Math.random() * 5));
    if (!unique.includes(next)) unique.push(next);
  }
  return unique.sort(() => Math.random() - 0.5);
};

const generateBossChallenges = (mode, level) => {
  if (mode === 'math') {
    const questions = levelQuestions[level] || [];
    return questions.slice(0, 5).map((q, index) => ({
      id: `math-boss-${level}-${index}`,
      prompt: `${q.left} + ${q.answer} = ?`,
      correct: String(q.right),
      options: makeBossOptions(q.right, [q.right + 1, Math.max(0, q.right - 1), q.left + q.answer + 2]),
    }));
  }

  const words = englishWords[level] || englishWords[1] || [];
  return words.slice(0, 5).map((word, index) => {
    const options = makeBossOptions(word, words.filter(w => w !== word).slice(index, index + 4));
    return {
      id: `english-boss-${level}-${index}`,
      prompt: `Choose the word: ${word.toUpperCase()}`,
      correct: word,
      options,
    };
  });
};

const isBossQuestion = () => {
  if (!activeGame) return false;
  if (gameMode === 'adventure') {
    const totalQ = activeGame === 'math' ? mathState.totalQuestions : englishState.totalQuestions;
    return currentQuestionIndex === totalQ - 1;
  }
  if (gameMode === 'practice') {
    const subjectQuestions = practiceQuestions.filter(q => q.subject === selectedMode);
    const currentQ = subjectQuestions[currentQuestionIndex];
    return currentQ?.style === 'boss_battle';
  }
  return false;
};

useEffect(() => {
  // Practice mode boss battles are fully managed by loadPracticeQuestion — skip here
  if (gameMode === 'practice') return;
  if (!isBossQuestion()) return;
  if (bossBattle.active && bossBattle.mode === activeGame && bossBattle.level === currentLevel) return;
  if (showBossIntroModal) return;
  // Adventure mode: generate generic challenges and show intro modal
  const challenges = generateBossChallenges(activeGame, currentLevel);
  setPendingBossChallenges(challenges);
  pendingPracticeBossRef.current = null;
  setShowBossIntroModal(true);
}, [activeGame, currentLevel, currentQuestionIndex, gameMode]);

const startBossFromModal = () => {
  setShowBossIntroModal(false);

  // If this was triggered from a practice boss_battle question, restore the
  // full pre-built state (which includes isWordSearch, wordSearchGrid, etc.)
  if (pendingPracticeBossRef.current) {
    setBossBattle(pendingPracticeBossRef.current);
    pendingPracticeBossRef.current = null;
  } else {
    // Adventure mode boss — use the generically generated challenges
    setBossBattle({
      active: true,
      mode: activeGame,
      level: currentLevel,
      challenges: pendingBossChallenges,
      answered: {},
      results: {},
      hp: 5,
      defeated: false,
      currentIndex: 0,
    });
  }

  // Start boss music
  if (!bossAudioRef.current) {
    bossAudioRef.current = new Audio('/boss/bossbackground.mp3');
    bossAudioRef.current.loop = true;
    bossAudioRef.current.volume = 0.45;
  }
  bossAudioRef.current.currentTime = 0;
  bossAudioRef.current.play().catch(err => console.warn('Boss music failed:', err));
};

const stopBossMusic = () => {
  if (bossAudioRef.current) {
    bossAudioRef.current.pause();
    bossAudioRef.current.currentTime = 0;
  }
};

const completeBossBattle = () => {
  stopBossMusic();
  setBossBattle(prev => ({ ...prev, defeated: true, hp: 0 }));
  addConfetti();
  playSound('celebration');

  if (bossBattle.isPractice) {
    // Track boss score
    setPracticeBossScore(prev => ({
      correct: prev.correct + Object.values(bossBattle.results).filter(r => r === true).length,
      total: prev.total + bossBattle.challenges.length,
    }));
    const subjectQuestions = practiceQuestions.filter(q => q.subject === selectedMode);
    setTimeout(() => {
      if (currentQuestionIndex < subjectQuestions.length - 1) {
        setBossBattle({ active: false, mode: null, level: null, challenges: [], answered: {}, results: {}, hp: 5, defeated: false, currentIndex: 0 });
        setCurrentQuestionIndex(prev => prev + 1);
      } else {
        const newCompleted = new Set(completedLevels);
        newCompleted.add(currentLevel);
        setCompletedLevels(newCompleted);
        setShowLevelComplete(true);
      }
    }, 1500);
  } else {
    const newCompleted = new Set(completedLevels);
          newCompleted.add(currentLevel);
          setCompletedLevels(newCompleted);
          if (gameMode === 'practice') {
            setPracticeRegularScore(prev => ({
              correct: prev.correct + (activeGame === 'math' ? mathState.correctCount : englishState.correctCount),
              total: prev.total + (activeGame === 'math' ? mathState.totalQuestions : englishState.totalQuestions),
            }));
          }
          setShowLevelComplete(true);
          playSound('celebration');
  }
};

const handleBossAnswer = (option) => {
  const challengeIndex = bossBattle.currentIndex;
  if (!bossBattle.active || bossBattle.defeated || bossBattle.answered[challengeIndex]) return;
  const challenge = bossBattle.challenges[challengeIndex];
  const isCorrect = String(option).toLowerCase() === String(challenge.correct).toLowerCase();

  if (!isCorrect) {
    setBossBattle(prev => ({ ...prev, results: { ...prev.results, [challengeIndex]: 'wrong' } }));
    activeGame === 'math'
      ? setMathFeedback({ type: 'wrong', message: '🐝 Dodge the sting! Try that mini-challenge again!' })
      : setEnglishFeedback({ type: 'wrong', message: '🐝 Almost! Try that mini-challenge again!' });
    playSound('wrong');
    setTimeout(() => {
      activeGame === 'math' ? setMathFeedback(null) : setEnglishFeedback(null);
      setBossBattle(prev => ({ ...prev, results: { ...prev.results, [challengeIndex]: null } }));
    }, 1200);
    return;
  }

  // ✅ Correct — trigger hit animation
  setBossHit(true);
  setTimeout(() => setBossHit(false), 700);

  const nextAnswered = { ...bossBattle.answered, [challengeIndex]: true };
  const defeatedCount = Object.values(nextAnswered).filter(Boolean).length;
  const nextHp = Math.max(0, 5 - defeatedCount);
  const nextIndex = challengeIndex + 1;

  setBossBattle(prev => ({
    ...prev,
    answered: nextAnswered,
    results: { ...prev.results, [challengeIndex]: 'correct' },
    hp: nextHp,
    currentIndex: nextIndex,
  }));
  triggerGoldReward();
  addConfetti();
  playSound(nextHp === 0 ? 'celebration' : 'correct');

  if (defeatedCount >= 5) {
    activeGame === 'math'
      ? setMathState(prev => ({ ...prev, correctCount: Math.min(prev.totalQuestions, prev.correctCount + 1), isAnswered: true }))
      : setEnglishState(prev => ({ ...prev, correctCount: Math.min(prev.totalQuestions, prev.correctCount + 1), isAnswered: true }));
    setTimeout(completeBossBattle, 1300);
  }
};

const renderBossBattle = () => {
  const hpPercent = Math.max(0, (bossBattle.hp / 5) * 100);
  const ci = bossBattle.currentIndex;
  const challenge = bossBattle.challenges[ci];
  const isWrong = bossBattle.results[ci] === 'wrong';

  return (
    <div className="boss-battle-stage">
      {/* ── Boss GIF + health bar (no label) ── */}
      <div className={`bee-boss-wrap ${bossBattle.hp <= 2 ? 'angry' : ''} ${bossBattle.defeated ? 'defeated' : ''}`}>
        <div className="boss-health-bar" aria-label={`Boss life ${bossBattle.hp} out of 5`}>
          <div className="boss-health-fill" style={{ width: `${hpPercent}%` }}></div>
        </div>
        <img
          src="boss/bossbee.gif"
          alt="Boss Bee"
          className={`boss-bee-gif ${bossHit ? 'boss-hit' : ''} ${bossBattle.defeated ? 'boss-defeated' : ''}`}
        />
      </div>

      {/* ── Question panel ── */}
      <div className="boss-question-panel">
        {bossBattle.defeated ? (
          <div className="boss-victory-msg">🎉 You defeated the Queen Bee! Amazing!</div>
        ) : challenge ? (
          <div className={`boss-single-card ${isWrong ? 'wrong' : ''}`}>
            <div className="boss-single-number">Question {ci + 1} of 5</div>

            {/* Drop zone — drag an answer onto the boss prompt */}
            <div
              className={`boss-drop-zone ${draggedBossOption !== null ? 'drag-over-ready' : ''}`}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                if (draggedBossOption !== null) {
                  handleBossAnswer(draggedBossOption);
                  setDraggedBossOption(null);
                }
              }}
            >
              <p className="boss-single-prompt">{challenge.prompt}</p>
              {draggedBossOption !== null && (
                <div className="boss-drop-hint">Drop here! 🎯</div>
              )}
            </div>

            {/* Options — tap OR drag */}
            <div className="boss-option-grid">
              {challenge.options.map(option => (
                <button
                  key={option}
                  draggable={!bossBattle.answered[ci] && !bossBattle.defeated}
                  className={`boss-option-btn ${bossBattle.results[ci] === 'correct' ? 'correct' : ''} ${draggedBossOption === option ? 'dragging' : ''}`}
                  disabled={bossBattle.answered[ci] || bossBattle.defeated}
                  onDragStart={() => setDraggedBossOption(option)}
                  onDragEnd={() => setDraggedBossOption(null)}
                  onTouchStart={() => setDraggedBossOption(option)}
                  onTouchEnd={() => {
                    handleBossAnswer(option);
                    setDraggedBossOption(null);
                  }}
                  onClick={() => handleBossAnswer(option)}
                >
                  {String(option).toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* Progress dots */}
        <div className="boss-progress-dots">
          {bossBattle.challenges.map((_, i) => (
            <span
              key={i}
              className={`boss-dot ${bossBattle.answered[i] ? 'done' : i === ci ? 'active' : ''}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// 🔍 WORD SEARCH BOSS BATTLE RENDERER (English Practice)
// ═══════════════════════════════════════════════════════════
const renderWordSearchBattle = () => {
  const grid = bossBattle.wordSearchGrid;
  const words = bossBattle.wordSearchWords || [];
  const placed = bossBattle.wordSearchPlaced || [];
  const hpPercent = Math.max(0, (bossBattle.hp / 5) * 100);

  if (!grid) return null;

  // Collect all found cells with their color index
  const foundCellColors = {};
  wsFoundWords.forEach((fw, colorIdx) => {
    const entry = placed.find(p => p.word === fw);
    if (entry) entry.cells.forEach(({ r, c }) => {
      foundCellColors[cellKey(r, c)] = colorIdx;
    });
  });

  // Cells currently being highlighted during drag
  const highlightSet = new Set(wsHighlight.map(({ r, c }) => cellKey(r, c)));

  const WORD_COLORS = ['#FF6B6B','#4ECDC4','#FFD166','#95E1D3','#AA96DA'];

  const handleCellPointerDown = (r, c, e) => {
    e.preventDefault();
    if (bossBattle.defeated) return;
    setWsSelecting(true);
    setWsStart({ r, c });
    setWsEnd({ r, c });
    setWsHighlight([{ r, c }]);
  };

  const handleCellPointerEnter = (r, c) => {
    if (!wsSelecting || bossBattle.defeated) return;
    setWsEnd({ r, c });
    const cells = getLineCells(wsStart, { r, c });
    setWsHighlight(cells);
  };

  const handlePointerUp = () => {
    if (!wsSelecting || !wsStart || !wsEnd || bossBattle.defeated) {
      setWsSelecting(false); return;
    }
    setWsSelecting(false);
    const cells = getLineCells(wsStart, wsEnd);
    const formed = cells.map(({ r, c }) => grid[r][c]).join('');
    const formedRev = formed.split('').reverse().join('');

    const matched = words.find(w => !wsFoundWords.includes(w) && (w === formed || w === formedRev));
    if (matched) {
      const newFound = [...wsFoundWords, matched];
      setWsFoundWords(newFound);
      playSound('correct');
      addConfetti();
      triggerGoldReward();
      setBossHit(true);
      setTimeout(() => setBossHit(false), 700);

      const newHp = Math.max(0, 5 - newFound.length);
      setBossBattle(prev => ({ ...prev, hp: newHp }));

      if (newFound.length >= words.length) {
        setEnglishState(prev => ({ ...prev, correctCount: Math.min(prev.totalQuestions, prev.correctCount + 1), isAnswered: true }));
        setTimeout(completeBossBattle, 1200);
      }
    } else {
      playSound('wrong');
    }
    setWsHighlight([]);
    setWsStart(null);
    setWsEnd(null);
  };

  return (
    <div className="boss-battle-stage ws-battle-stage" onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}>
      {/* ── Boss + HP ── */}
      <div className={`bee-boss-wrap ${bossBattle.hp <= 2 ? 'angry' : ''} ${bossBattle.defeated ? 'defeated' : ''}`}>
        <div className="boss-health-bar">
          <div className="boss-health-fill" style={{ width: `${hpPercent}%` }} />
        </div>
        <img src="boss/bossbee.gif" alt="Boss Bee"
          className={`boss-bee-gif ${bossHit ? 'boss-hit' : ''} ${bossBattle.defeated ? 'boss-defeated' : ''}`}
        />
      </div>

      {bossBattle.defeated ? (
        <div className="boss-victory-msg">🎉 You found all the words! Amazing!</div>
      ) : (
        <div className="ws-layout">
          {/* Word list */}
          <div className="ws-word-list">
            <div className="ws-word-list-title">🔍 Find these words:</div>
            {words.map((w, i) => (
              <div key={w} className={`ws-word-item ${wsFoundWords.includes(w) ? 'ws-found' : ''}`}
                style={wsFoundWords.includes(w) ? { color: WORD_COLORS[i % WORD_COLORS.length] } : {}}>
                {wsFoundWords.includes(w) ? '✅' : '🔲'} {w}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="ws-grid" style={{ gridTemplateColumns: `repeat(${grid[0].length}, 1fr)` }}>
            {grid.map((row, r) =>
              row.map((letter, c) => {
                const key = cellKey(r, c);
                const foundColorIdx = foundCellColors[key] !== undefined ? foundCellColors[key] : -1;
                const isHighlighted = highlightSet.has(key);
                const bgColor = isHighlighted
                  ? 'rgba(255,209,0,0.65)'
                  : foundColorIdx >= 0
                    ? WORD_COLORS[foundColorIdx % WORD_COLORS.length] + '55'
                    : '';
                const borderColor = isHighlighted
                  ? '#FFD700'
                  : foundColorIdx >= 0
                    ? WORD_COLORS[foundColorIdx % WORD_COLORS.length]
                    : 'transparent';
                return (
                  <div
                    key={key}
                    className={`ws-cell ${isHighlighted ? 'ws-sel' : ''} ${foundColorIdx >= 0 ? 'ws-done' : ''}`}
                    style={{ background: bgColor, borderColor }}
                    onPointerDown={e => handleCellPointerDown(r, c, e)}
                    onPointerEnter={() => handleCellPointerEnter(r, c)}
                  >
                    {letter}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Progress dots */}
      <div className="boss-progress-dots" style={{ marginTop: '8px' }}>
        {words.map((w, i) => (
          <span key={w} className={`boss-dot ${wsFoundWords.includes(w) ? 'done' : ''}`} />
        ))}
      </div>
    </div>
  );
};

  const handleBuyAvatar = (avatarId) => {
    const av = getAvatarById(avatarId);
    if (!av || ownedAvatars.includes(avatarId)) return;
    if (goldCount < av.price) return;
    setGoldCount(prev => prev - av.price);
    setOwnedAvatars(prev => [...prev, avatarId]);
  };

  const handleEquipAvatar = (avatarId) => {
    if (!ownedAvatars.includes(avatarId)) return;
    setEquippedAvatar(avatarId);
  };

 const saveGameScore = () => {
  const correctCount = activeGame === 'math' ? mathState.correctCount : englishState.correctCount;
  const totalQuestions = activeGame === 'math' ? mathState.totalQuestions : englishState.totalQuestions;
  const correctPercentage = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;
  const starsGained = correctCount > 0 ? Math.ceil((correctCount / totalQuestions) * 3) : 0;
  const goldGained = correctCount * 5;
  const expGained = correctCount * 10;
  const gameRecord = {
    id: Date.now(),
    mode: activeGame,
    level: currentLevel,
    correctCount,
    totalQuestions,
    correctPercentage,
    starsGained,
    goldGained,
    expGained,
    timestamp: new Date().toISOString(),
  };
  setGameHistory(prev => {
    const updated = [...prev, gameRecord];
    console.log('📊 Game History Updated:', updated);
    return updated;
  });
  // Save to backend
  apiSaveHistory({
    game_mode: gameMode,
    subject: gameRecord.mode,
    level: gameRecord.level,
    correct_count: gameRecord.correctCount,
    total_questions: gameRecord.totalQuestions,
  });

  if (selectedMode === 'math') {
    setMathStreak(prev => correctCount === totalQuestions ? prev + 1 : 0);
  } else {
    setEnglishStreak(prev => correctCount === totalQuestions ? prev + 1 : 0);
  }
};

  const proceedToNextLevel = () => {
    playSound('unlock');
    saveGameScore();
    setShowLevelComplete(false);
    const nextLevel = currentLevel + 1;
    if (nextLevel <= 50) {
      // Both subjects share the same level — keep them in sync
      setMathCurrentLevel(nextLevel);
      setEnglishCurrentLevel(nextLevel);
      setCurrentQuestionIndex(0);
      setIsAvatarJumping(true);
      playSound('jump');
      setTimeout(() => { setIsAvatarJumping(false); }, 1500);
      if (selectedMode === 'math') {
        initMathGame(nextLevel);
      } else {
        initEnglishGame(nextLevel);
      }
    }
  };

  const goBackToHome = () => {
  playSound('click');
  stopBossMusic();
  setShowBossIntroModal(false);
  // 💾 Save score if exiting from Level Complete screen
  if (showLevelComplete && activeGame) {
    saveGameScore();
  }
  setActiveGame(null);
  setShowLevelComplete(false);
  setIsAvatarJumping(false);
};

  const retryLevel = () => {
    playSound('click');
    saveGameScore();
    setShowLevelComplete(false);
    setCurrentQuestionIndex(0);
    if (selectedMode === 'math') {
      initMathGame(currentLevel);
    } else {
      initEnglishGame(currentLevel);
    }
  };

  const isLevelUnlocked = (level) => {
    return level === 1 || completedLevels.has(level - 1);
  };

// 🆕 Calculate Badge Info to pass to Profile
const currentStars = selectedMode === 'math' ? mathStars : englishStars;
// Level and badge are shared across both subjects — based on total combined stars
const totalCombinedStars = mathStars + englishStars;
const currentBadgeInfo = getBadgeInfo(totalCombinedStars, 'math');
// Shared level = highest of the two (kept in sync on level-up, so they should match)
const sharedLevel = Math.max(mathCurrentLevel, englishCurrentLevel);

return (
    <div className="app">

      {!showIntro && !isLoggedIn && (() => {
        const isAdminTyped = loginForm.username.toLowerCase() === 'admin';
        return (
          <>
          <div className={`auth-screen ${isAdminTyped ? 'auth-screen--admin' : ''}`}>
            <div className="auth-bg-shapes">
              {isAdminTyped
                ? <><span>👑</span><span>⭐</span><span>👑</span></>
                : <><span>⭐</span><span>☁️</span><span>✨</span></>}
            </div>
            <div className={`auth-card ${isAdminTyped ? 'auth-card--admin' : ''}`}>

              {/* Crown — drops in when admin is detected */}
              {isAdminTyped && (
                <div className="auth-admin-crown" aria-hidden="true">👑</div>
              )}

              <h2 className="auth-title">
                {isAdminTyped ? '👑 Admin Access' : '🐝 Welcome to Brain Bee!'}
              </h2>
              <p className={`auth-subtitle ${isAdminTyped ? 'auth-subtitle--admin' : ''}`}>
                {isAdminTyped ? 'Elevated credentials required' : 'Please log in to continue'}
              </p>

              {loginMsg && <div className="auth-msg">{loginMsg}</div>}

              <form className="auth-form" onSubmit={e => { e.preventDefault(); handleLogin(); }}>
                <input
                  type="text"
                  placeholder="Username"
                  className={`auth-input ${isAdminTyped ? 'auth-input--admin' : ''}`}
                  value={loginForm.username}
                  onChange={e => setLoginForm({ ...loginForm, username: e.target.value })}
                  autoComplete="off"
                />
                <div className="auth-pw-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    className={`auth-input ${isAdminTyped ? 'auth-input--admin' : ''}`}
                    value={loginForm.password}
                    onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                  />
                  <button
                    type="button"
                    className="auth-pw-toggle"
                    onClick={() => setShowPassword(p => !p)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
                <button
                  className={`auth-btn ${isAdminTyped ? 'auth-btn--admin-main' : ''}`}
                  type="submit"
                >
                  {isAdminTyped ? '👑 Enter Admin Panel' : 'Login 🚀'}
                </button>
              </form>
            </div>
          </div>
          <AuthFooter />
          </>
        );
      })()}

        {isLoggedIn && isAdmin && (
  <div className="admin-fullscreen">
    {/* Header */}
    <header className="admin-full-header">
      <div className="admin-header-left">
        <span className="admin-logo">👑</span>
        <div className="admin-header-titles">
          <h1>Admin Dashboard</h1>
          <span className="admin-header-sub">Brain Bee Control Panel</span>
        </div>
      </div>
      <div className="admin-header-right">
        <div className="admin-welcome-block">
          <span className="admin-welcome-label">Logged in as</span>
          <span className="admin-welcome-name">{currentUser?.username}</span>
        </div>
        <button className="admin-logout-btn" onClick={handleLogout}>🚪 Logout</button>
      </div>
    </header>

    {/* Navigation Tabs */}
    <nav className="admin-nav-bar">
      <button 
        className={`admin-nav-tab ${adminView === 'manage' ? 'active' : ''}`} 
        onClick={() => setAdminView('manage')}
      >
        👥 Manage Users
      </button>
      <button 
        className={`admin-nav-tab ${adminView === 'students' ? 'active' : ''}`} 
        onClick={() => setAdminView('students')}
      >
        🎒 Students List
      </button>
      <button 
        className={`admin-nav-tab ${adminView === 'questions' ? 'active' : ''}`} 
        onClick={() => setAdminView('questions')}
      >
        📝 Manage Questions
      </button>
      <button 
        className={`admin-nav-tab ${adminView === 'leaderboard' ? 'active' : ''}`} 
        onClick={() => setAdminView('leaderboard')}
      >
        🏆 Leaderboard
      </button>
      <button 
        className={`admin-nav-tab ${adminView === 'status' ? 'active' : ''}`} 
        onClick={() => setAdminView('status')}
      >
        🔌 Player Status
      </button>
    </nav>

    {/* ✅ VIEW 1: MANAGE USERS */}
    {adminView === 'manage' && (
      <div className="admin-section animate-fade-in">
        <div className="manage-users-content">
          {/* Create Form */}
                 <form className="create-user-card" onSubmit={(e) => { e.preventDefault(); handleCreateUser(); }} >
         <h3 >{editingUser ? '✏️ Edit Account' : '➕ Create New Account'} </h3 >
         <div className="form-row" >
           <input type="text" placeholder="Username" value={adminForm.username} 
                onChange={e => setAdminForm({...adminForm, username: e.target.value})} className="admin-input" />
           <div className="password-wrapper" >
             <input type={showPassword ? 'text' : 'password'} placeholder="Password" value={adminForm.password} 
                  onChange={e => setAdminForm({...adminForm, password: e.target.value})} className="admin-input" />
             <button type="button" className="eye-btn" onClick={() => setShowPassword(!showPassword)} >
              {showPassword ? '🙈' : '👁️'}
             </button >
           </div >
           <select value={adminForm.role} onChange={e => setAdminForm({...adminForm, role: e.target.value})} className="admin-select" >
             <option value="student" >🎒 Student </option >
             <option value="admin" >👑 Admin </option >
           </select >
         </div >
        {loginMsg && <div style={{color: '#FFD700', marginBottom: '15px'}} >{loginMsg} </div >}
         <div style={{display: 'flex', alignItems: 'center'}} >
           <button className="admin-btn primary" type="submit" >
            {editingUser ? '💾 Save Changes' : 'Create Account ✨'}
           </button >
          {editingUser && (
             <button className="admin-btn secondary" type="button" onClick={() => {
              setEditingUser(null);
              setAdminForm({ username: '', password: '', role: 'student' });
              setLoginMsg('');
            }} >↩️ Cancel </button >
          )}
         </div >
       </form >

          {/* Users Table - Desktop View */}
          <h3 style={{color: '#fff', marginBottom: '15px'}}>📋 Created Accounts</h3>
          
          {/* Desktop Table Layout */}
          <div className="table-layout-desktop">
            <div className="table-header">
              <span>Username</span> <span>Role</span> <span>Password</span> <span>Actions</span>
            </div>
            {users.filter(u => u.username !== 'admin').map(u => (
              <div key={u.id} className="table-row">
                <span className="cell username">{u.username}</span>
                <span className="cell role">{u.role === 'admin' ? '👑 Admin' : '🎒 Student'}</span>
                <span className="cell password">
                  {usersWithPass[u.id] ? u.password : '••••••••'}
                  <button className="eye-btn" style={{position:'static', transform:'none'}} onClick={() => toggleUserPassword(u.id)}>
                    {usersWithPass[u.id] ? '🙈' : '👁️'}
                  </button>
                </span>
                <span className="cell actions">
                  <button className="action-btn edit" onClick={() => handleEditUser(u)}>✏️</button>
                  <button className="action-btn delete" onClick={() => handleDeleteUser(u.id)}>🗑️</button>
                </span>
              </div>
            ))}
          </div>

          {/* Mobile Grid Layout */}
          <div className="accounts-grid-mobile">
            {users.filter(u => u.username !== 'admin').map(u => (
              <div key={u.id} className="account-card">
                <div className="account-card-header">
                  <span className="account-role-badge">
                    {u.role === 'admin' ? '👑 Admin' : '🎒 Student'}
                  </span>
                  <div className="account-actions">
                    <button className="action-btn edit" onClick={() => handleEditUser(u)}>✏️</button>
                    <button className="action-btn delete" onClick={() => handleDeleteUser(u.id)}>🗑️</button>
                  </div>
                </div>
                
                <div className="account-card-body">
                  <div className="account-info-row">
                    <span className="account-label">USERNAME</span>
                    <span className="account-value">{u.username}</span>
                  </div>
                  
                  <div className="account-info-row">
                    <span className="account-label">ROLE</span>
                    <span className="account-value">{u.role === 'admin' ? 'Admin' : 'Student'}</span>
                  </div>
                  
                  <div className="account-info-row">
                    <span className="account-label">PASSWORD</span>
                    <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                      <span className="account-value password-text">
                        {usersWithPass[u.id] ? u.password : '••••••••'}
                      </span>
                      <button 
                        className="eye-btn-card" 
                        onClick={() => toggleUserPassword(u.id)}
                      >
                        {usersWithPass[u.id] ? '🙈' : '👁️'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <AppFooter />
      </div>
    )}

    {/* ✅ VIEW 2: STUDENTS LIST */}
    {adminView === 'students' && (() => {
      const studentRows = users.filter(u => u.role === 'student').map(u => {
        const apiData      = allStudentData.find(d => d.user_id === u.id);
        const totalStars   = apiData ? (apiData.total_stars || 0)            : 0;
        const mathStarsVal = apiData ? (apiData.math_stars || 0)             : 0;
        const engStarsVal  = apiData ? (apiData.english_stars || 0)          : 0;
        // Level is shared — both subjects always share the same level (highest of the two)
        const sharedLevel  = apiData
          ? Math.max(apiData.math_current_level || 1, apiData.english_current_level || 1)
          : 1;
        // Badge is SHARED — same tier thresholds for both subjects, based on total stars
        const badgeInfo    = getBadgeInfo(totalStars, 'math');
        return {
          nickname:  u.nickname || 'Not set',
          username:  u.username,
          level:     sharedLevel,
          mathStars: mathStarsVal,
          engStars:  engStarsVal,
          totalStars,
          badge:     badgeInfo.currentBadge?.name || 'Beginner',
        };
      });

      const handleStudentsCSV = () => {
        const headers = ['Nickname', 'Username', 'Level', 'Badge'];
        const rows = studentRows.map(r => [r.nickname, r.username, `Level ${r.level}`, r.badge]);
        const csv = [headers, ...rows]
          .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
          .join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `brainbee_students_${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      };

      const handleStudentsPDF = () => {
        const doc = new jsPDF({ orientation: 'landscape' });
        doc.setFontSize(18);
        doc.text('BrainBee - Student Performance', 14, 18);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 26);
        autoTable(doc, {
          startY: 32,
          head: [['Nickname', 'Username', 'Level', 'Badge']],
          body: studentRows.map(r => [r.nickname, r.username, `Level ${r.level}`, r.badge]),
          headStyles: { fillColor: [255, 193, 7], textColor: 0 },
          alternateRowStyles: { fillColor: [255, 250, 230] },
          styles: { fontSize: 9 },
        });
        doc.save(`brainbee_students_${new Date().toISOString().slice(0,10)}.pdf`);
      };

      return (
        <div className="admin-section animate-fade-in">
          <div className="admin-lb-header">
            <h2 className="section-title">🎒 Student Performance</h2>
            <div className="admin-lb-actions">
              <button className="admin-btn primary" onClick={handleStudentsCSV}>📥 Download CSV</button>
              <button className="admin-btn primary" onClick={handleStudentsPDF}>📄 Download PDF</button>
            </div>
          </div>
          <div className="students-table-container">
            <div className="students-table-header">
              <span className="student-cell">Nickname</span>
              <span className="student-cell">Username</span>
              <span className="student-cell">Level</span>
              <span className="student-cell">Badge</span>
            </div>
            {studentRows.map((r, i) => (
              <div key={i} className="table-row students-table-row">
                <span className="student-cell nickname">{r.nickname}</span>
                <span className="student-cell username">{r.username}</span>
                <span className="student-cell level">Level {r.level}</span>
                <span className="student-cell badge">{r.badge} ⭐</span>
              </div>
            ))}
          </div>
          <AppFooter />
        </div>
      );
    })()}

    {/* ✅ VIEW 3: MANAGE QUESTIONS (Your Code) */}
    {adminView === 'questions' && (
      <div className="admin-section animate-fade-in">
        <h2 className="section-title">📝 Manage Practice Questions</h2>
        
        {/* AI Module Upload Button */}
        <div style={{ marginTop: '16px', marginBottom: '16px', textAlign: 'right' }}>
          <button
            onClick={() => { 
  setShowModuleUpload(true); 
  setModuleStep('upload'); 
  setModuleGeneratedQs([]); 
  setModuleFile(null); 
  setModuleFileName(''); 
  setModuleSubject('english'); // ✅ Resets subject every time modal opens
}}
            style={{
              background: 'linear-gradient(135deg, #f093fb, #f5576c)',
              border: 'none', borderRadius: '14px',
              padding: '12px 22px', color: '#fff',
              fontWeight: 800, fontSize: '15px',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(240,147,251,0.4)',
            }}
          >
            🤖 Generate Questions from Module
          </button>
        </div>

        {/* Question Form */}
            <form className="create-user-card" onSubmit={(e) => { e.preventDefault(); handleSaveQuestion(); }} >
       <h3 >{editingQuestionId ? '✏️ Edit Question' : '➕ Add New Question'} </h3 >
       <div className="form-row" >
         <select value={questionForm.subject} onChange={e => {
           const newSubject = e.target.value;
           const defaultStyle = newSubject === 'math' ? 'arithmetic' : 'spelling';
           setQuestionForm({...questionForm, subject: newSubject, style: defaultStyle, targetWord: '', bossBattleQuestions: ['','','','','']});
         }} className="admin-select" >
           <option value="english" >📚 English </option >
           <option value="math" >🔢 Math </option >
         </select >
         <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
         <select value={questionForm.style} onChange={e => setQuestionForm({...questionForm, style: e.target.value, targetWord: '', bossBattleQuestions: ['','','','','']})} className="admin-select" >
           {questionForm.subject === 'math' ? (
             <>
               <option value="arithmetic">🔢 Arithmetic (Solve Equation)</option>
               <option value="boss_battle">⚔️ Boss Battle (5 Questions)</option>
             </>
           ) : (
             <>
               <option value="spelling">🔤 Spelling (Drag & Drop)</option>
               <option value="speech">🎙️ Speech (Read Aloud)</option>
               <option value="grammar_checker">📝 Grammar Checker (Fill in the Blank)</option>
               <option value="boss_battle">⚔️ Boss Battle (5 Questions)</option>
             </>
           )}
         </select>
         <button
           type="button"
           onClick={() => { setPreviewStyle(questionForm.style); setShowStylePreview(true); }}
           style={{
             background: 'linear-gradient(135deg, #667eea, #764ba2)',
             border: 'none',
             borderRadius: '10px',
             padding: '8px 12px',
             cursor: 'pointer',
             fontSize: '18px',
             color: '#fff',
             flexShrink: 0,
           }}
           title="Preview this game style"
         >👁️</button>
         </div>
         {questionForm.style !== 'boss_battle' && questionForm.style !== 'grammar_checker' && (
           <input type="text" placeholder={questionForm.subject === 'math' ? "Target Number (e.g., 42)" : "Target Word (e.g., Beautiful)"} value={questionForm.targetWord} 
                onChange={e => setQuestionForm({...questionForm, targetWord: e.target.value})} className="admin-input" />
         )}
       </div >

       {/* 📝 Grammar Checker inputs */}
       {questionForm.style === 'grammar_checker' && (
         <div style={{marginTop: '12px', background: 'rgba(100,200,100,0.08)', borderRadius: '10px', padding: '14px', border: '1px solid rgba(100,220,100,0.25)'}}>
           <p style={{color: '#90EE90', fontWeight: 700, marginBottom: '10px', fontSize: '14px'}}>
             📝 Grammar Checker Setup
           </p>
           <div style={{marginBottom: '10px'}}>
             <label style={{color: 'rgba(255,255,255,0.7)', fontSize: '13px', display: 'block', marginBottom: '5px'}}>
               Sentence with <code style={{background:'rgba(255,255,255,0.15)', padding:'1px 5px', borderRadius:'4px'}}>(blank)</code> placeholder:
             </label>
             <input
               type="text"
               placeholder='e.g. I am (blank) a book.'
               value={questionForm.grammarSentence}
               onChange={e => setQuestionForm({...questionForm, grammarSentence: e.target.value})}
               className="admin-input"
               style={{width: '100%', margin: 0}}
             />
             {questionForm.grammarSentence && !questionForm.grammarSentence.includes('(blank)') && (
               <p style={{color: '#FF6B6B', fontSize: '12px', marginTop: '4px'}}>⚠️ Make sure to include (blank) in your sentence!</p>
             )}
           </div>
           <div style={{marginBottom: '10px'}}>
             <label style={{color: 'rgba(255,255,255,0.7)', fontSize: '13px', display: 'block', marginBottom: '5px'}}>
               ✅ Correct Answer:
             </label>
             <input
               type="text"
               placeholder='e.g. reading'
               value={questionForm.grammarCorrect}
               onChange={e => setQuestionForm({...questionForm, grammarCorrect: e.target.value})}
               className="admin-input"
               style={{width: '100%', margin: 0}}
             />
           </div>
           <label style={{color: 'rgba(255,255,255,0.7)', fontSize: '13px', display: 'block', marginBottom: '6px'}}>
             ❌ Wrong Choices (enter exactly 3):
           </label>
           {questionForm.grammarChoices.map((val, i) => (
             <div key={i} style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px'}}>
               <span style={{color: 'rgba(255,255,255,0.4)', minWidth: '22px', fontSize: '13px'}}>W{i+1}</span>
               <input
                 type="text"
                 placeholder={`Wrong choice ${i+1} (e.g. rode)`}
                 value={val}
                 onChange={e => {
                   const updated = [...questionForm.grammarChoices];
                   updated[i] = e.target.value;
                   setQuestionForm({...questionForm, grammarChoices: updated});
                 }}
                 className="admin-input"
                 style={{flex: 1, margin: 0}}
               />
             </div>
           ))}
           {questionForm.grammarSentence && questionForm.grammarCorrect && (
             <p style={{color: 'rgba(255,255,255,0.45)', fontSize: '12px', marginTop: '6px'}}>
               👁️ Preview: <em>{questionForm.grammarSentence.replace('(blank)', `[ ${questionForm.grammarCorrect} ]`)}</em>
             </p>
           )}
         </div>
       )}

       {/* ⚔️ Boss Battle: 5-question inputs */}
       {questionForm.style === 'boss_battle' && (
         <div style={{marginTop: '12px', background: 'rgba(255,100,0,0.1)', borderRadius: '10px', padding: '14px', border: '1px solid rgba(255,150,0,0.3)'}}>
           <p style={{color: '#FFD700', fontWeight: 700, marginBottom: '10px', fontSize: '14px'}}>
             ⚔️ Enter 5 Boss Battle {questionForm.subject === 'math' ? 'Numbers (the answer value)' : 'Words'} — each is one challenge:
           </p>
           {questionForm.bossBattleQuestions.map((val, i) => (
             <div key={i} style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px'}}>
               <span style={{color: 'rgba(255,255,255,0.5)', minWidth: '22px', fontSize: '13px'}}>Q{i+1}</span>
               <input
                 type="text"
                 placeholder={questionForm.subject === 'math' ? `Answer value (e.g., 42)` : `Word (e.g., beautiful)`}
                 value={val}
                 onChange={e => {
                   const updated = [...questionForm.bossBattleQuestions];
                   updated[i] = e.target.value;
                   setQuestionForm({...questionForm, bossBattleQuestions: updated});
                 }}
                 className="admin-input"
                 style={{flex: 1, margin: 0}}
               />
             </div>
           ))}
           <p style={{color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginTop: '6px'}}>
             💡 These 5 questions will be played as one Boss Battle set in {questionForm.subject === 'math' ? 'Math' : 'English'} practice.
           </p>
         </div>
       )}

      {questionForm.style === 'spelling' && questionForm.targetWord && (
         <p style={{color: 'rgba(255,255,255,0.6)', fontSize: '13px', marginTop: '5px'}} >
          🔤 Pool: {generateDistractors(questionForm.targetWord).join(', ')}
         </p >
      )}
       <div style={{display: 'flex', alignItems: 'center', marginTop: '15px'}} >
         <button className="admin-btn primary" type="submit" >
          {editingQuestionId ? '💾 Update Question' : '➕ Add Question'}
         </button >
        {editingQuestionId && (
           <button className="admin-btn secondary" type="button" onClick={() => {
            setEditingQuestionId(null);
            setQuestionForm({ subject: 'english', style: 'spelling', targetWord: '', bossBattleQuestions: ['','','','',''] });
          }} >↩️ Cancel </button >
        )}
       </div >
     </form >

        {/* Questions List — grouped by subject */}
        <div className="users-table-container" style={{marginTop: '20px'}}>
          <h3 style={{color:'#fff', marginBottom:'8px'}}>📚 English Questions ({practiceQuestions.filter(q=>q.subject==='english').length})</h3>
          {practiceQuestions.filter(q => q.subject === 'english').length === 0 ? (
            <p style={{color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: '10px'}}>No English questions yet.</p>
          ) : (
            <>
              {/* Desktop Table Layout */}
              <div className="aq-table-desktop">
                {practiceQuestions.filter(q => q.subject === 'english').map(q => (
                  <div key={q.id} className="user-table-row" style={{gridTemplateColumns: '1fr 1.2fr 1.5fr 0.8fr'}}>
                    <span className="user-cell">📚 English</span>
                    <span className="user-cell">{q.style === 'spelling' ? '🔤 Spelling' : q.style === 'speech' ? '🎙️ Speech' : q.style === 'grammar_checker' ? '📝 Grammar' : '⚔️ Boss Battle'}</span>
                    <span className="user-cell" style={{fontWeight: '700', color: '#FFD700'}}>
                      {q.style === 'boss_battle'
                        ? (q.bossBattleQuestions||[]).filter(Boolean).join(', ')
                        : q.style === 'grammar_checker'
                        ? `"${q.grammarSentence || q.targetWord}"`
                        : `"${q.targetWord}"`}
                    </span>
                    <span className="user-cell actions">
                      <button className="action-btn edit" onClick={() => handleEditQuestion(q)}>✏️</button>
                      <button className="action-btn delete" onClick={() => handleDeleteQuestion(q.id)}>🗑️</button>
                    </span>
                  </div>
                ))}
              </div>

              {/* Mobile Card Layout */}
              <div className="aq-grid-mobile">
                {practiceQuestions.filter(q => q.subject === 'english').map(q => (
                  <div key={q.id} className="aq-card">
                    <div className="aq-card-header">
                      <span className="aq-badge aq-badge--english">📚 English</span>
                      <div className="account-actions">
                        <button className="action-btn edit" onClick={() => handleEditQuestion(q)}>✏️</button>
                        <button className="action-btn delete" onClick={() => handleDeleteQuestion(q.id)}>🗑️</button>
                      </div>
                    </div>
                    <div className="account-card-body">
                      <div className="account-info-row">
                        <span className="account-label">STYLE</span>
                        <span className="account-value">
                          {q.style === 'spelling' ? '🔤 Spelling' : q.style === 'speech' ? '🎙️ Speech' : q.style === 'grammar_checker' ? '📝 Grammar' : '⚔️ Boss Battle'}
                        </span>
                      </div>
                      <div className="account-info-row">
                        <span className="account-label">CONTENT</span>
                        <span className="account-value aq-content-value">
                          {q.style === 'boss_battle'
                            ? `⚔️ ${(q.bossBattleQuestions||[]).filter(Boolean).join(', ')}`
                            : q.style === 'grammar_checker'
                            ? `"${q.grammarSentence || q.targetWord}"`
                            : `"${q.targetWord}"`}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="users-table-container" style={{marginTop: '16px'}}>
          <h3 style={{color:'#fff', marginBottom:'8px'}}>🔢 Math Questions ({practiceQuestions.filter(q=>q.subject==='math').length})</h3>
          {practiceQuestions.filter(q => q.subject === 'math').length === 0 ? (
            <p style={{color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: '10px'}}>No Math questions yet.</p>
          ) : (
            <>
              {/* Desktop Table Layout */}
              <div className="aq-table-desktop">
                {practiceQuestions.filter(q => q.subject === 'math').map(q => (
                  <div key={q.id} className="user-table-row" style={{gridTemplateColumns: '1fr 1.2fr 1.5fr 0.8fr'}}>
                    <span className="user-cell">🔢 Math</span>
                    <span className="user-cell">{q.style === 'boss_battle' ? '⚔️ Boss Battle' : '🔢 Arithmetic'}</span>
                    <span className="user-cell" style={{fontWeight: '700', color: '#FFD700'}}>
                      {q.style === 'boss_battle'
                        ? (q.bossBattleQuestions||[]).filter(Boolean).join(', ')
                        : `"${q.targetWord}"`}
                    </span>
                    <span className="user-cell actions">
                      <button className="action-btn edit" onClick={() => handleEditQuestion(q)}>✏️</button>
                      <button className="action-btn delete" onClick={() => handleDeleteQuestion(q.id)}>🗑️</button>
                    </span>
                  </div>
                ))}
              </div>

              {/* Mobile Card Layout */}
              <div className="aq-grid-mobile">
                {practiceQuestions.filter(q => q.subject === 'math').map(q => (
                  <div key={q.id} className="aq-card">
                    <div className="aq-card-header">
                      <span className="aq-badge aq-badge--math">🔢 Math</span>
                      <div className="account-actions">
                        <button className="action-btn edit" onClick={() => handleEditQuestion(q)}>✏️</button>
                        <button className="action-btn delete" onClick={() => handleDeleteQuestion(q.id)}>🗑️</button>
                      </div>
                    </div>
                    <div className="account-card-body">
                      <div className="account-info-row">
                        <span className="account-label">STYLE</span>
                        <span className="account-value">
                          {q.style === 'boss_battle' ? '⚔️ Boss Battle' : '🔢 Arithmetic'}
                        </span>
                      </div>
                      <div className="account-info-row">
                        <span className="account-label">CONTENT</span>
                        <span className="account-value aq-content-value">
                          {q.style === 'boss_battle'
                            ? `⚔️ ${(q.bossBattleQuestions||[]).filter(Boolean).join(', ')}`
                            : `"${q.targetWord}"`}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        <AppFooter />
      </div>
    )}

    {/* ✅ VIEW 4: ADMIN LEADERBOARD */}
    {adminView === 'leaderboard' && (() => {
      // Use real DB data from allStudentData (merged across both modes)
      const registeredIds = new Set(
        users.filter(u => u.role === 'student').map(u => u.user_id ?? u.id)
      );
      // Map user_id → nickname from users list (reliable source)
      const nicknameMap = {};
      users.filter(u => u.role === 'student').forEach(u => {
        nicknameMap[u.user_id ?? u.id] = u.nickname || u.username;
      });

      const entries = allStudentData
        .filter(d => registeredIds.has(d.user_id))
        .map(d => ({
          nickname:             nicknameMap[d.user_id] || d.nickname || '—',
          totalStars:           d.total_stars || 0,
          mathStars:            d.math_stars || 0,
          englishStars:         d.english_stars || 0,
          highestLevel:         d.highest_level || 1,
          highestMathScore:     d.highest_math_score || 0,
          highestEnglishScore:  d.highest_english_score || 0,
        }));

      const sortMap = {
        totalStars:   { field: 'totalStars',          label: 'Stars' },
        math:         { field: 'highestMathScore',    label: 'Math Score' },
        english:      { field: 'highestEnglishScore', label: 'English Score' },
        level:        { field: 'highestLevel',        label: 'Highest Level' },
      };
      const active = sortMap[adminLbTab] || sortMap.totalStars;
      const ranked = [...entries].sort(
        (a, b) => (b[active.field] || 0) - (a[active.field] || 0)
      );

      // Column config per tab: what header label and value getter to show
      const colConfig = {
        totalStars:   { header: '⭐ Stars',        getValue: p => p.totalStars || 0 },
        math:         { header: 'Math Score',      getValue: p => p.highestMathScore || 0 },
        english:      { header: 'English Score',   getValue: p => p.highestEnglishScore || 0 },
        level:        { header: 'Highest Level',   getValue: p => p.highestLevel || 0 },
      };
      const activeCol = colConfig[adminLbTab] || colConfig.totalStars;

      const handleExportCSV = () => {
        const headers = ['Rank', 'Nickname', active.label];
        const rows = ranked.map((p, i) => [
          i + 1, p.nickname, activeCol.getValue(p),
        ]);
        const csv = [headers, ...rows]
          .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
          .join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `brainbee_leaderboard_${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      };

      const handleExportPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text('BrainBee - Student Leaderboard', 14, 18);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Sorted by: ${active.label}`, 14, 26);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 32);

        autoTable(doc, {
          startY: 38,
          head: [['#', 'Nickname', active.label]],
          body: ranked.map((p, i) => [
            i + 1, p.nickname, activeCol.getValue(p),
          ]),
          headStyles: { fillColor: [255, 193, 7], textColor: 0 },
          alternateRowStyles: { fillColor: [255, 250, 230] },
          styles: { fontSize: 9 },
        });

        doc.save(`brainbee_leaderboard_${new Date().toISOString().slice(0,10)}.pdf`);
      };

      return (
        <div className="admin-section animate-fade-in">
          <div className="admin-lb-header">
            <h2>🏆 Student Leaderboard</h2>
            <div className="admin-lb-actions">
              <button className="admin-btn primary" onClick={handleExportCSV}>📥 Download CSV</button>
              <button className="admin-btn primary" onClick={handleExportPDF}>📄 Download PDF</button>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            margin: '20px 0',
          }}>
            {[
              { id: 'totalStars', emoji: '⭐', label: 'Stars',         sub: 'Total stars earned' },
              { id: 'math',       emoji: '🧮', label: 'Math Score',    sub: 'Best math result'   },
              { id: 'english',    emoji: '📖', label: 'English Score', sub: 'Best English result' },
              { id: 'level',      emoji: '🏔', label: 'Highest Level', sub: 'Furthest level reached' },
            ].map(t => {
              const isActive = adminLbTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setAdminLbTab(t.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '16px 20px',
                    border: isActive ? '2px solid #f9a825' : '2px solid rgba(255,255,255,0.08)',
                    borderRadius: '14px',
                    background: isActive
                      ? 'linear-gradient(135deg, #f9a825, #f57f17)'
                      : 'rgba(255,255,255,0.04)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    textAlign: 'left',
                    boxShadow: isActive ? '0 4px 18px rgba(249,168,37,0.35)' : 'none',
                  }}
                >
                  <span style={{ fontSize: '28px', lineHeight: 1 }}>{t.emoji}</span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{
                      fontWeight: 700,
                      fontSize: '15px',
                      color: isActive ? '#1a1a2e' : '#fff',
                    }}>{t.label}</span>
                    <span style={{
                      fontSize: '11px',
                      color: isActive ? 'rgba(26,26,46,0.7)' : 'rgba(255,255,255,0.45)',
                    }}>{t.sub}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {ranked.length === 0 ? (
            <div className="admin-lb-empty">
              <div style={{ fontSize: '3rem' }}>🐝</div>
              <p>No student scores recorded yet.</p>
            </div>
          ) : (
            <div className="admin-lb-table-wrap">
              <table className="admin-lb-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Nickname</th>
                    <th>{activeCol.header}</th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.map((p, i) => (
                    <tr key={p.nickname} className={i < 3 ? `top-rank rank-${i+1}` : ''}>
                      <td>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}</td>
                      <td><strong>{p.nickname}</strong></td>
                      <td>{activeCol.getValue(p)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <AppFooter />
        </div>
      );
    })()}

    {/* ✅ VIEW 5: PLAYER STATUS */}
    {adminView === 'status' && (
      <div className="admin-section animate-fade-in">
        <h2 className="section-title">🔌 Player Status & Activity</h2>
        
        <div className="player-status-filters">
          <button 
            className={`status-filter-btn ${playerStatusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setPlayerStatusFilter('all')}
          >
            All Players
          </button>
          <button 
            className={`status-filter-btn ${playerStatusFilter === 'online' ? 'active' : ''}`}
            onClick={() => setPlayerStatusFilter('online')}
          >
            Online
          </button>
          <button 
            className={`status-filter-btn ${playerStatusFilter === 'offline' ? 'active' : ''}`}
            onClick={() => setPlayerStatusFilter('offline')}
          >
            Offline
          </button>
        </div>

        <div className="player-status-container">
          <div className="status-table-header">
            <span>Player Name</span>
            <span>Status</span>
            <span>Last Active</span>
            <span>Current Activity</span>
            <span>Time Playing</span>
          </div>

          {users.filter(u => u.role === 'student').map(u => {
            const statusInfo = getPlayerStatus(u.username);
            const isOnline = statusInfo.isOnline;
            const lastActiveText = statusInfo.isOnline ? 'Now' : statusInfo.lastActiveText;
            
            const shouldShow = playerStatusFilter === 'all' || 
              (playerStatusFilter === 'online' && isOnline) ||
              (playerStatusFilter === 'offline' && !isOnline);

            return shouldShow ? (
              <div key={u.id} className={`status-table-row ${isOnline ? 'online' : 'offline'}`}>
                <span className="status-player-name">{u.nickname || u.username}</span>
                <span className={`status-badge ${isOnline ? 'online' : 'offline'}`}>
                  {isOnline ? '🟢 Online' : '⚫ Offline'}
                </span>
                <span className="status-time">{lastActiveText}</span>
                <span className="status-activity">{statusInfo.currentActivity}</span>
                <span className="status-duration">{statusInfo.playDuration}</span>
              </div>
            ) : null;
          })}

          {users.filter(u => u.role === 'student').every(u => {
            const statusInfo = getPlayerStatus(u.username);
            const isOnline = statusInfo.isOnline;
            const shouldShow = playerStatusFilter === 'all' || 
              (playerStatusFilter === 'online' && isOnline) ||
              (playerStatusFilter === 'offline' && !isOnline);
            return !shouldShow;
          }) && (
            <div className="status-empty-state">
              <p>No players found with selected filter.</p>
            </div>
          )}
        </div>
        <AppFooter />
      </div>
    )}
  </div>
)}

      {showIntro && (
        <div className="intro-screen" id="introScreen">
          <div className="intro-content">
            <div className="intro-gif-container">
              <img 
                src="/gifs/polin.gif" 
                alt="Loading animation" 
                className="intro-gif"
              />
            </div>
            <div className="intro-loader">
              <div className="loader-bar"></div>
            </div>
            <p className="intro-loading-text">Loading...</p>
          </div>
        </div>
      )}

          {!showIntro && isLoggedIn && !isAdmin && (
        <>
          {showProfile && (
            <ProfilePage
              nickname={nickname}
              gameHistory={gameHistory}
              mathStars={mathStars}
              englishStars={englishStars}
              goldCount={goldCount}
              mathStreak={mathStreak}
              englishStreak={englishStreak}
              selectedMode={selectedMode}
              onClose={() => setShowProfile(false)}
              language={language}
              currentBadgeInfo={currentBadgeInfo}
              starsForNextBadge={currentBadgeInfo.nextBadge ? currentBadgeInfo.nextBadge.starsRequired : totalCombinedStars}
              mathCurrentLevel={sharedLevel}
              englishCurrentLevel={sharedLevel}
              sharedLevel={sharedLevel}
              ownedAvatars={ownedAvatars}
              equippedAvatar={equippedAvatar}
              onEquipAvatar={handleEquipAvatar}
              onOpenShop={() => setShowShop(true)}
              onOpenLeaderboard={() => setShowLeaderboard(true)}
            />
          )}

      {currentScreen === 'greeting' && !isInputMode && (
  <>
  <div className="input-screen">
          <div className="particles">
            {[...Array(6)].map((_, i) => (
              <div key={i} className={`particle particle-${i + 1}`}>
                <span className="sparkle">✨</span>
              </div>
            ))}
          </div>
          <div className="cloud cloud-1">☁️</div>
          <div className="cloud cloud-2">☁️</div>
          <div className="content-wrapper">
            <div className="speech-bubble-wrapper">
              <div className="speech-bubble">
                <span className="bubble-text">Hi Brain Bee</span>
                <div className="bubble-tail"></div>
                <div className="bubble-glow"></div>
              </div>
              <div className="bee-container" onClick={() => speakWord('Hi Brain Bee')}>
                <img src="/gifs/bee.gif" alt="Brain Bee" className="bee" style={{ objectFit: 'contain' }} />
              </div>
            </div>
            <div className="middle-section">
              <div className="motto-container">
                <span className="motto-text">Hive of Learning, Buzz of Success!</span>
              </div>
            </div>
            <button
              className="continue-btn"
              onClick={handleContinue}
            >
              <span className="btn-text">Continue</span>
              <span className="btn-icon">→</span>
              <span className="btn-shine"></span>
            </button>
          </div>
        </div>
        <AppFooter />
      </>
      )}

      {currentScreen === 'greeting' && isInputMode && (
  <>
  <div className="input-screen">
          <div className="particles">
            {[...Array(6)].map((_, i) => (
              <div key={i} className={`particle particle-${i + 1}`}>
                <span className="sparkle">✨</span>
              </div>
            ))}
          </div>
          <div className="cloud cloud-1">☁️</div>
          <div className="cloud cloud-2">☁️</div>
          <div className="content-wrapper">
            <div className="speech-bubble-wrapper">
              <div className="speech-bubble">
                <span className="bubble-text">Input your Nickname</span>
                <div className="bubble-tail"></div>
                <div className="bubble-glow"></div>
              </div>
              <div className="bee-container" onClick={() => speakWord('Input your Nickname')}>
                <img src="/gifs/bee.gif" alt="Brain Bee" className="bee" style={{ objectFit: 'contain' }} />
              </div>
            </div>
            <div className="middle-section">
              <div className={`motto-container ${isInputMode ? 'hide' : ''}`}>
                <span className="motto-text">Hive of Learning, Buzz of Success!</span>
              </div>
              <div className={`input-container ${isInputMode ? 'show' : ''}`}>
                <input
                  ref={inputRef}
                  type="text"
                  className={`nickname-input ${nicknameError ? 'input-error' : ''}`}
                  placeholder={translations[language].enterName}
                  value={nickname}
                  onChange={(e) => { setNickname(e.target.value); if (nicknameError) setNicknameError(''); }}
                  maxLength={20}
                />
                {nicknameError && (
                  <div className="nickname-error-msg">{nicknameError}</div>
                )}
              </div>
            </div>
            <button
              className="continue-btn"
              onClick={handleOkay}
            >
              <span className="btn-text">Okay</span>
              <span className="btn-icon">→</span>
              <span className="btn-shine"></span>
            </button>
          </div>
        </div>
        <AppFooter />
      </>
      )}

      {currentScreen === 'home' && (
  <div className="home-wrapper">
          <div className={`home-screen ${isHomepageBlurred ? 'blurred' : ''} ${selectedMode === 'math' ? 'home-theme-math' : 'home-theme-english'}`}>
            <div className="bg-shapes">
              {selectedMode === 'math' ? (
                <>
                  <div className="shape math-deco math-1">➕</div>
                  <div className="shape math-deco math-2">3</div>
                  <div className="shape math-deco math-3">✖️</div>
                  <div className="shape math-deco math-4">÷</div>
                  <div className="shape math-deco math-5">📐</div>
                  <div className="shape math-deco math-6">🧮</div>
                  <div className="shape math-deco math-7">7</div>
                  <div className="shape math-deco math-8">=</div>
                  <div className="shape math-deco math-9">−</div>
                  <div className="shape math-deco math-10">📏</div>
                </>
              ) : (
                <>
                  <div className="shape eng-deco eng-1">📖</div>
                  <div className="shape eng-deco eng-2">A</div>
                  <div className="shape eng-deco eng-3">✏️</div>
                  <div className="shape eng-deco eng-4">💬</div>
                  <div className="shape eng-deco eng-5">🦋</div>
                  <div className="shape eng-deco eng-6">B</div>
                  <div className="shape eng-deco eng-7">⭐</div>
                  <div className="shape eng-deco eng-8">C</div>
                  <div className="shape eng-deco eng-9">📝</div>
                  <div className="shape eng-deco eng-10">🌸</div>
                </>
              )}
            </div>
            
            <div className="top-bar">
              <button 
                className="profile-section" 
                onClick={() => { playSound('click'); setShowProfile(true); }}
              >
                <div className="profile-circle"><img src={getAvatarById(equippedAvatar).image} alt="avatar" className="profile-circle-img" /></div>
                <div className="player-info">
                  <span className="player-name">{nickname || "Player"}</span>
                  <div className="exp-bar">
                    <div className="exp-fill" style={{ width: `${(mathStars + englishStars) % 100}%` }}></div>
                  </div>
                </div>
              </button>
              <div className="gold-display">
                <span className="gold-icon">💰</span>
                <span className="gold-text">{goldCount}</span>
              </div>
              <button className="shop-btn" onClick={() => { playSound('click'); setShowShop(true); }}>
                <span className="shop-btn-icon">🛒</span>
                <span className="shop-btn-label">Shop</span>
              </button>
              <button className="lb-trigger-btn" onClick={() => { playSound('click'); setShowLeaderboard(true); }}>
                <span className="lb-trigger-icon">🏆</span>
                <span className="lb-trigger-label">Leaderboard</span>
              </button>
              <div className="settings-btn" onClick={() => { playSound('click'); setShowSettings(true); }}>
                <span className="gear-icon">⚙️</span>
              </div>
            </div>

            <div className="game-canvas">
              {gameMode === 'adventure' && Object.keys(levelPositions).map((level) => {
                const levelNum = parseInt(level);
                const unlocked = isLevelUnlocked(levelNum);
                const isCurrent = levelNum === currentLevel && activeGame;
                const isCompleted = completedLevels.has(levelNum);
                return (
                  <div
                    key={levelNum}
                    className={`level-node level-${levelNum} ${unlocked ? '' : 'locked'} ${isCurrent ? 'current-level' : ''} ${isCompleted ? 'completed' : ''}`}
                    onClick={() => unlocked && startGame(levelNum)}
                  >
                    {!unlocked ? (
                      <>
                        <span className="lock-icon">🔒</span>
                        <span className="level-text">Level {levelNum}</span>
                      </>
                    ) : (
                      <>
                        {isCompleted && <span className="check-icon">✅</span>}
                        <span className="level-text">Level {levelNum}</span>
                      </>
                    )}
                  </div>
                );
              })}

              <div
                className={`avatar-container ${isAvatarJumping ? 'jumping' : ''}`}
              >
                <img src="/gifs/bee.gif" alt="Brain Bee" className="blocky-bee" style={{ objectFit: 'contain', width: '100%', height: '100%' }} />
              </div>
            </div>

            <div className="bottom-bar">
              <button className="mode-btn" onClick={() => { playSound('click'); setPendingSelectedMode(selectedMode); setShowModeModal(true); }}>
                {selectedMode === 'math' ? translations[language].math : translations[language].english}
              </button>
              <div className="badge-math-group">
                {(() => {
                  // Badge is shared — use total combined stars regardless of subject
                  const badgeInfo = getBadgeInfo(totalCombinedStars, 'math');
                  const displayBadge = badgeInfo.currentBadge || badgeInfo.nextBadge;
                  const starsDisplay = badgeInfo.nextBadge ? `${totalCombinedStars}/${badgeInfo.starsNeeded}` : `${totalCombinedStars}`;
                  return (
                    <button className="badge-container-btn" onClick={() => { playSound('click'); setSelectedBadgeMode(selectedMode); setShowBadgeModal(true); }}>
                      <div className="badge-stars">⭐ {starsDisplay}</div>
                      <div className="badge-icon-display">
                        {displayBadge ? <img src={displayBadge.image} alt={displayBadge.name} className="badge-image" /> : '🌱'}
                      </div>
                      <div className="badge-name">{displayBadge ? displayBadge.name : 'Locked'}</div>
                    </button>
                  );
                })()}
                    <button className={`start-btn ${gameMode === 'practice' && practiceQuestions.filter(q => q.subject === selectedMode).length === 0 ? 'disabled' : ''}`} 
        onClick={gameMode === 'adventure' ? () => startGame(currentLevel) : startPracticeGame}
        disabled={gameMode === 'practice' && practiceQuestions.filter(q => q.subject === selectedMode).length === 0}>
  {gameMode === 'adventure' ? (selectedMode === 'math' ? translations[language].math : translations[language].english) : '🚀 Start Practice'}
</button>
              </div>
            </div>
          </div>

          {showGreetingOverlay && (
            <div className="greeting-overlay">
              <div className={`flying-bee ${isBeeCheerful ? 'cheerful' : ''}`}>
                <img src="/gifs/bee.gif" alt="Brain Bee" className="bee" style={{ objectFit: 'contain', width: '100%', height: '100%' }} />
              </div>
              {showGreetingMessage && (
    <div className={`greeting-cloud ${showGreetingMessage ? 'visible' : ''}`}>
        <h2>Welcome, {nickname || "Friend"}! 🐝✨</h2>
        <p>Ready to buzz into a world of fun learning?</p>
        {showOkayBtn && (
            <button 
                className={`greeting-okay-btn ${showOkayBtn ? 'visible' : ''}`} 
                onClick={() => { playSound('click'); dismissGreeting(); }}
            >
                Okay! 🚀
            </button>
        )}
    </div>
)}

            </div>
          )}
        </div>
      )}

      {showModeModal && (
        <div className="modal-overlay" onClick={() => setShowModeModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">{translations[language].chooseSubject}</h2>
            <div className="mode-options">
              <button
                className={`mode-option ${pendingSelectedMode === 'math' ? 'active' : ''}`}
                onClick={() => setPendingSelectedMode('math')}
              >
                🔢 {translations[language].math}
              </button>
              <button
                className={`mode-option ${pendingSelectedMode === 'english' ? 'active' : ''}`}
                onClick={() => setPendingSelectedMode('english')}
              >
                📚 {translations[language].english}
              </button>
            </div>
            <button className="modal-confirm-btn" onClick={handleModeConfirm}>
              {translations[language].letsGo} 🚀
            </button>
          </div>
        </div>
      )}

      {activeGame === 'math' && (
        <>
        <div className="math-game-screen">
          {mathFeedback && (
            <div className={`feedback-toast ${mathFeedback.type} ${mathFeedback.type === 'wrong' ? 'shake' : ''}`}>
              {mathFeedback.message}
            </div>
          )}
          <div className="game-header">
            <button className="game-back-btn" onClick={() => { playSound('click'); goBackToHome(); }}>
              ← {translations[language].home}
            </button>
            <div className="game-header-center">
              <h2 className="game-level-title">⚡ Level {currentLevel} — Math</h2>
              <div className="game-progress-row">
                <span className="game-progress-text">{currentQuestionIndex + 1} / {mathState.totalQuestions}</span>
                <div className="game-progress-bar">
                  <div className="game-progress-fill" style={{ width: `${((currentQuestionIndex + 1) / mathState.totalQuestions) * 100}%` }}></div>
                </div>
              </div>
            </div>
            <div className="game-gold-pill">
              <span className="game-gold-icon">💰</span>
              <span className="game-gold-count">{goldCount}</span>
            </div>
          </div>

          {/* 💡 Help & Hint Buttons — below header, never overlapping gold */}
          {!isBossQuestion() && !showLevelComplete && (
            <div className="ghh-below-header">
              <GameHelpHint
                key={`math-${currentQuestionIndex}`}
                activeGame="math"
                englishGameStyle={null}
                goldCount={goldCount}
                onSpendGold={handleSpendGold}
                onHintMath={handleHintMath}
                onHintSpelling={null}
                onHintGrammar={null}
                isAnswered={mathState.isAnswered}
              />
            </div>
          )}

          {isBossQuestion() && bossBattle.active ? renderBossBattle() : (
          <div className="math-game-area">
            <div className={`question-box ${mathFeedback?.type === 'correct' ? 'success-pulse' : ''}`}>
  {/* Left Operand */}
  {mathState.hiddenPart === 'left' ? (
    <div className="blanks-container">
      {mathState.blanks.map((b, i) => (
        <div key={i} className={`blank-slot ${b !== null ? 'filled' : ''}`}
          onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, i)} onClick={() => handleBlankClick(i)}>
          {b !== null ? b : '?'}
        </div>
      ))}
    </div>
  ) : (
    <span className="q-left">{mathState.displayLeft}</span>
  )}
  
  <span className="q-op">+</span>
  
  {/* Answer (Middle Operand) */}
  {mathState.hiddenPart === 'answer' ? (
    <div className="blanks-container">
      {mathState.blanks.map((b, i) => (
        <div key={i} className={`blank-slot ${b !== null ? 'filled' : ''}`}
          onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, i)} onClick={() => handleBlankClick(i)}>
          {b !== null ? b : '?'}
        </div>
      ))}
    </div>
  ) : (
    <span className="q-ans" style={{ fontSize: '40px', fontWeight: 800 }}>{mathState.displayAnswer}</span>
  )}
  
  <span className="q-eq">=</span>
  
  {/* Right Operand (Result) */}
  {mathState.hiddenPart === 'right' ? (
    <div className="blanks-container">
      {mathState.blanks.map((b, i) => (
        <div key={i} className={`blank-slot ${b !== null ? 'filled' : ''}`}
          onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, i)} onClick={() => handleBlankClick(i)}>
          {b !== null ? b : '?'}
        </div>
      ))}
    </div>
  ) : (
    <span className="q-right">{mathState.displayRight}</span>
  )}
</div>

            <p className="game-instruction">
              🎯 {language === 'en' ? 'Drag or tap the numbers below to solve it!' : 'I-drag o pindutin ang mga numero sa ibaba upang malutas ito!'}
            </p>

            <div className="number-pool">
              {mathState.pool.map((num, i) => (
                <div
                  key={i}
                  className={`number-bubble ${mathState.usedIndices.includes(i) ? 'used' : ''} ${selectedPoolNum?.index === i ? 'selected' : ''}`}
                  draggable={!mathState.usedIndices.includes(i)}
                  onDragStart={(e) => handleDragStart(e, num, i)}
                  onClick={() => handlePoolClick(num, i)}
                  style={{ animationDelay: `${i * 0.1}s`, cursor: mathState.usedIndices.includes(i) ? 'default' : 'grab' }}
                >
                  {num}
                </div>
              ))}
            </div>
          </div>
          )}
        </div>
        <AppFooter />
        </>
      )}

      {activeGame === 'english' && (
   <>
   <div className="english-game-screen">
      {englishFeedback && (
         <div className={`feedback-toast ${englishFeedback.type} ${englishFeedback.type === 'wrong' ? 'shake' : ''}`}>
          {englishFeedback.message}
         </div>
      )}
       <div className="game-header">
         <button className="game-back-btn" onClick={() => { playSound('click'); goBackToHome(); }}>
          ← {translations[language].home}
         </button>
         <div className="game-header-center">
           <h2 className="game-level-title">
             {englishGameStyle === 'reading' ? '🎙️' : englishGameStyle === 'grammar_checker' ? '📝' : '🐝'} {translations[language].level} {currentLevel} — {englishGameStyle === 'reading' ? 'Reading' : englishGameStyle === 'grammar_checker' ? 'Grammar' : 'Spelling'}
           </h2>
           <div className="game-progress-row">
             <span className="game-progress-text">{currentQuestionIndex + 1} / {englishState.totalQuestions}</span>
             <div className="game-progress-bar">
               <div className="game-progress-fill" style={{ width: `${((currentQuestionIndex + 1) / englishState.totalQuestions) * 100}%` }}></div>
             </div>
           </div>
         </div>
         <div className="game-gold-pill">
           <span className="game-gold-icon">💰</span>
           <span className="game-gold-count">{goldCount}</span>
         </div>
       </div>

       {/* 💡 Help & Hint Buttons — below header, never overlapping gold */}
       {!isBossQuestion() && !showLevelComplete && (
         <div className="ghh-below-header">
           <GameHelpHint
             key={`english-${currentQuestionIndex}`}
             activeGame="english"
             englishGameStyle={englishGameStyle}
             goldCount={goldCount}
             onSpendGold={handleSpendGold}
             onHintMath={null}
             onHintSpelling={handleHintSpelling}
             onHintGrammar={handleHintGrammar}
             isAnswered={
               englishGameStyle === 'grammar_checker'
                 ? grammarState.isAnswered
                 : englishState.isAnswered
             }
           />
         </div>
       )}

       {isBossQuestion() && bossBattle.active ? (
         bossBattle.isWordSearch ? renderWordSearchBattle() : renderBossBattle()
       ) : (
       <div className="english-game-area">
         {/* 🎙️ READING MODE UI */}
         {englishGameStyle === 'reading' && (
           <>
             <div className="reading-word-display">{englishState.word}</div>
             <p className="game-instruction">🎯 Speak the word clearly into the microphone!</p>
             <button 
               className={`mic-btn ${isListening ? 'listening' : ''}`}
               onClick={() => {
  if (englishState.isAnswered || isVoskLoading) return;
  if (isListening) {
    if (recognizerRef.current) {
      recognizerRef.current.abort?.();
    }
    setIsListening(false);
  } else {
    if (recognizerRef.current) {
      try {
        recognizerRef.current.start();
      } catch (err) {
        console.log('[v0] Could not start speech recognition:', err);
      }
    }
  }
}}
disabled={isVoskLoading}
             >
               {isVoskLoading ? '��� Loading...' : isListening ? '👂 Listening...' : '🎙️ Tap to Speak'}
             </button>
             <p className="recognition-hint">🔊 Make sure your microphone is enabled</p>
           </>
         )}

         {/* 📝 GRAMMAR CHECKER MODE UI */}
         {englishGameStyle === 'grammar_checker' && (
           <div className="grammar-game-wrapper">
             {/* Animated mascot / icon */}
             <div className="grammar-mascot">
               <span className="grammar-mascot-emoji">🐝</span>
               <div className="grammar-speech-bubble">Fill in the blank!</div>
             </div>

             {/* Sentence display */}
             <div className="grammar-sentence-box">
               {grammarState.sentence.split('(blank)').map((part, i, arr) => (
                 <span key={i}>
                   {part}
                   {i < arr.length - 1 && (
                     <span className={`grammar-blank ${grammarState.isAnswered ? (grammarState.selectedChoice === grammarState.correct ? 'correct-blank' : 'wrong-blank') : 'pulse-blank'}`}>
                       {grammarState.isAnswered ? grammarState.selectedChoice : '?????'}
                     </span>
                   )}
                 </span>
               ))}
             </div>

             <p className="grammar-instruction">👇 Tap the correct word!</p>

             {/* 2×2 choice grid — exactly 4 buttons */}
             <div className="grammar-choices-grid">
               {grammarState.choices.slice(0, 4).map((choice, i) => {
                 let btnClass = 'grammar-choice-btn';
                 if (grammarState.isAnswered) {
                   if (choice === grammarState.correct) btnClass += ' correct-choice';
                   else if (choice === grammarState.selectedChoice) btnClass += ' wrong-choice';
                   else btnClass += ' dim-choice';
                 }
                 return (
                   <button
                     key={i}
                     className={btnClass}
                     style={{ animationDelay: `${i * 0.08}s` }}
                     disabled={grammarState.isAnswered}
                     onClick={() => {
                       if (grammarState.isAnswered) return;
                       const isCorrect = choice === grammarState.correct;
                       playSound(isCorrect ? 'correct' : 'wrong');
                       if (isCorrect) { addConfetti(); triggerGoldReward(); }
                       const newCorrectCount = grammarState.correctCount + (isCorrect ? 1 : 0);
                       setGrammarState(prev => ({ ...prev, selectedChoice: choice, isAnswered: true, correctCount: newCorrectCount }));
                       setEnglishFeedback({
                         type: isCorrect ? 'correct' : 'wrong',
                         message: isCorrect
                           ? `🎉 Amazing! "${grammarState.correct}" is correct!`
                           : `❌ Not quite! The answer is "${grammarState.correct}".`
                       });
                       setTimeout(() => {
                         setEnglishFeedback(null);
                         if (currentQuestionIndex < grammarState.totalQuestions - 1) {
                           setCurrentQuestionIndex(prev => prev + 1);
                         } else {
                           const newCompleted = new Set(completedLevels);
                           newCompleted.add(currentLevel);
                           setCompletedLevels(newCompleted);
                           setShowLevelComplete(true);
                           playSound('celebration');
                         }
                       }, isCorrect ? 1800 : 2200);
                     }}
                   >
                     <span className="choice-letter">{['A','B','C','D'][i]}</span>
                     <span className="choice-word">{choice}</span>
                   </button>
                 );
               })}
             </div>
           </div>
         )}

         {/* 📝 SPELLING MODE UI (Original) */}
         {englishGameStyle === 'spelling' && (
           <>
             <button className="speaker-btn" onClick={() => speakWord(englishState.word)} aria-label="Listen to word">🔊</button>
             <p className="speaker-instruction">{language === 'en' ? 'Tap to listen!' : 'Pindutin upang makinig!'}</p>
             <div className="letter-boxes-container">
              {englishState.blanks.map((letter, index) => (
                 <div key={index} className={`letter-slot ${letter !== null ? 'filled' : ''}`} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, index)} onClick={() => handleBlankClick(index)}>{letter ? letter.toUpperCase() : '?'}</div>
              ))}
             </div>
             <p className="game-instruction">🔤 {language === 'en' ? 'Drag or tap letters to spell the word!' : 'I-drag o pindutin ang mga titik upang i-spell ang salita!'}</p>
             <div className="letter-pool">
              {englishState.pool.map((letter, i) => (
                 <div key={i} className={`letter-bubble ${englishState.usedIndices.includes(i) ? 'used' : ''} ${selectedLetter?.index === i ? 'selected' : ''}`} draggable={!englishState.usedIndices.includes(i)} onDragStart={(e) => handleDragStart(e, letter, i)} onClick={() => handlePoolClick(letter, i)} style={{ animationDelay: `${i * 0.1}s`, cursor: englishState.usedIndices.includes(i) ? 'default' : 'grab' }}>{letter.toUpperCase()}</div>
              ))}
             </div>
           </>
         )}
        </div>
   )}
      </div>
      <AppFooter />
      </>
      )}

      {showLevelComplete && (
  <div className="level-complete-screen">
    <div className="level-complete-content">
      <div className="celebration-emoji">🎉</div>

      {gameMode === 'practice' ? (
        <h2>Practice Complete! 🐝</h2>
      ) : (
        <h2>Level {currentLevel} Complete!</h2>
      )}

      {/* ── Scores ── */}
      {gameMode === 'practice' ? (
        <div className="practice-scores">
          {practiceRegularScore.total > 0 && (
            <p className="score-text">
              📝 Regular Questions: {practiceRegularScore.correct}/{practiceRegularScore.total} correct! ⭐
            </p>
          )}
          {practiceBossScore.total > 0 && (
            <p className="score-text boss-score-text">
              ⚔️ Boss Battle: {practiceBossScore.correct}/{practiceBossScore.total} correct! 🏆
            </p>
          )}
          {practiceRegularScore.total === 0 && practiceBossScore.total === 0 && (
            <p className="score-text">
              You got {activeGame === 'math' ? mathState.correctCount : englishState.correctCount}/
              {activeGame === 'math' ? mathState.totalQuestions : englishState.totalQuestions} correct! ⭐
            </p>
          )}
        </div>
      ) : (
        <p className="score-text">
          You got {activeGame === 'math' ? mathState.correctCount : englishState.correctCount}/
          {activeGame === 'math' ? mathState.totalQuestions : englishState.totalQuestions} correct! ⭐
        </p>
      )}

      <div className="stars-display">
        {(activeGame === 'math' ? mathState.correctCount : englishState.correctCount) >= (activeGame === 'math' ? mathState.totalQuestions : englishState.totalQuestions) ? '⭐⭐⭐' :
         (activeGame === 'math' ? mathState.correctCount : englishState.correctCount) >= (activeGame === 'math' ? mathState.totalQuestions : englishState.totalQuestions) * 0.6 ? '⭐⭐' : '⭐'}
      </div>

      <div className="level-complete-buttons">
        <button className="home-btn" onClick={() => { playSound('click'); goBackToHome(); }}>
          🏠 Go Back to Homepage
        </button>
        {gameMode === 'adventure' && currentLevel < 50 && (
          <button className="next-level-btn" onClick={() => proceedToNextLevel()}>
            🚀 Proceed to Level {currentLevel + 1}
          </button>
        )}
        {gameMode === 'adventure' && currentLevel === 50 && (
          <button className="next-level-btn" onClick={() => { playSound('celebration'); goBackToHome(); }}>
            🏆 You Finished All Levels!
          </button>
        )}
      </div>

      <div className="confetti-container">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="confetti"
            style={{
              left: `${Math.random() * 100}%`,
              backgroundColor: ['#FF6B6B', '#4ECDC4', '#FFD166', '#95E1D3', '#AA96DA'][Math.floor(Math.random() * 5)],
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
            }}
          ></div>
        ))}
      </div>
    </div>
  </div>
)}

      {showBadgeModal && (
        <div className="badge-modal-overlay" onClick={() => setShowBadgeModal(false)}>
          <div className="badge-modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setShowBadgeModal(false)}>✕</button>
            <h2 className="badge-modal-title">
              {selectedBadgeMode === 'math' ? '🧮 Math Badges' : '📚 English Badges'}
            </h2>
            <div className="badge-grid">
              {badgeSystem[selectedBadgeMode || 'math'].map((badge, index) => {
                const currentStars = selectedBadgeMode === 'math' ? mathStars : englishStars;
                const isUnlocked = currentStars >= badge.starsRequired;
                const progressToNext = Math.min(currentStars, badge.starsRequired);
                return (
                  <div key={index} className={`badge-card ${isUnlocked ? 'unlocked' : 'locked'}`}>
                    <div className="badge-card-image">
                      <img src={badge.image} alt={badge.name} className="badge-card-img" />
                      {!isUnlocked && <div className="badge-lock">🔒</div>}
                    </div>
                    <div className="badge-card-info">
                      <h3 className="badge-card-name">{badge.name}</h3>
                      <div className="badge-card-progress">
                        <span className="badge-stars-text">⭐ {progressToNext}/{badge.starsRequired}</span>
                      </div>
                      <p className="badge-card-requirement">
                        {isUnlocked ? '✅ Unlocked!' : `Reach ${badge.starsRequired} stars to unlock`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Rank-Up Animation Overlay ── */}
      {showRankUp && (
        <div className="rankup-overlay" onClick={() => setShowRankUp(null)}>
          <div className="rankup-modal">
            <div className="rankup-rays" />
            <div className="rankup-badge-wrap">
              <img src={showRankUp.image} alt={showRankUp.name} className="rankup-badge-img" />
            </div>
            <div className="rankup-label">RANK UP!</div>
            <div className="rankup-name">{showRankUp.name}</div>
            <p className="rankup-sub">You've reached a new rank! Keep it up! 🐝</p>
            <button className="rankup-close-btn" onClick={() => setShowRankUp(null)}>Awesome! ✨</button>
          </div>
        </div>
      )}

      {/* ── Boss Intro Modal ── */}
      {showBossIntroModal && (
        <div className="boss-intro-overlay">
          <div className="boss-intro-modal">
            <div className="boss-intro-gif-wrap">
              <img src="boss/bossbee.gif" alt="Boss Bee" className="boss-intro-gif" />
            </div>
            <h2 className="boss-intro-title">⚔️ Boss Battle!</h2>
            <p className="boss-intro-desc">
              The <strong>Queen Bee</strong> is waiting for you!<br/>
              Answer <strong>5 mini-challenges</strong> correctly to defeat her.<br/>
              Each correct answer lowers her life bar. Good luck! 🍀
            </p>
            <button className="boss-intro-btn" onClick={startBossFromModal}>
              ⚔️ Fight!
            </button>
          </div>
        </div>
      )}

      {showShop && (
        <Shop
          goldCount={goldCount}
          ownedAvatars={ownedAvatars}
          equippedAvatar={equippedAvatar}
          onBuy={handleBuyAvatar}
          onEquip={handleEquipAvatar}
          onClose={() => setShowShop(false)}
        />
      )}

      {showLeaderboard && (
        <Leaderboard
          currentNickname={nickname}
          onClose={() => setShowLeaderboard(false)}
          leaderboardKey={LB_KEY_ADVENTURE}
          registeredNicknames={new Set(
            users.filter(u => u.role === 'student' && u.nickname && u.nickname.trim()).map(u => u.nickname.trim())
          )}
        />
      )}

      {showSettings && (
        <div className="settings-modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="settings-modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setShowSettings(false)}>✕</button>
            <h2 className="settings-modal-title">⚙️ Settings</h2>
            
            <div className="settings-group">
              <label className="settings-label">🌍 Language</label>
              <div className="language-buttons">
                <button 
                  className={`lang-btn ${language === 'en' ? 'active' : ''}`}
                  onClick={() => {
                    if (language !== 'en') {
                      setPendingLanguage('en');
                      setShowLanguageConfirm(true);
                    }
                    playSound('click');
                  }}
                >
                  🇬🇧 English
                </button>
                <button 
                  className={`lang-btn ${language === 'tl' ? 'active' : ''}`}
                  onClick={() => {
                    if (language !== 'tl') {
                      setPendingLanguage('tl');
                      setShowLanguageConfirm(true);
                    }
                    playSound('click');
                  }}
                >
                  🇵🇭 Tagalog
                </button>
              </div>
            </div>

                     <div className="settings-group">
           <label className="settings-label">🎮 Game Mode</label>
           <div className="mode-switch-container">
             <button className={`mode-switch-btn ${gameMode === 'adventure' ? 'active' : ''}`} onClick={handleAdventureSwitch}>
               🗺️ Adventure
             </button>
             <button className={`mode-switch-btn ${gameMode === 'practice' ? 'active' : ''}`} onClick={handlePracticeSwitch}>
               📖 Practice
             </button>
           </div>
         </div>

         {isLoggedIn && currentUser?.role === 'admin' && (
           <button className="admin-access-btn" onClick={() => setShowAdmin(true)}>👑 Admin Panel</button>
         )}
         {isLoggedIn && (
           <button className="logout-btn" onClick={handleLogout}>🚪 Logout</button>
         )}

         <div className="settings-group">
           <label className="settings-label">🎵 Background Music</label>
              <button 
                className={`music-toggle ${musicEnabled ? 'on' : 'off'}`}
                onClick={() => {
                  setMusicEnabled(!musicEnabled);
                  playSound('click');
                }}
              >
                <span className="speaker-icon">{musicEnabled ? '🔊' : '🔇'}</span>
                <span className="music-status">{musicEnabled ? 'On' : 'Off'}</span>
              </button>
            </div>

            <button className="close-settings-btn" onClick={() => { playSound('click'); setShowSettings(false); }}>
              {translations[language].back}
            </button>
          </div>
        </div>
      )}

  {showLogin && !isLoggedIn && (
    <div className="login-overlay" onClick={() => setShowLogin(false)}>
      <div
        className={`login-card ${loginForm.username.toLowerCase() === 'admin' ? 'login-card--admin' : ''}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Decorative admin crown — only visible in admin mode */}
        {loginForm.username.toLowerCase() === 'admin' && (
          <div className="login-admin-crown" aria-hidden="true">👑</div>
        )}

        <div className="login-header">
          {loginForm.username.toLowerCase() === 'admin' ? '👑 Admin Access' : '🔐 Practice Login'}
        </div>

        <p className={loginForm.username.toLowerCase() === 'admin' ? 'login-admin-sub' : ''}>
          {loginForm.username.toLowerCase() === 'admin'
            ? 'Elevated credentials required'
            : 'Enter your credentials to access Practice Mode'}
        </p>

        <input
          type="text"
          placeholder="Username"
          value={loginForm.username}
          onChange={e => setLoginForm({...loginForm, username: e.target.value})}
          className={`auth-input ${loginForm.username.toLowerCase() === 'admin' ? 'auth-input--admin' : ''}`}
          autoComplete="off"
        />
        <div className="auth-pw-wrapper">
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            value={loginForm.password}
            onChange={e => setLoginForm({...loginForm, password: e.target.value})}
            className={`auth-input ${loginForm.username.toLowerCase() === 'admin' ? 'auth-input--admin' : ''}`}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
          <button
            type="button"
            className="auth-pw-toggle"
            onClick={() => setShowPassword(p => !p)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            )}
          </button>
        </div>

        {loginMsg && <p className="auth-error-msg">{loginMsg}</p>}

        <button
          className={`auth-btn primary ${loginForm.username.toLowerCase() === 'admin' ? 'auth-btn--admin' : ''}`}
          onClick={handleLogin}
        >
          {loginForm.username.toLowerCase() === 'admin' ? '👑 Enter Admin Panel' : '🚀 Login'}
        </button>

        <button className="auth-btn secondary" onClick={() => setShowLogin(false)}>← Back to Adventure</button>
      </div>
    </div>
  )}

  {showAdmin && currentUser?.role === 'admin' && (
    <div className="admin-overlay" onClick={() => setShowAdmin(false)}>
      <div className="admin-panel" onClick={e => e.stopPropagation()}>
        <button className="admin-close-btn" onClick={() => setShowAdmin(false)}>✕</button>
        <h2>👑 Admin Dashboard</h2>
        <div className="admin-tabs">
          <button className={`admin-tab ${adminTab === 'create' ? 'active' : ''}`} onClick={() => setAdminTab('create')}>➕ Create Account</button>
          <button className={`admin-tab ${adminTab === 'list' ? 'active' : ''}`} onClick={() => setAdminTab('list')}>📋 Student List</button>
        </div>

        {adminTab === 'create' && (
          <div className="admin-form">
            <input type="text" placeholder="Username" value={adminForm.username} onChange={e => setAdminForm({...adminForm, username: e.target.value})} className="auth-input" />
            <input type="password" placeholder="Password" value={adminForm.password} onChange={e => setAdminForm({...adminForm, password: e.target.value})} className="auth-input" />
            <select value={adminForm.role} onChange={e => setAdminForm({...adminForm, role: e.target.value})} className="auth-input">
              <option value="student">🎒 Student</option>
              <option value="admin">👑 Admin</option>
            </select>
            <button className="auth-btn primary" onClick={handleCreateUser}>✅ Create Account</button>
          </div>
        )}

        {adminTab === 'list' && (
          <div className="admin-list">
            {users.map(u => (
              <div key={u.id} className="user-row">
                <div className="user-avatar">{u.role === 'admin' ? '👑' : '🎒'}</div>
                <div className="user-info">
                  <span className="user-name">{u.username}</span>
                  <span className="user-role">{u.role === 'admin' ? 'Administrator' : 'Student'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )}


      {showLanguageConfirm && (
        <div className="confirm-modal-overlay" onClick={() => setShowLanguageConfirm(false)}>
          <div className="confirm-modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="confirm-modal-title">
              {language === 'en' ? 'Confirm Language Change?' : 'Kumpirmahin ang Pagbabago ng Wika?'}
            </h2>
            <p className="confirm-modal-text">
              {language === 'en' 
                ? 'Switch to Tagalog? All text and words will change.' 
                : 'Magbago sa English? Ang lahat ng teksto at mga salita ay magbabago.'}
            </p>
            <div className="confirm-buttons">
              <button 
                className="confirm-yes-btn"
                onClick={() => {
                  setLanguage(pendingLanguage);
                  setShowLanguageConfirm(false);
                  setPendingLanguage(null);
                  playSound('unlock');
                }}
              >
                {language === 'en' ? 'Yes' : 'Oo'}
              </button>
              <button 
                className="confirm-no-btn"
                onClick={() => {
                  setShowLanguageConfirm(false);
                  setPendingLanguage(null);
                  playSound('click');
                }}
              >
                {language === 'en' ? 'No' : 'Hindi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confetti.map(c => (
        <div
          key={c.id}
          className="confetti-piece"
          style={{
            left: `${c.left}%`,
            top: `${c.top || -10}px`,
            backgroundColor: c.color,
            width: `${c.size || 10}px`,
            height: `${c.size || 10}px`,
            animationDelay: `${c.delay || 0}s`
          }}
        />
      ))}

      {flyingGolds.length > 0 && (
  <div className="flying-gold-container">
    {flyingGolds.map(goldId => (
      <div key={goldId} className="flying-gold">🪙</div>
    ))}
  </div>
)}

      {isTransitioning && (
        <div className="transition-overlay">
          <div className="transition-circle active"></div>
        </div>
      )}

        </>
      )}

      {confirmAction && (
        <div className="confirm-modal-overlay playful-confirm" onClick={closeConfirmModal}>
          <div className={`confirm-modal-content ${confirmAction.tone || ''}`} onClick={e => e.stopPropagation()}>
            <div className="confirm-modal-icon" aria-hidden="true">{confirmAction.icon}</div>
            <h2 className="confirm-modal-title">{confirmAction.title}</h2>
            <p className="confirm-modal-text">{confirmAction.message}</p>
            <div className="confirm-buttons">
              <button className="confirm-yes-btn" onClick={confirmModalAction}>
                {confirmAction.confirmText}
              </button>
              <button className="confirm-no-btn" onClick={closeConfirmModal}>
                {confirmAction.cancelText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🤖 AI Module Upload Modal */}
      {showModuleUpload && (
        <div
          onClick={() => setShowModuleUpload(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.88)',
            backdropFilter: 'blur(10px)',
            zIndex: 9999,
            display: 'flex', alignItems: 'center',
            justifyContent: 'center', padding: '20px',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
              borderRadius: '24px', padding: '28px',
              maxWidth: '600px', width: '100%',
              boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
              border: '1px solid rgba(255,255,255,0.1)',
              maxHeight: '90vh', overflowY: 'auto',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: '#fff', margin: 0, fontSize: '20px' }}>
                🤖 AI Question Generator
              </h3>
              <button
                onClick={() => setShowModuleUpload(false)}
                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: '34px', height: '34px', color: '#fff', fontSize: '16px', cursor: 'pointer' }}
              >✕</button>
            </div>

            {moduleStep === 'upload' && (
              <>
                <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '20px', fontSize: '14px' }}>
                  Upload a PDF or Word document and our AI will automatically generate 10 practice questions based on its content!
                </p>

                          {/* 📚 Subject Selector */}
             <div style={{ marginBottom: '16px' }}>
               <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', display: 'block', marginBottom: '6px' }}>
                 📚 Select Subject for AI Generation:
               </label>
               <select
                 value={moduleSubject}
                 onChange={(e) => setModuleSubject(e.target.value)}
                 style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: '14px', cursor: 'pointer' }}
               >
                 <option value="english">📚 English</option>
                 <option value="math">🔢 Math</option>
               </select>
             </div>

             {/* Question Type Configuration */}
             <div style={{ marginBottom: '20px', background: 'rgba(240,147,251,0.05)', border: '1px solid rgba(240,147,251,0.2)', borderRadius: '12px', padding: '14px' }}>
               <p style={{ color: '#f093fb', fontWeight: 700, margin: '0 0 12px', fontSize: '13px' }}>���️ Customize Question Types:</p>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                 {moduleSubject === 'english' ? (
                   <>
                     <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                       <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', flex: 1 }}>🔤 Spelling Questions:</label>
                       <input type="number" min="0" max="10" value={moduleQuestionConfig.spelling ?? 3} onChange={(e) => { const v = e.target.value; if (v === '' || /^\d{0,2}$/.test(v)) setModuleQuestionConfig({...moduleQuestionConfig, spelling: v === '' ? '' : Number(v)}); }} style={{ width: '60px', padding: '6px', borderRadius: '6px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', textAlign: 'center' }} />
                     </div>
                     <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                       <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', flex: 1 }}>🎙️ Speech Aloud Questions:</label>
                       <input type="number" min="0" max="10" value={moduleQuestionConfig.speech ?? 2} onChange={(e) => { const v = e.target.value; if (v === '' || /^\d{0,2}$/.test(v)) setModuleQuestionConfig({...moduleQuestionConfig, speech: v === '' ? '' : Number(v)}); }} style={{ width: '60px', padding: '6px', borderRadius: '6px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', textAlign: 'center' }} />
                     </div>
                     <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                       <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', flex: 1 }}>📝 Grammar Checker Questions:</label>
                       <input type="number" min="0" max="10" value={moduleQuestionConfig.grammar_checker ?? 2} onChange={(e) => { const v = e.target.value; if (v === '' || /^\d{0,2}$/.test(v)) setModuleQuestionConfig({...moduleQuestionConfig, grammar_checker: v === '' ? '' : Number(v)}); }} style={{ width: '60px', padding: '6px', borderRadius: '6px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', textAlign: 'center' }} />
                     </div>
                     <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                       <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', flex: 1 }}>⚔️ Boss Battle Sets:</label>
                       <input type="number" min="0" max="10" value={moduleQuestionConfig.boss_battle ?? 2} onChange={(e) => { const v = e.target.value; if (v === '' || /^\d{0,2}$/.test(v)) setModuleQuestionConfig({...moduleQuestionConfig, boss_battle: v === '' ? '' : Number(v)}); }} style={{ width: '60px', padding: '6px', borderRadius: '6px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', textAlign: 'center' }} />
                     </div>
                   </>
                 ) : (
                   <>
                     <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                       <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', flex: 1 }}>🔢 Arithmetic Questions:</label>
                       <input type="number" min="0" max="10" value={moduleQuestionConfig.arithmetic ?? 3} onChange={(e) => { const v = e.target.value; if (v === '' || /^\d{0,2}$/.test(v)) setModuleQuestionConfig({...moduleQuestionConfig, arithmetic: v === '' ? '' : Number(v)}); }} style={{ width: '60px', padding: '6px', borderRadius: '6px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', textAlign: 'center' }} />
                     </div>
                     <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                       <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', flex: 1 }}>⚔️ Boss Battle Sets:</label>
                       <input type="number" min="0" max="10" value={moduleQuestionConfig.boss_battle ?? 2} onChange={(e) => { const v = e.target.value; if (v === '' || /^\d{0,2}$/.test(v)) setModuleQuestionConfig({...moduleQuestionConfig, boss_battle: v === '' ? '' : Number(v)}); }} style={{ width: '60px', padding: '6px', borderRadius: '6px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', textAlign: 'center' }} />
                     </div>
                   </>
                 )}
               </div>
             </div>

                {/* Drop Zone */}
                <div
                  onDragOver={e => { e.preventDefault(); setModuleDragOver(true); }}
                  onDragLeave={() => setModuleDragOver(false)}
                  onDrop={e => {
                    e.preventDefault();
                    setModuleDragOver(false);
                    const file = e.dataTransfer.files[0];
                    if (file && (file.name.endsWith('.pdf') || file.name.endsWith('.docx') || file.name.endsWith('.doc'))) {
                      setModuleFile(file);
                      setModuleFileName(file.name);
                    } else {
                      alert('⚠️ Please upload a PDF or Word (.docx) file only!');
                    }
                  }}
                  onClick={() => document.getElementById('module-file-input').click()}
                  style={{
                    border: `3px dashed ${moduleDragOver ? '#f093fb' : 'rgba(255,255,255,0.25)'}`,
                    borderRadius: '16px',
                    padding: '40px 20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: moduleDragOver ? 'rgba(240,147,251,0.1)' : 'rgba(255,255,255,0.05)',
                    transition: 'all 0.2s',
                    marginBottom: '16px',
                  }}
                >
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>
                    {moduleFileName ? '📄' : '📂'}
                  </div>
                  <p style={{ color: '#fff', fontWeight: 700, margin: '0 0 6px' }}>
                    {moduleFileName || 'Drop your file here'}
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', margin: 0 }}>
                    {moduleFileName ? '✅ File ready!' : 'or click to browse — PDF or Word (.docx)'}
                  </p>
                  <input
                    id="module-file-input"
                    type="file"
                    accept=".pdf,.docx,.doc"
                    style={{ display: 'none' }}
                    onChange={e => {
                      const file = e.target.files[0];
                      if (file) { setModuleFile(file); setModuleFileName(file.name); }
                    }}
                  />
                </div>

                {/* Info box - Dynamic based on config */}
                <div style={{ background: 'rgba(240,147,251,0.1)', border: '1px solid rgba(240,147,251,0.3)', borderRadius: '12px', padding: '14px', marginBottom: '20px' }}>
                  <p style={{ color: '#f093fb', fontWeight: 700, margin: '0 0 8px', fontSize: '13px' }}>🤖 AI will generate:</p>
                  <ul style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', margin: 0, paddingLeft: '18px', lineHeight: '1.8' }}>
                    {moduleSubject === 'english' ? (
                      <>
                        {moduleQuestionConfig.spelling > 0 && <li>{moduleQuestionConfig.spelling} Spelling question{moduleQuestionConfig.spelling !== 1 ? 's' : ''}</li>}
                        {moduleQuestionConfig.speech > 0 && <li>{moduleQuestionConfig.speech} Speech Aloud question{moduleQuestionConfig.speech !== 1 ? 's' : ''}</li>}
                        {moduleQuestionConfig.grammar_checker > 0 && <li>{moduleQuestionConfig.grammar_checker} Grammar Checker question{moduleQuestionConfig.grammar_checker !== 1 ? 's' : ''}</li>}
                        {moduleQuestionConfig.boss_battle > 0 && <li>{moduleQuestionConfig.boss_battle} Boss Battle set{moduleQuestionConfig.boss_battle !== 1 ? 's' : ''} (5 words each)</li>}
                      </>
                    ) : (
                      <>
                        {moduleQuestionConfig.arithmetic > 0 && <li>{moduleQuestionConfig.arithmetic} Arithmetic question{moduleQuestionConfig.arithmetic !== 1 ? 's' : ''}</li>}
                        {moduleQuestionConfig.boss_battle > 0 && <li>{moduleQuestionConfig.boss_battle} Boss Battle set{moduleQuestionConfig.boss_battle !== 1 ? 's' : ''} (5 words each)</li>}
                      </>
                    )}
                  </ul>
                </div>

                {/* Buttons */}
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => setShowModuleUpload(false)}
                    style={{ flex: 1, padding: '13px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 700, fontSize: '15px', cursor: 'pointer' }}
                  >Cancel</button>
                  <button
                    onClick={handleGenerateFromModule}
                    disabled={!moduleFile || moduleGenerating}
                    style={{
                      flex: 2, padding: '13px',
                      background: moduleFile ? 'linear-gradient(135deg, #f093fb, #f5576c)' : 'rgba(255,255,255,0.1)',
                      border: 'none', borderRadius: '12px',
                      color: '#fff', fontWeight: 800, fontSize: '15px',
                      cursor: moduleFile ? 'pointer' : 'not-allowed',
                      opacity: moduleGenerating ? 0.7 : 1,
                    }}
                  >
                    {moduleGenerating ? '🤖 AI is reading your module...' : '🚀 Generate Questions'}
                  </button>
                </div>
              </>
            )}

            {moduleStep === 'review' && (
              <>
                <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '16px', fontSize: '14px' }}>
                  ✅ AI generated <strong style={{ color: '#f093fb' }}>{moduleGeneratedQs.length} questions</strong> from <strong style={{ color: '#fff' }}>{moduleFileName}</strong>. Review them below:
                </p>

                {/* Questions list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px', maxHeight: '380px', overflowY: 'auto' }}>
                  {moduleGeneratedQs.map((q, i) => (
                    <div key={i} style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '12px', padding: '14px', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ color: '#f093fb', fontWeight: 700, fontSize: '13px' }}>
                          {q.style === 'spelling' ? '🔤 Spelling' :
                           q.style === 'speech' ? '🎙️ Speech Aloud' :
                           q.style === 'grammar_checker' ? '📝 Grammar Checker' :
                           q.style === 'boss_battle' ? '⚔️ Boss Battle' :
                           q.style === 'arithmetic' ? '🔢 Arithmetic' : q.style}
                        </span>
                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>
                          {q.subject === 'math' ? '🔢 Math' : '📚 English'}
                        </span>
                      </div>
                      <p style={{ color: '#fff', fontWeight: 700, margin: '0 0 4px', fontSize: '15px' }}>
                        {q.targetWord}
                      </p>
                      {q.style === 'grammar_checker' && (
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', margin: 0 }}>
                          {q.grammarSentence}
                        </p>
                      )}
                      {q.style === 'boss_battle' && (
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', margin: 0 }}>
                          Words: {(q.bossBattleQuestions || []).join(', ')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Buttons */}
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => setModuleStep('upload')}
                    style={{ flex: 1, padding: '13px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 700, fontSize: '15px', cursor: 'pointer' }}
                  >⬅️ Try Again</button>
                  <button
                    onClick={handleSaveGeneratedQuestions}
                    style={{ flex: 2, padding: '13px', background: 'linear-gradient(135deg, #43e97b, #38f9d7)', border: 'none', borderRadius: '12px', color: '#1a1a2e', fontWeight: 800, fontSize: '15px', cursor: 'pointer' }}
                  >✅ Save All Questions</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    {/* 👁️ Style Preview Modal */}
      {showStylePreview && (
        <div
          onClick={() => setShowStylePreview(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
              borderRadius: '20px',
              padding: '20px',
              maxWidth: '700px',
              width: '100%',
              boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ color: '#fff', margin: 0, fontSize: '18px' }}>
                👁️ Game Preview —{' '}
                {previewStyle === 'spelling' ? '🔤 Spelling' :
                 previewStyle === 'speech' ? '🎙️ Speech Aloud' :
                 previewStyle === 'grammar_checker' ? '📝 Grammar Checker' :
                 previewStyle === 'boss_battle' ? '⚔️ Boss Battle' :
                 previewStyle === 'arithmetic' ? '🔢 Arithmetic' : ''}
              </h3>
              <button
                onClick={() => setShowStylePreview(false)}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none', borderRadius: '50%',
                  width: '32px', height: '32px',
                  color: '#fff', fontSize: '16px',
                  cursor: 'pointer',
                }}
              >✕</button>
            </div>
            <img
              src={stylePreviewMap[previewStyle]}
              alt={`${previewStyle} preview`}
              style={{
                width: '100%',
                borderRadius: '12px',
                border: '2px solid rgba(255,255,255,0.15)',
              }}
            />
            <p style={{ color: 'rgba(255,255,255,0.7)', marginTop: '12px', fontSize: '13px', textAlign: 'center' }}>
              {previewStyle === 'spelling' && '🔤 Students drag and drop letters to spell the target word correctly.'}
              {previewStyle === 'speech' && '🎙️ Students listen to the word being read aloud and spell it out.'}
              {previewStyle === 'grammar_checker' && '📝 Students choose the correct word to fill in the blank sentence.'}
              {previewStyle === 'boss_battle' && '⚔️ Students answer 5 questions to defeat the boss character.'}
              {previewStyle === 'arithmetic' && '🔢 Students solve the math equation by filling in the missing number.'}
            </p>
            <button
              onClick={() => setShowStylePreview(false)}
              style={{
                display: 'block', width: '100%', marginTop: '14px',
                padding: '12px',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                border: 'none', borderRadius: '12px',
                color: '#fff', fontWeight: 700, fontSize: '15px',
                cursor: 'pointer',
              }}
            >Got it! ✅</button>
          </div>
        </div>
      )}
    {/* 👁️ Style Preview Modal */}
      {showStylePreview && (
        <div
          onClick={() => setShowStylePreview(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
              borderRadius: '20px',
              padding: '20px',
              maxWidth: '700px',
              width: '100%',
              boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ color: '#fff', margin: 0, fontSize: '18px' }}>
                👁️ Game Preview —{' '}
                {previewStyle === 'spelling' ? '🔤 Spelling' :
                 previewStyle === 'speech' ? '🎙️ Speech Aloud' :
                 previewStyle === 'grammar_checker' ? '📝 Grammar Checker' :
                 previewStyle === 'boss_battle' ? '⚔️ Boss Battle' :
                 previewStyle === 'arithmetic' ? '🔢 Arithmetic' : ''}
              </h3>
              <button
                onClick={() => setShowStylePreview(false)}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none', borderRadius: '50%',
                  width: '32px', height: '32px',
                  color: '#fff', fontSize: '16px',
                  cursor: 'pointer',
                }}
              >✕</button>
            </div>
            <img
              src={stylePreviewMap[previewStyle]}
              alt={`${previewStyle} preview`}
              style={{
                width: '100%',
                borderRadius: '12px',
                border: '2px solid rgba(255,255,255,0.15)',
              }}
            />
            <p style={{ color: 'rgba(255,255,255,0.7)', marginTop: '12px', fontSize: '13px', textAlign: 'center' }}>
              {previewStyle === 'spelling' && '🔤 Students drag and drop letters to spell the target word correctly.'}
              {previewStyle === 'speech' && '🎙️ Students listen to the word being read aloud and spell it out.'}
              {previewStyle === 'grammar_checker' && '📝 Students choose the correct word to fill in the blank sentence.'}
              {previewStyle === 'boss_battle' && '⚔️ Students answer 5 questions to defeat the boss character.'}
              {previewStyle === 'arithmetic' && '🔢 Students solve the math equation by filling in the missing number.'}
            </p>
            <button
              onClick={() => setShowStylePreview(false)}
              style={{
                display: 'block', width: '100%', marginTop: '14px',
                padding: '12px',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                border: 'none', borderRadius: '12px',
                color: '#fff', fontWeight: 700, fontSize: '15px',
                cursor: 'pointer',
              }}
            >Got it! ✅</button>
          </div>
        </div>
      )}
    </div>
  );
}

// Initialize speech synthesis on app load (critical for Android/Capacitor apps)
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  try {
    const preloadVoices = () => {
      if (window.speechSynthesis && window.speechSynthesis.getVoices) {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          console.log('Speech synthesis ready with ' + voices.length + ' voices');
        }
      }
    };
    preloadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = preloadVoices;
    }
  } catch (error) {
    console.warn('Error preloading speech synthesis:', error);
  }
}

export default App;