const express = require('express');
const cors = require('cors');
const { extractTokens } = require('./extractor');
const { transform } = require('./transformers');

const app = express();
app.use(cors());
app.use(express.json());

// In-memory rate limit: { userId: { date: string, count: number } }
const rateLimits = {};

function checkRateLimit(userId, tier) {
  const today = new Date().toISOString().split('T')[0];
  const limit = tier === 'pro' ? 200 : 50;
  if (!rateLimits[userId]) rateLimits[userId] = { date: today, count: 0 };
  if (rateLimits[userId].date !== today) rateLimits[userId] = { date: today, count: 0 };
  if (rateLimits[userId].count >= limit) return false;
  rateLimits[userId].count++;
  return true;
}

function validateUrl(url) {
  try {
    const u = new URL(url.startsWith('http') ? url : 'https://' + url);
    return u.href;
  } catch {
    return null;
  }
}

app.post('/extract', async (req, res) => {
  const { url, mode = 'both', userId = 'anon', tier = 'starter' } = req.body;

  if (!url) return res.status(400).json({ error: 'url is required' });

  const validUrl = validateUrl(url);
  if (!validUrl) return res.status(400).json({ error: 'Invalid URL' });

  if (userId !== 'anon' && !checkRateLimit(userId, tier)) {
    return res.status(429).json({ error: 'Rate limit reached for today' });
  }

  try {
    console.log(`[extract] ${validUrl} mode=${mode}`);
    const tokens = await extractTokens(validUrl, mode);
    res.json({ success: true, tokens });
  } catch (err) {
    console.error('[extract] error:', err.message);
    if (err.message.includes('timeout')) {
      return res.status(504).json({ error: 'Page took too long to load (>30s)' });
    }
    if (err.message.includes('net::ERR') || err.message.includes('NS_ERROR')) {
      return res.status(504).json({ error: 'Could not reach URL: ' + err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

app.post('/transform', (req, res) => {
  const { tokens, format = 'css', mode = 'dark' } = req.body;
  if (!tokens) return res.status(400).json({ error: 'tokens required' });
  try {
    const result = transform(tokens, format, mode);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (_, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Subsrf Tokens Extractor running on :${PORT}`));
