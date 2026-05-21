// ── Subsrf Audit Engine ─────────────────────────────────────────────────────
// Scans source files for hardcoded design values and compares them against
// the extracted token set to surface violations.

const SKIP_DIRS = new Set([
  'node_modules', 'dist', 'build', '.next', 'vendor', '.git',
  'coverage', '__pycache__', '.turbo', '.cache',
]);

const AUDITABLE_EXTENSIONS = new Set([
  '.css', '.scss', '.less',
  '.js', '.jsx', '.ts', '.tsx',
  '.vue', '.svelte',
]);

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseHexToRgb(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3
    ? h.split('').map(c => c + c).join('')
    : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return [r, g, b];
}

function parseRgbString(str) {
  const m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  return m ? [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])] : null;
}

function colorDistance(rgbA, rgbB) {
  return Math.sqrt(
    2 * (rgbA[0] - rgbB[0]) ** 2 +
    4 * (rgbA[1] - rgbB[1]) ** 2 +
    3 * (rgbA[2] - rgbB[2]) ** 2
  ) / 5;
}

// ── Filtering ───────────────────────────────────────────────────────────────

export function shouldAuditFile(path) {
  // Skip directories
  const parts = path.split('/');
  if (parts.some(p => SKIP_DIRS.has(p))) return false;

  // Check extension
  const ext = '.' + path.split('.').pop();
  return AUDITABLE_EXTENSIONS.has(ext);
}

// ── Token index (build lookup maps from extracted token set) ─────────────────

function buildTokenIndex(tokens) {
  const mode = tokens?.dark || tokens?.light;
  if (!mode) return { colors: [], spacings: [], fontSizes: [], radii: [], shadows: [], fontFamilies: [] };

  const colors = (mode.colors || []).map(t => ({
    name: t.name,
    value: t.value,
    hex: t.hex,
    rgb: parseRgbString(t.value),
  }));

  const spacings = (mode.spacing || []).map(t => ({
    name: t.name,
    px: parseFloat(t.value),
  }));

  const fontSizes = (mode.typography?.sizes || []).map(t => ({
    name: t.name,
    px: parseFloat(t.value),
  }));

  const radii = (mode.radius || []).map(t => ({
    name: t.name,
    px: parseFloat(t.value),
  }));

  const shadows = (mode.shadows || []).map(t => ({
    name: t.name,
    value: t.value,
  }));

  const fontFamilies = (mode.typography?.families || []).map(t => ({
    name: t.name,
    value: t.value.toLowerCase().replace(/['"]/g, ''),
  }));

  return { colors, spacings, fontSizes, radii, shadows, fontFamilies };
}

// ── Find closest token match ────────────────────────────────────────────────

function findClosestColor(hex, tokenColors) {
  const rgb = parseHexToRgb(hex);
  let best = null;
  let bestDist = Infinity;

  for (const tc of tokenColors) {
    if (!tc.rgb) continue;
    const dist = colorDistance(rgb, tc.rgb);
    if (dist < bestDist) {
      bestDist = dist;
      best = tc;
    }
  }

  return bestDist < 15 ? best : null; // close enough to suggest
}

function findClosestNumeric(px, tokenList, tolerance = 2) {
  let best = null;
  let bestDelta = Infinity;

  for (const t of tokenList) {
    const delta = Math.abs(px - t.px);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = t;
    }
  }

  return bestDelta <= tolerance ? best : null;
}

function isExactMatch(px, tokenList) {
  return tokenList.some(t => Math.abs(px - t.px) < 0.5);
}

// ── CSS property scanners ───────────────────────────────────────────────────

const HEX_RE = /#(?:[0-9a-fA-F]{3}){1,2}\b/g;
const RGB_RE = /rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+/g;
const PX_VALUE_RE = /:\s*([\d.]+)px/g;
const FONT_SIZE_RE = /font-size\s*:\s*([\d.]+)px/gi;
const FONT_SIZE_JS_RE = /fontSize\s*:\s*['"]([\d.]+)px['"]/g;
const FONT_SIZE_JS_NUM_RE = /fontSize\s*:\s*(\d+)/g;
const PADDING_RE = /(?:padding|margin|gap|top|right|bottom|left)\s*:\s*['"']?([\d.]+)px/gi;
const RADIUS_RE = /border-?[Rr]adius\s*:\s*['"']?([\d.]+)px/gi;
const SHADOW_RE = /box-?[Ss]hadow\s*:\s*([^;}"']+)/gi;
const FONT_FAMILY_RE = /font-?[Ff]amily\s*:\s*['"]*([^;}"']+)/gi;
const COLOR_PROP_RE = /(?:color|background|background-color|border-color|outline-color)\s*:\s*['"]?(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))/gi;

// Inline style patterns for JS/JSX/TSX
const JS_COLOR_RE = /(?:color|backgroundColor|borderColor|outlineColor)\s*:\s*['"]([^'"]+)['"]/g;

// ── Scan a single file ─────────────────────────────────────────────────────

export function auditFile(filePath, content, tokenIndex) {
  const violations = [];
  const lines = content.split('\n');
  const isCSS = /\.(css|scss|less)$/.test(filePath);
  const isJS = /\.(jsx?|tsx?|vue|svelte)$/.test(filePath);

  lines.forEach((line, lineIdx) => {
    const lineNum = lineIdx + 1;
    const trimmed = line.trim();

    // Skip comments
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;

    // ── Hardcoded colors ──
    const colorPatterns = isCSS ? [COLOR_PROP_RE] : [JS_COLOR_RE, COLOR_PROP_RE];
    for (const re of colorPatterns) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(line)) !== null) {
        const raw = m[1];
        // Extract hex from the value
        const hexMatch = raw.match(/#(?:[0-9a-fA-F]{3}){1,2}/);
        if (hexMatch) {
          const hex = hexMatch[0];
          // Skip pure black/white/transparent — too common to flag
          const lower = hex.toLowerCase();
          if (['#000', '#000000', '#fff', '#ffffff', '#0000', '#00000000'].includes(lower)) continue;

          // Check if it matches a token
          const exactHexMatch = tokenIndex.colors.find(
            t => t.hex?.toLowerCase() === hex.toLowerCase()
          );
          if (exactHexMatch) continue; // Already using a token value — fine

          const closest = findClosestColor(hex, tokenIndex.colors);
          violations.push({
            file: filePath,
            line: lineNum,
            severity: closest ? 'warning' : 'error',
            rule: 'hardcoded-color',
            found: hex,
            suggestion: closest
              ? `Use ${closest.name} (${closest.hex})`
              : 'No matching token found — consider adding to token set',
            context: trimmed.slice(0, 120),
          });
        }
      }
    }

    // ── Hardcoded font sizes ──
    const fontSizePatterns = isCSS ? [FONT_SIZE_RE] : [FONT_SIZE_JS_RE, FONT_SIZE_JS_NUM_RE];
    for (const re of fontSizePatterns) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(line)) !== null) {
        const px = parseFloat(m[1]);
        if (isExactMatch(px, tokenIndex.fontSizes)) continue;

        const closest = findClosestNumeric(px, tokenIndex.fontSizes);
        violations.push({
          file: filePath,
          line: lineNum,
          severity: 'warning',
          rule: 'hardcoded-font-size',
          found: `${px}px`,
          suggestion: closest
            ? `Use ${closest.name} (${closest.px}px)`
            : 'Not in type scale — consider adding or adjusting',
          context: trimmed.slice(0, 120),
        });
      }
    }

    // ── Hardcoded spacing ──
    if (isCSS) {
      PADDING_RE.lastIndex = 0;
      let m;
      while ((m = PADDING_RE.exec(line)) !== null) {
        const px = parseFloat(m[1]);
        if (px <= 1 || isExactMatch(px, tokenIndex.spacings)) continue;

        const closest = findClosestNumeric(px, tokenIndex.spacings, 3);
        violations.push({
          file: filePath,
          line: lineNum,
          severity: 'warning',
          rule: 'hardcoded-spacing',
          found: `${px}px`,
          suggestion: closest
            ? `Use ${closest.name} (${closest.px}px)`
            : 'Not in spacing scale',
          context: trimmed.slice(0, 120),
        });
      }
    }

    // ── Hardcoded border radius ──
    RADIUS_RE.lastIndex = 0;
    let rm;
    while ((rm = RADIUS_RE.exec(line)) !== null) {
      const px = parseFloat(rm[1]);
      if (isExactMatch(px, tokenIndex.radii)) continue;

      const closest = findClosestNumeric(px, tokenIndex.radii, 2);
      violations.push({
        file: filePath,
        line: lineNum,
        severity: 'warning',
        rule: 'hardcoded-radius',
        found: `${px}px`,
        suggestion: closest
          ? `Use ${closest.name} (${closest.px}px)`
          : 'Not in radius scale',
        context: trimmed.slice(0, 120),
      });
    }

    // ── Inconsistent font families ──
    FONT_FAMILY_RE.lastIndex = 0;
    let fm;
    while ((fm = FONT_FAMILY_RE.exec(line)) !== null) {
      const family = fm[1].trim().toLowerCase().replace(/['"]/g, '').split(',')[0].trim();
      if (!family || family === 'inherit' || family === 'initial' || family === 'unset') continue;
      if (family === 'sans-serif' || family === 'serif' || family === 'monospace') continue;

      const inTokens = tokenIndex.fontFamilies.some(t => t.value.includes(family));
      if (inTokens) continue;

      violations.push({
        file: filePath,
        line: lineNum,
        severity: 'error',
        rule: 'inconsistent-font-family',
        found: family,
        suggestion: tokenIndex.fontFamilies.length > 0
          ? `Use ${tokenIndex.fontFamilies[0].name} (${tokenIndex.fontFamilies[0].value})`
          : 'No font tokens available — extract tokens first',
        context: trimmed.slice(0, 120),
      });
    }
  });

  return violations;
}

// ── Run a full audit across multiple files ──────────────────────────────────

export function runAudit(files, tokens) {
  const tokenIndex = buildTokenIndex(tokens);
  const allViolations = [];
  let filesScanned = 0;

  for (const { path, content } of files) {
    if (!content) continue;
    filesScanned++;
    const fileViolations = auditFile(path, content, tokenIndex);
    allViolations.push(...fileViolations);
  }

  const errors = allViolations.filter(v => v.severity === 'error').length;
  const warnings = allViolations.filter(v => v.severity === 'warning').length;
  const info = allViolations.filter(v => v.severity === 'info').length;

  return {
    scannedAt: new Date().toISOString(),
    filesScanned,
    totalViolations: allViolations.length,
    violations: allViolations,
    summary: { errors, warnings, info },
  };
}
