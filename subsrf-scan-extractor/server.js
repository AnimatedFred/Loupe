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
  const { url, mode = 'both', selector = null, userId = 'anon', tier = 'starter' } = req.body;

  if (!url) return res.status(400).json({ error: 'url is required' });

  const validUrl = validateUrl(url);
  if (!validUrl) return res.status(400).json({ error: 'Invalid URL' });

  if (userId !== 'anon' && !checkRateLimit(userId, tier)) {
    return res.status(429).json({ error: 'Rate limit reached for today' });
  }

  try {
    console.log(`[extract] ${validUrl} mode=${mode}${selector ? ' selector=' + selector : ''}`);
    const tokens = await extractTokens(validUrl, mode, selector);
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

// Diff two URLs in parallel and return structured delta.
app.post('/diff', async (req, res) => {
  const { urlA, urlB, mode = 'both' } = req.body;
  if (!urlA || !urlB) return res.status(400).json({ error: 'urlA and urlB are required' });

  const validA = validateUrl(urlA);
  const validB = validateUrl(urlB);
  if (!validA || !validB) return res.status(400).json({ error: 'Invalid URL(s)' });

  try {
    console.log(`[diff] ${validA} vs ${validB}`);
    const [tokensA, tokensB] = await Promise.all([
      extractTokens(validA, mode),
      extractTokens(validB, mode),
    ]);
    const diff = diffTokenSets(tokensA, tokensB);
    res.json({ success: true, diff, urlA: validA, urlB: validB });
  } catch (err) {
    console.error('[diff] error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

function colorDistance(cssA, cssB) {
  const parseRgb = (s) => {
    const m = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    return m ? [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])] : null;
  };
  const a = parseRgb(cssA);
  const b = parseRgb(cssB);
  if (!a || !b) return 100;
  return Math.round(Math.sqrt(2 * (a[0]-b[0])**2 + 4 * (a[1]-b[1])**2 + 3 * (a[2]-b[2])**2) / 5 * 10) / 10;
}

function diffCategory(listA, listB, valueKey = 'value') {
  const mapA = Object.fromEntries((listA || []).map(t => [t.name, t]));
  const mapB = Object.fromEntries((listB || []).map(t => [t.name, t]));
  const allNames = new Set([...Object.keys(mapA), ...Object.keys(mapB)]);
  const changes = [];
  let diffCount = 0;

  for (const name of allNames) {
    const a = mapA[name];
    const b = mapB[name];
    if (!a) { changes.push({ name, status: 'added', valueB: b[valueKey] }); diffCount++; }
    else if (!b) { changes.push({ name, status: 'removed', valueA: a[valueKey] }); diffCount++; }
    else if (a[valueKey] !== b[valueKey]) {
      const entry = { name, status: 'changed', valueA: a[valueKey], valueB: b[valueKey] };
      if (name.startsWith('color')) {
        entry.delta = colorDistance(a[valueKey], b[valueKey]);
      } else {
        const pxA = parseFloat(a[valueKey]);
        const pxB = parseFloat(b[valueKey]);
        if (!isNaN(pxA) && !isNaN(pxB)) entry.delta = Math.abs(pxA - pxB);
      }
      changes.push(entry);
      diffCount++;
    } else {
      changes.push({ name, status: 'identical', valueA: a[valueKey], valueB: b[valueKey] });
    }
  }

  return { changes, diffCount };
}

function diffTokenSets(tokensA, tokensB) {
  const modeA = tokensA.dark || tokensA.light;
  const modeB = tokensB.dark || tokensB.light;

  const colors = diffCategory(modeA?.colors, modeB?.colors);
  const spacing = diffCategory(modeA?.spacing, modeB?.spacing);
  const radius = diffCategory(modeA?.radius, modeB?.radius);
  const shadows = diffCategory(modeA?.shadows, modeB?.shadows);
  const typoSizes = diffCategory(modeA?.typography?.sizes, modeB?.typography?.sizes);
  const typoFamilies = diffCategory(modeA?.typography?.families, modeB?.typography?.families);
  const animations = diffCategory(modeA?.animations, modeB?.animations);

  const totalDiffs = colors.diffCount + spacing.diffCount + radius.diffCount + shadows.diffCount + typoSizes.diffCount + typoFamilies.diffCount + animations.diffCount;
  const totalTokens = (modeA ? Object.values(modeA).filter(Array.isArray).reduce((n, a) => n + a.length, 0) : 1);
  const overallDistance = Math.min(100, Math.round((totalDiffs / Math.max(totalTokens, 1)) * 100));

  return {
    colors,
    typography: { sizes: typoSizes, families: typoFamilies },
    spacing,
    radius,
    shadows,
    animations,
    overallDistance,
    summary: `${totalDiffs} difference${totalDiffs !== 1 ? 's' : ''} found`,
  };
}

app.get('/health', (_, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Subsrf Scan Extractor running on :${PORT}`));
