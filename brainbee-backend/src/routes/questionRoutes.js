const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// ─────────────────────────────────────────────────────────────
// 🔑 API KEY VALIDATION
// ─────────────────────────────────────────────────────────────
if (!process.env.OPENROUTER_API_KEY) {
  console.error(
    '\n[questionRoutes] ⚠️  OPENROUTER_API_KEY is NOT set in your .env file!\n' +
    '                     AI question generation will fail until you add it.\n' +
    '                     Get a free key at: https://openrouter.ai\n'
  );
}

// ── DOCX support via mammoth ───────────────────────────────
let mammoth = null;
try {
  mammoth = require('mammoth');
} catch (_) {
  console.warn(
    '[questionRoutes] ⚠️  mammoth is not installed. DOCX uploads will be rejected.\n' +
    '                     Fix: cd into your backend folder and run: npm install mammoth'
  );
}

// ─────────────────────────────────────────────────────────────
// 📤 Multer Configuration
// ─────────────────────────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.pdf', '.docx', '.doc'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF (.pdf) and Word (.docx / .doc) files are allowed.'), false);
    }
  },
});

const uploadSingle = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      const msg =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'File is too large. Maximum allowed size is 15 MB.'
          : err.message || 'File upload failed.';
      return res.status(400).json({ success: false, error: msg });
    }
    next();
  });
};

// ─────────────────────────────────────────────────────────────
// 🧠 ROBUST JSON PARSER
// ─────────────────────────────────────────────────────────────
const parseAIJSON = (text) => {
  if (!text || typeof text !== 'string') return null;

  // Strategy 1: Clean direct parse
  try {
    return JSON.parse(text.trim());
  } catch (_) {}

  // Strategy 2: Strip markdown code blocks
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch (_) {}
  }

  // Strategy 3: Extract first array [...]
  const arrMatch = text.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    try {
      return JSON.parse(arrMatch[0]);
    } catch (_) {}
  }

  // Strategy 4: Fix trailing commas
  if (arrMatch) {
    try {
      const fixed = arrMatch[0]
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']');
      return JSON.parse(fixed);
    } catch (_) {}
  }

  return null;
};

// ─────────────────────────────────────────────────────────────
// 🗂️ FILE TEXT EXTRACTION
// ─────────────────────────────────────────────────────────────
const extractFileData = async (file) => {
  const ext = path.extname(file.originalname).toLowerCase();

  // ── DOCX / DOC ──────────────────────────────────────────
  if (ext === '.docx' || ext === '.doc') {
    if (!mammoth) {
      throw new Error('DOCX support requires mammoth. Run: npm install mammoth in your backend folder.');
    }
    try {
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      const text = result.value;
      if (!text || text.trim().length < 10) {
        throw new Error('The Word document appears to be empty or contains no readable text.');
      }
      console.log(`[AI-Gen] DOCX extracted: ${text.length} characters`);
      return { type: 'text', content: text.trim() };
    } catch (err) {
      throw new Error(`Failed to parse DOCX file: ${err.message}`);
    }
  }

  // ── PDF ─────────────────────────────────────────────────
  if (ext === '.pdf') {
    const header = file.buffer.slice(0, 5).toString('ascii');
    if (!header.startsWith('%PDF')) {
      throw new Error('The uploaded file does not appear to be a valid PDF.');
    }
    if (file.buffer.length > 10 * 1024 * 1024) {
      throw new Error('PDF is too large for AI processing (max 10 MB). Try splitting the document.');
    }
    try {
      // Pure JS PDF text extraction — no extra packages needed
      const raw = file.buffer.toString('latin1');
      const chunks = [];
      // Extract text from BT...ET blocks
      const btMatches = raw.match(/BT[\s\S]*?ET/g) || [];
      for (const block of btMatches) {
        const tjMatches = block.match(/\(([^)]{1,300})\)\s*T[jJ]/g) || [];
        for (const tj of tjMatches) {
          const inner = tj.match(/\(([^)]*)\)/);
          if (inner) chunks.push(inner[1]);
        }
        const arrMatches = block.match(/\[([^\]]{1,500})\]\s*TJ/g) || [];
        for (const arr of arrMatches) {
          const words = arr.match(/\(([^)]*)\)/g) || [];
          chunks.push(words.map(w => w.replace(/^\(|\)$/g, '')).join(''));
        }
      }
      // Also grab plain text strings scattered in the PDF
      const plainMatches = raw.match(/\(([A-Za-z][A-Za-z0-9 ,.'\-]{3,80})\)/g) || [];
      for (const m of plainMatches) chunks.push(m.slice(1, -1));

      const text = chunks
        .join(' ')
        .replace(/[^\x20-\x7E\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (!text || text.length < 20) {
        throw new Error('No readable text found. The PDF may be a scanned image. Please use a DOCX file instead.');
      }
      console.log(`[AI-Gen] PDF text extracted: ${text.length} characters`);
      return { type: 'text', content: text };
    } catch (err) {
      throw new Error(`Failed to extract text from PDF: ${err.message}`);
    }
  }

  throw new Error(`Unsupported file type: ${ext}`);
};

// ─────────────────────────────────────────────────────────────
// 🤖 CALL OPENROUTER API
// ─────────────────────────────────────────────────────────────
const callOpenRouter = async (fileData, prompt) => {
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
  // Free model — no credit card needed
  const MODEL = process.env.OPENROUTER_MODEL || 'deepseek/deepseek-v3:free';

  // All files are now plain text (PDF text extracted via pdf-parse, DOCX via mammoth)
  const excerpt = fileData.content.substring(0, 30000);
  const userContent = [
    {
      type: 'text',
      text: `Document content:\n\n${excerpt}\n\n${prompt}`,
    },
  ];

  const body = {
    model: MODEL,
    max_tokens: 2000,
    messages: [
      {
        role: 'system',
        content:
          'You are an expert educational question generator. ' +
          'Always respond ONLY with a valid raw JSON array. ' +
          'No markdown, no code fences, no explanation text. ' +
          'The first character of your response must be [ and the last must be ].',
      },
      {
        role: 'user',
        content: userContent,
      },
    ],
  };

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:5000', // required by OpenRouter
      'X-Title': 'BrainBee Question Generator',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const errMsg = errData?.error?.message || `HTTP ${response.status}`;
    throw new Error(errMsg);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content || '';
  return text;
};

// ─────────────────────────────────────────────────────────────
// 🔀 Shuffle helper
// ─────────────────────────────────────────────────────────────
const shuffleArray = (arr) => [...arr].sort(() => Math.random() - 0.5);

// ═══════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════

// ─────────────────────────────────────────
// GET /api/questions
// ─────────────────────────────────────────
router.get('/', verifyToken, async (req, res) => {
  const { subject } = req.query;
  try {
    let query = 'SELECT * FROM practice_questions ORDER BY created_at ASC';
    let params = [];
    if (subject) {
      query = 'SELECT * FROM practice_questions WHERE subject = $1 ORDER BY created_at ASC';
      params = [subject];
    }
    const result = await pool.query(query, params);
    const questions = result.rows.map((q) => ({
      id: q.id,
      subject: q.subject,
      style: q.style,
      targetWord: q.target_word,
      createdAt: q.created_at,
      ...q.data,
    }));
    res.json(questions);
  } catch (err) {
    console.error('[GET /questions]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/questions/generate
// ─────────────────────────────────────────────────────────────
router.post('/generate', verifyAdmin, uploadSingle, async (req, res) => {
  try {
    // ── Validate OpenRouter API key ──────────────────────
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'OpenRouter API key is not configured. Add OPENROUTER_API_KEY to your .env file. Get a free key at https://openrouter.ai',
      });
    }

    // ── Validate request body ────────────────────────────
    const { subject, styleConfig = '{}' } = req.body;
    if (!subject || !['math', 'english'].includes(subject)) {
      return res.status(400).json({ success: false, error: 'Invalid subject. Must be "math" or "english".' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file was uploaded.' });
    }

    // ── Parse styleConfig ────────────────────────────────
    let config = {};
    try {
      config = typeof styleConfig === 'string' ? JSON.parse(styleConfig) : styleConfig;
    } catch (_) {
      config = {};
    }

    if (Object.keys(config).length === 0) {
      config = subject === 'english'
        ? { spelling: 3, speech: 2, grammar_checker: 2, boss_battle: 2 }
        : { arithmetic: 3, boss_battle: 2 };
    }

    console.log(`[AI-Gen] File: "${req.file.originalname}" | Subject: ${subject} | Config:`, config);

    // ── Extract file content ─────────────────────────────
    let fileData;
    try {
      fileData = await extractFileData(req.file);
    } catch (extractErr) {
      return res.status(400).json({ success: false, error: extractErr.message });
    }

    const allGeneratedQuestions = [];

    // ── Generate questions for each configured style ─────
    for (const [style, count] of Object.entries(config)) {
      const n = parseInt(count) || 0;
      if (n <= 0) continue;

      const JSON_ONLY =
        '\n\nCRITICAL: Return ONLY a raw JSON array. ' +
        'No markdown, no code fences, no explanation. ' +
        'First character must be [ and last must be ].';

      let prompt = '';

      if (style === 'spelling') {
        prompt = `Read the document and identify ${n} vocabulary words appropriate for an elementary school spelling quiz. Return a JSON array: [{"word": "example"}]${JSON_ONLY}`;
      } else if (style === 'speech') {
        prompt = `Read the document and identify ${n} words suitable for speech practice. Return a JSON array: [{"word": "example"}]${JSON_ONLY}`;
      } else if (style === 'grammar_checker') {
        prompt = `Create ${n} fill-in-the-blank grammar questions based on the document. Each sentence MUST contain "(blank)". Return: [{"sentence": "The cat is (blank).", "correct": "sitting", "wrong_choices": ["running", "jumping", "sleeping"]}]${JSON_ONLY}`;
      } else if (style === 'arithmetic') {
        prompt = `Provide ${n} whole-number answers (integers between 5 and 99) for simple math equations. Return: [{"answer": 15}]${JSON_ONLY}`;
      } else if (style === 'boss_battle') {
        prompt = `Select ${n} sets of 5 vocabulary words from the document for a boss battle round. Return: [{"words": ["apple", "mango", "grape", "lemon", "melon"]}]${JSON_ONLY}`;
      }

      if (!prompt) continue;

      try {
        console.log(`[AI-Gen] → Generating ${n} "${style}" question(s) via OpenRouter...`);

        // 30-second timeout
        const rawText = await Promise.race([
          callOpenRouter(fileData, prompt),
          new Promise((_, reject) => setTimeout(() => reject(new Error('OpenRouter API timeout after 30s')), 30000)),
        ]);

        const parsed = parseAIJSON(rawText);

        if (!parsed || !Array.isArray(parsed)) {
          console.warn(`[AI-Gen] ⚠️ Could not parse JSON for style "${style}". Raw response:`, rawText?.substring(0, 200));
          continue;
        }

        // ── Format + validate each item ──────────────────
        for (const item of parsed) {
          try {
            if (style === 'spelling') {
              const word = String(item.word || '').trim().toLowerCase();
              if (word) allGeneratedQuestions.push({ subject, style: 'spelling', targetWord: word });

            } else if (style === 'speech') {
              const word = String(item.word || '').trim();
              if (word) allGeneratedQuestions.push({ subject, style: 'speech', targetWord: word });

            } else if (style === 'grammar_checker') {
              const sentence = String(item.sentence || '').trim();
              const correct = String(item.correct || '').trim();
              if (sentence && correct) {
                const safeSentence = sentence.includes('(blank)')
                  ? sentence
                  : sentence.replace(/_{2,}/, '(blank)') || sentence + ' (blank)';
                const wrongChoices = Array.isArray(item.wrong_choices)
                  ? item.wrong_choices.map((c) => String(c).trim()).filter(Boolean)
                  : [];
                while (wrongChoices.length < 3) wrongChoices.push('(wrong answer)');
                const allChoices = shuffleArray([correct, ...wrongChoices.slice(0, 3)]);
                allGeneratedQuestions.push({
                  subject,
                  style: 'grammar_checker',
                  targetWord: correct.substring(0, 50),
                  grammarSentence: safeSentence,
                  grammarCorrect: correct,
                  grammarChoices: allChoices,
                });
              }

            } else if (style === 'arithmetic') {
              const answer = parseInt(item.answer);
              if (!isNaN(answer) && answer > 0) {
                allGeneratedQuestions.push({ subject, style: 'arithmetic', targetWord: String(answer) });
              }

            } else if (style === 'boss_battle') {
              if (Array.isArray(item.words) && item.words.length >= 2) {
                const words = item.words.slice(0, 5).map((w) => String(w).trim()).filter(Boolean);
                while (words.length < 5) words.push(words[words.length - 1] || 'word');
                allGeneratedQuestions.push({
                  subject,
                  style: 'boss_battle',
                  targetWord: words.join(', ').substring(0, 50),
                  bossBattleQuestions: words,
                });
              }
            }
          } catch (itemErr) {
            console.warn(`[AI-Gen] Item formatting error (${style}):`, itemErr.message);
          }
        }

      } catch (apiErr) {
        const msg = apiErr.message || '';

        if (msg.includes('401') || msg.includes('invalid') || msg.includes('API key')) {
          console.error('[AI-Gen] ❌ OpenRouter API key error:', msg);
          return res.status(500).json({
            success: false,
            error: 'OpenRouter API key is invalid. Please check your OPENROUTER_API_KEY in .env. Get a free key at https://openrouter.ai',
          });
        }
        if (msg.includes('429') || msg.includes('rate limit') || msg.includes('quota')) {
          console.error('[AI-Gen] ❌ OpenRouter rate limit hit:', msg);
          return res.status(429).json({
            success: false,
            error: 'Rate limit reached (free tier allows 20 requests/min, 200/day). Please wait a moment and try again.',
          });
        }
        if (msg.includes('timeout')) {
          console.error('[AI-Gen] ❌ OpenRouter timeout for style:', style);
          // Don't abort everything — just skip this style and continue
          console.warn(`[AI-Gen] Skipping style "${style}" due to timeout.`);
          continue;
        }

        // Generic error — log and skip this style, continue with others
        console.error(`[AI-Gen] ⚠️ OpenRouter error for style "${style}":`, msg);
      }
    }

    if (allGeneratedQuestions.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'AI could not generate valid questions. The document might be empty or unreadable. Check the backend console for details.',
      });
    }

    res.status(200).json({
      success: true,
      message: `Generated ${allGeneratedQuestions.length} questions.`,
      questions: allGeneratedQuestions,
    });

  } catch (err) {
    console.error('[AI-Gen] ❌ Unexpected fatal error:', err);

    let userMessage = err.message || 'An unexpected error occurred during question generation.';
    if (err.message?.includes('401') || err.message?.includes('invalid')) {
      userMessage = 'OpenRouter API key is invalid. Please update OPENROUTER_API_KEY in your .env file.';
    } else if (err.message?.includes('429') || err.message?.includes('rate limit')) {
      userMessage = 'OpenRouter rate limit reached. Please wait a moment and try again.';
    } else if (err.message?.includes('timeout')) {
      userMessage = 'OpenRouter request timed out. Please try again with a smaller file.';
    }

    res.status(500).json({ success: false, error: userMessage });
  }
});

// ─────────────────────────────────────────
// POST /api/questions
// ─────────────────────────────────────────
router.post('/', verifyAdmin, async (req, res) => {
  const { subject, style, targetWord, distractors, grammarSentence, grammarCorrect, grammarChoices, bossBattleQuestions, challenges } = req.body;

  if (!subject || !style || !targetWord) {
    return res.status(400).json({ error: 'subject, style and targetWord are required' });
  }

  let data = {};
  if (style === 'spelling') {
    data = { distractors: Array.isArray(distractors) ? distractors : [] };
  } else if (style === 'grammar_checker') {
    data = {
      grammarSentence: grammarSentence || '',
      grammarCorrect: grammarCorrect || '',
      grammarChoices: Array.isArray(grammarChoices) ? grammarChoices : [],
    };
  } else if (style === 'boss_battle') {
    data = {
      bossBattleQuestions: Array.isArray(bossBattleQuestions) ? bossBattleQuestions : [],
      challenges: Array.isArray(challenges) ? challenges : [],
    };
  }

  try {
    const result = await pool.query(
      `INSERT INTO practice_questions (created_by, subject, style, target_word, data) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user.id, subject, style, targetWord, JSON.stringify(data)]
    );
    const q = result.rows[0];
    res.status(201).json({
      id: q.id,
      subject: q.subject,
      style: q.style,
      targetWord: q.target_word,
      createdAt: q.created_at,
      ...q.data,
    });
  } catch (err) {
    console.error('[POST /questions]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────
// PUT /api/questions/:id
// ─────────────────────────────────────────
router.put('/:id', verifyAdmin, async (req, res) => {
  const { subject, style, targetWord, distractors, grammarSentence, grammarCorrect, grammarChoices, bossBattleQuestions, challenges } = req.body;

  let data = {};
  if (style === 'spelling') {
    data = { distractors: Array.isArray(distractors) ? distractors : [] };
  } else if (style === 'grammar_checker') {
    data = {
      grammarSentence: grammarSentence || '',
      grammarCorrect: grammarCorrect || '',
      grammarChoices: Array.isArray(grammarChoices) ? grammarChoices : [],
    };
  } else if (style === 'boss_battle') {
    data = {
      bossBattleQuestions: Array.isArray(bossBattleQuestions) ? bossBattleQuestions : [],
      challenges: Array.isArray(challenges) ? challenges : [],
    };
  }

  try {
    const result = await pool.query(
      `UPDATE practice_questions SET subject = $1, style = $2, target_word = $3, data = $4 WHERE id = $5 RETURNING *`,
      [subject, style, targetWord, JSON.stringify(data), req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Question not found' });

    const q = result.rows[0];
    res.json({
      id: q.id,
      subject: q.subject,
      style: q.style,
      targetWord: q.target_word,
      createdAt: q.created_at,
      ...q.data,
    });
  } catch (err) {
    console.error('[PUT /questions/:id]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────
// DELETE /api/questions/:id
// ─────────────────────────────────────────
router.delete('/:id', verifyAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM practice_questions WHERE id = $1', [req.params.id]);
    res.json({ message: 'Question deleted' });
  } catch (err) {
    console.error('[DELETE /questions/:id]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;