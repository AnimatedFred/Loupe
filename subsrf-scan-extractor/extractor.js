const { chromium } = require('playwright');
const { detectLibrary } = require('./detectLibrary');
const { scoreHealth } = require('./healthScore');

// Extract all computed style tokens from a rendered page.
async function extractFromPage(page, selector = null) {
  return page.evaluate((sel) => {
    const root = sel ? document.querySelectorAll(sel + ' *') : document.querySelectorAll('*');
    const elements = Array.from(root);
    const colors = {};
    const fonts = {};
    const sizes = {};
    const weights = {};
    const lineHeights = {};
    const spacings = {};
    const radii = {};
    const shadows = {};
    const transitions = {};

    const inc = (map, key) => { map[key] = (map[key] || 0) + 1; };

    const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'META', 'LINK', 'HEAD', 'NOSCRIPT', 'SVG', 'PATH']);

    for (const el of elements) {
      if (SKIP_TAGS.has(el.tagName)) continue;
      const cs = window.getComputedStyle(el);

      // Colors — reject multi-value strings (multi-layer backgrounds, gradients) and non-rgb values
      const colorProps = ['color', 'backgroundColor', 'borderColor', 'outlineColor', 'caretColor'];
      for (const prop of colorProps) {
        const v = cs[prop];
        if (v && v !== 'transparent' && v !== 'rgba(0, 0, 0, 0)' && v !== 'currentcolor'
            && !v.includes('gradient') && /^rgba?\(/.test(v.trim())) {
          inc(colors, v);
        }
      }

      // Typography
      const ff = cs.fontFamily;
      if (ff && ff !== 'initial') inc(fonts, ff);
      const fs = cs.fontSize;
      if (fs && fs !== '0px') inc(sizes, fs);
      const fw = cs.fontWeight;
      if (fw) inc(weights, fw);
      const lh = cs.lineHeight;
      if (lh && lh !== 'normal' && lh !== '0px') inc(lineHeights, lh);

      // Spacing
      const spaceProps = ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
        'marginTop', 'marginRight', 'marginBottom', 'marginLeft', 'gap', 'rowGap', 'columnGap'];
      for (const prop of spaceProps) {
        const v = cs[prop];
        if (v && v !== '0px' && v !== 'auto' && v !== 'normal') inc(spacings, v);
      }

      // Border radius
      const brProps = ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomLeftRadius', 'borderBottomRightRadius'];
      for (const prop of brProps) {
        const v = cs[prop];
        if (v && v !== '0px') inc(radii, v);
      }

      // Shadows
      const bs = cs.boxShadow;
      if (bs && bs !== 'none') inc(shadows, bs);

      // Transitions
      const tr = cs.transition;
      if (tr && tr !== 'all 0s ease 0s' && tr !== 'none') inc(transitions, tr);
    }

    // Animations via Web Animations API
    const animDurations = {}, animEasings = {}, animDelays = {};
    try {
      const anims = document.getAnimations();
      for (const a of anims) {
        if (a.effect && typeof a.effect.getTiming === 'function') {
          const t = a.effect.getTiming();
          if (t.duration && t.duration !== 'auto' && t.duration > 0) inc(animDurations, `${t.duration}ms`);
          if (t.easing && t.easing !== 'linear') inc(animEasings, t.easing);
          if (t.delay && t.delay > 0) inc(animDelays, `${t.delay}ms`);
        }
      }
    } catch (_) {}

    return { colors, fonts, sizes, weights, lineHeights, spacings, radii, shadows, transitions, animDurations, animEasings, animDelays };
  }, selector);
}

// Convert 'rgb(r, g, b)' or 'rgba(r, g, b, a)' to hex (dropping alpha for clustering).
function rgbToHex(rgb) {
  const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return null;
  return '#' + [m[1], m[2], m[3]].map(n => parseInt(n).toString(16).padStart(2, '0')).join('').toUpperCase();
}

// Simple luminance from rgb string.
function luminance(rgb) {
  const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return 0.5;
  const [r, g, b] = [m[1], m[2], m[3]].map(n => parseInt(n) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function isNeonGreen(rgb) {
  const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return false;
  return parseInt(m[2]) > 200 && parseInt(m[1]) < 100 && parseInt(m[3]) < 100;
}

// Simplified perceptual color distance (weighted Euclidean in RGB space).
function colorDelta(cssA, cssB) {
  const parseRgb = s => {
    const m = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    return m ? [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])] : null;
  };
  const a = parseRgb(cssA);
  const b = parseRgb(cssB);
  if (!a || !b) return 100;
  return Math.sqrt(2 * (a[0] - b[0]) ** 2 + 4 * (a[1] - b[1]) ** 2 + 3 * (a[2] - b[2]) ** 2) / 5;
}

function processColors(colorMap) {
  const sorted = Object.entries(colorMap)
    .filter(([v]) => !v.includes('gradient'))
    .filter(([, f]) => f >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 60);

  // Pass 1: exact hex dedup
  const byHex = {};
  for (const [cssVal, freq] of sorted) {
    const hex = rgbToHex(cssVal) || cssVal;
    if (!byHex[hex]) byHex[hex] = { cssVal, freq, hex };
    else byHex[hex].freq += freq;
  }

  const exactDeduped = Object.values(byHex).sort((a, b) => b.freq - a.freq);

  // Pass 2: ΔE < 5 merging — fold near-duplicates into the highest-frequency representative
  const clusters = [];
  for (const item of exactDeduped) {
    let merged = false;
    for (const rep of clusters) {
      if (colorDelta(item.cssVal, rep.cssVal) < 5) {
        rep.freq += item.freq;
        merged = true;
        break;
      }
    }
    if (!merged) clusters.push({ ...item });
  }

  // Pass 3: name assignment with hard caps per role bucket
  // Structural backgrounds are capped at 4 (void, layer, surface, lift) — extras are discarded.
  // Text colors capped at 4 (primary, secondary, muted, dim).
  // Anything that doesn't fit a structural role goes into color/other (capped at 4).
  const textNames  = ['primary', 'secondary', 'muted', 'dim'];
  const voidNames  = ['void', 'layer', 'surface', 'lift'];   // dark bg cap: 4
  const liftNames  = ['card', 'overlay', 'modal', 'popup'];  // mid-dark bg cap: 4
  const otherNames = ['brand', 'interactive', 'warn', 'error'];

  const CAP_TEXT  = 4;
  const CAP_BG    = 4;
  const CAP_LIFT  = 4;
  const CAP_OTHER = 4;

  let textIdx = 0, bgIdx = 0, liftIdx = 0, otherIdx = 0, accentUsed = false;
  const named = [];

  for (const { cssVal, freq, hex } of clusters) {
    const lum = luminance(cssVal);
    let name;

    if (isNeonGreen(cssVal) && !accentUsed) {
      name = 'color/accent';
      accentUsed = true;
    } else if (lum > 0.6) {
      if (textIdx >= CAP_TEXT) continue;
      name = `color/text/${textNames[textIdx]}`;
      textIdx++;
    } else if (lum < 0.05) {
      if (bgIdx >= CAP_BG) continue;
      name = `color/bg/${voidNames[bgIdx]}`;
      bgIdx++;
    } else if (lum < 0.2) {
      if (liftIdx >= CAP_LIFT) continue;
      name = `color/bg/${liftNames[liftIdx]}`;
      liftIdx++;
    } else {
      if (otherIdx >= CAP_OTHER) continue;
      name = `color/other/${otherNames[otherIdx]}`;
      otherIdx++;
    }

    named.push({ name, value: cssVal, hex, frequency: freq });
  }

  return named;
}

function processFonts(fontMap, sizeMap, weightMap, lineHeightMap) {
  const families = Object.entries(fontMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const weights = Object.entries(weightMap).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const lineHeights = Object.entries(lineHeightMap).sort((a, b) => b[1] - a[1]).slice(0, 6);

  // Typography bucketing: snap fractional px to nearest integer, merge any two sizes within 1.5px
  const rawSizes = Object.entries(sizeMap)
    .filter(([v]) => !v.includes('%') && v.endsWith('px'))
    .map(([v, f]) => [Math.round(parseFloat(v)), f])
    .filter(([px]) => px >= 8 && px <= 96);

  // Merge by rounded value first
  const byPx = {};
  for (const [px, freq] of rawSizes) {
    byPx[px] = (byPx[px] || 0) + freq;
  }

  // Bucket-merge: any remaining size within 1.5px of an existing bucket collapses into it
  const buckets = []; // [{px, freq}] sorted ascending
  for (const [px, freq] of Object.entries(byPx).map(([p, f]) => [Number(p), f]).sort((a, b) => a[0] - b[0])) {
    const last = buckets[buckets.length - 1];
    if (last && px - last.px <= 1.5) {
      last.freq += freq;
      // Keep the higher-frequency px value as the canonical
      if (freq > last.freq - freq) last.px = px;
    } else {
      buckets.push({ px, freq });
    }
  }

  const sizeScale = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl'];
  const sizes = buckets
    .sort((a, b) => a.px - b.px)
    .slice(0, 10)
    .map(({ px, freq }, i) => ({
      name: `font/size/${sizeScale[i] || 'size-' + i}`,
      value: `${px}px`,
      frequency: freq,
    }));

  return {
    families: families.map(([value, frequency], i) => ({
      name: `font/family/${i === 0 ? 'display' : i === 1 ? 'body' : 'mono'}`,
      value: value.replace(/['"]/g, ''),
      frequency,
    })),
    sizes,
    weights: weights.map(([value, frequency]) => ({
      name: `font/weight/${value}`,
      value,
      frequency,
    })),
    lineHeights: lineHeights.map(([value, frequency]) => ({
      name: `font/leading/${frequency > 100 ? 'body' : 'tight'}`,
      value,
      frequency,
    })),
  };
}

function processSpacing(spacingMap) {
  const raw = Object.entries(spacingMap)
    .filter(([v]) => v.endsWith('px') && !v.includes(' '))
    .map(([v, f]) => [parseFloat(v), f])
    .filter(([px, f]) => px >= 2 && px <= 256 && f >= 3)
    .sort((a, b) => a[0] - b[0]);

  // Detect base unit from raw values before any snapping
  const small = raw.map(([px]) => px).filter(px => px <= 16);
  let baseUnit = 4;
  if (small.includes(8)) baseUnit = 8;
  else if (small.includes(4)) baseUnit = 4;
  else if (small.includes(5)) baseUnit = 5;

  // Snap each value to the nearest base unit multiple, then re-dedup
  const snapped = {};
  for (const [px, freq] of raw) {
    const snappedPx = Math.round(px / baseUnit) * baseUnit;
    if (snappedPx <= 0) continue;
    if (!snapped[snappedPx]) snapped[snappedPx] = { px: snappedPx, freq: 0 };
    snapped[snappedPx].freq += freq;
  }

  const named = Object.values(snapped)
    .sort((a, b) => a.px - b.px)
    .slice(0, 16)
    .map(({ px, freq }) => ({
      name: `space/${Math.round(px / baseUnit)}`,
      value: `${px}px`,
      frequency: freq,
    }));

  return { tokens: named, baseUnit };
}

function processRadii(radiiMap) {
  const sorted = Object.entries(radiiMap)
    .sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]));

  const dedup = {};
  for (const [v, f] of sorted) {
    const px = parseFloat(v);
    if (!dedup[px]) dedup[px] = { v, f };
    else dedup[px].f += f;
  }

  const vals = Object.values(dedup).sort((a, b) => parseFloat(a.v) - parseFloat(b.v));
  const usedNames = new Set();

  return vals.map(({ v, f }) => {
    const px = parseFloat(v);
    let baseName;
    if (px >= 999) baseName = 'full';
    else if (px >= 24) baseName = '2xl';
    else if (px >= 16) baseName = 'xl';
    else if (px >= 10) baseName = 'lg';
    else if (px >= 6)  baseName = 'md';
    else if (px >= 3)  baseName = 'sm';
    else baseName = 'xs';

    // Guarantee 1:1 — suffix if the name is already taken
    let name = `radius/${baseName}`;
    if (usedNames.has(name)) {
      let suffix = 2;
      while (usedNames.has(`radius/${baseName}-${suffix}`)) suffix++;
      name = `radius/${baseName}-${suffix}`;
    }
    usedNames.add(name);
    return { name, value: v, frequency: f };
  });
}

function processShadows(shadowMap) {
  const sorted = Object.entries(shadowMap).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const scale = ['sm', 'md', 'lg', 'xl'];

  return sorted.map(([value, frequency], i) => {
    let name;
    if (value.includes('rgba(0, 255') || value.includes('rgba(0,255')) name = 'shadow/accent';
    else if (value.startsWith('inset')) name = 'shadow/inset';
    else name = `shadow/${scale[i] || 'shadow-' + i}`;
    return { name, value, frequency };
  });
}

function processTransitions(transitionMap) {
  const sorted = Object.entries(transitionMap).sort((a, b) => b[1] - a[1]).slice(0, 6);
  return sorted.map(([value, frequency], i) => ({
    name: `transition/${i === 0 ? 'base' : 'fast-' + i}`,
    value,
    frequency,
  }));
}

function processAnimations(durMap, easeMap, delayMap) {
  const result = [];
  const durScale = ['fast', 'base', 'slow', 'slower'];
  Object.entries(durMap).sort((a, b) => b[1] - a[1]).slice(0, 6).forEach(([value, frequency], i) => {
    result.push({ name: `anim/duration/${durScale[i] || 'dur-' + i}`, value, frequency });
  });
  Object.entries(easeMap).sort((a, b) => b[1] - a[1]).slice(0, 4).forEach(([value, frequency], i) => {
    let easeName = 'custom-' + i;
    if (value.includes('ease-in-out') || (value.includes('0.4') && value.includes('0.2'))) easeName = 'in-out';
    else if (value.includes('ease-out') || value.includes('0,0,0.2')) easeName = 'out';
    else if (value.includes('1.56')) easeName = 'spring';
    result.push({ name: `anim/ease/${easeName}`, value, frequency });
  });
  Object.entries(delayMap).sort((a, b) => b[1] - a[1]).slice(0, 4).forEach(([value, frequency], i) => {
    result.push({ name: `anim/delay/${i === 0 ? 'base' : 'stagger-' + i}`, value, frequency });
  });
  return result;
}

async function extractTokens(url, mode, selector = null) {
  const browser = await chromium.launch({ headless: true });
  const results = {};

  const runExtraction = async (colorScheme) => {
    const context = await browser.newContext({
      colorScheme: colorScheme === 'dark' ? 'dark' : 'light',
    });
    const page = await context.newPage();
    const start = Date.now();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(800);
    const raw = await extractFromPage(page, selector);
    await context.close();

    const spacingResult = processSpacing(raw.spacings);
    const animations = processAnimations(raw.animDurations, raw.animEasings, raw.animDelays);

    return {
      colors: processColors(raw.colors),
      typography: processFonts(raw.fonts, raw.sizes, raw.weights, raw.lineHeights),
      spacing: spacingResult.tokens,
      radius: processRadii(raw.radii),
      shadows: processShadows(raw.shadows),
      transitions: processTransitions(raw.transitions),
      animations,
      meta: {
        baseUnit: spacingResult.baseUnit,
        extractionMs: Date.now() - start,
        totalTokens: 0,
      },
    };
  };

  try {
    if (mode === 'both' || mode === 'dark') {
      results.dark = await runExtraction('dark');
      results.dark.meta.totalTokens =
        results.dark.colors.length +
        (results.dark.typography.families?.length || 0) +
        (results.dark.typography.sizes?.length || 0) +
        results.dark.spacing.length +
        results.dark.radius.length +
        results.dark.shadows.length +
        results.dark.animations.length;
    }
    if (mode === 'both' || mode === 'light') {
      results.light = await runExtraction('light');
      results.light.meta.totalTokens =
        results.light.colors.length +
        (results.light.typography.families?.length || 0) +
        (results.light.typography.sizes?.length || 0) +
        results.light.spacing.length +
        results.light.radius.length +
        results.light.shadows.length +
        results.light.animations.length;
    }
  } finally {
    await browser.close();
  }

  const primary = results.dark || results.light;
  const hasDark = !!results.dark;
  const hasLight = !!results.light;

  const tokenResult = {
    url,
    extractedAt: new Date().toISOString(),
    modes: [hasDark && 'dark', hasLight && 'light'].filter(Boolean),
    hasDark,
    hasLight,
    dark: results.dark || null,
    light: results.light || null,
    meta: {
      ...(primary?.meta || {}),
      hasDarkMode: hasDark,
      hasLightMode: hasLight,
    },
  };

  // Component detection and health score are computed from the full result
  tokenResult.componentDetection = detectLibrary(tokenResult);
  tokenResult.healthScore = scoreHealth(tokenResult);

  return tokenResult;
}

module.exports = { extractTokens };
