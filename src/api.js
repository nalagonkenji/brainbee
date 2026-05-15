const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// ── Helper ──────────────────────────────
const getToken = () => localStorage.getItem('brainbee_token');

const headers = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${getToken()}`,
});

// ── Auth ────────────────────────────────
export const apiLogin = (username, password) =>
  fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  }).then(r => r.json());

export const apiRegister = (data) =>
  fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data),
  }).then(r => r.json());

export const apiGetUsers = () =>
  fetch(`${BASE_URL}/auth/users`, {
    headers: headers(),
  }).then(r => r.json());

export const apiDeleteUser = (id) =>
  fetch(`${BASE_URL}/auth/users/${id}`, {
    method: 'DELETE',
    headers: headers(),
  }).then(r => r.json());

// ── Player Data ─────────────────────────
export const apiGetPlayer = (mode) =>
  fetch(`${BASE_URL}/player/${mode}`, {
    headers: headers(),
  }).then(r => r.json());

export const apiSavePlayer = (mode, data) =>
  fetch(`${BASE_URL}/player/${mode}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(data),
  }).then(r => r.json());

export const apiSaveHistory = (data) =>
  fetch(`${BASE_URL}/player/history`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data),
  }).then(r => r.json());

export const apiGetHistory = (mode) =>
  fetch(`${BASE_URL}/player/history/${mode}`, {
    headers: headers(),
  }).then(r => r.json());

// ── Leaderboard ─────────────────────────
export const apiGetLeaderboard = (mode) =>
  fetch(`${BASE_URL}/leaderboard/${mode}`, {
    headers: headers(),
  }).then(r => r.json());

// ── Questions ───────────────────────────
export const apiGetQuestions = (subject) =>
  fetch(`${BASE_URL}/questions${subject ? `?subject=${subject}` : ''}`, {
    headers: headers(),
  }).then(r => r.json());

export const apiSaveQuestion = (data) =>
  fetch(`${BASE_URL}/questions`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data),
  }).then(r => r.json());

export const apiEditQuestion = (id, data) =>
  fetch(`${BASE_URL}/questions/${id}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(data),
  }).then(r => r.json());

export const apiDeleteQuestion = (id) =>
  fetch(`${BASE_URL}/questions/${id}`, {
    method: 'DELETE',
    headers: headers(),
  }).then(r => r.json());

// ── 🤖 AI Question Generation ───────────
/**
 * Generate questions from PDF using Google Gemini AI
 * @param {File} pdfFile - The PDF file to process
 * @param {string} subject - Either 'math' or 'english'
 * @param {Object} styleConfig - Configuration for question types, e.g., { spelling: 3, speech: 2, grammar_checker: 2, boss_battle: 2, arithmetic: 1 }
 * @returns {Promise<Object>} - { success, message, questions }
 */
export const apiGenerateQuestions = (pdfFile, subject, styleConfig = {}) => {
  const formData = new FormData();
  formData.append('file', pdfFile);
  formData.append('subject', subject);
  formData.append('styleConfig', JSON.stringify(styleConfig));

  return fetch(`${BASE_URL}/questions/generate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      // Don't set Content-Type - browser will set it automatically with boundary
    },
    body: formData,
  }).then(r => r.json());
};
