const { chromium } = require('playwright');

// Extract all computed style tokens from a rendered page.
async function extractFromPage(page) {
  return page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('*'));
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

      // Colors
      const colorProps = ['color', 'backgroundColor', 'borderColor', 'outlineColor', 'caretColor'];
      for (const prop of colorProps) {
        const v = cs[prop];
        if (v && v !== 'transparent' && v !== 'rgba(0, 0, 0, 0)' && v !== 'currentcolor') {
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

      // Spacing — collect padding/margin/gap values
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

    return { colors, fonts, sizes, weights, lineHeights, spacings, radii, shadows, transitions };
  });
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

// Name a color based on its usage role and luminance.
function nameColor(cssValue, freq, index) {
  const lum = luminance(cssValue);
  if (lum > 0.7) return `color-text-${index > 0 ? 'muted-' + index : 'primary'}`;
  if (lum > 0.3) return `color-text-secondary`;
  if (lum < 0.02) return `color-bg-${index > 0 ? 'layer-' + index : 'void'}`;
  if (lum < 0.1) return `color-bg-${index > 0 ? 'surface-' + index : 'layer'}`;
  return `color-accent-${index}`;
}

// Detect if a color is close to a known accent green.
function isNeonGreen(rgb) {
  const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return false;
  return parseInt(m[2]) > 200 && parseInt(m[1]) < 100 && parseInt(m[3]) < 100;
}

function processColors(colorMap) {
  const sorted = Object.entries(colorMap)
    .filter(([v]) => !v.includes('gradient'))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 40);

  // Deduplicate near-duplicates: if hex is the same (ignoring alpha), merge
  const byHex = {};
  for (const [cssVal, freq] of sorted) {
    const hex = rgbToHex(cssVal) || cssVal;
    if (!byHex[hex]) byHex[hex] = { cssVal, freq, hex };
    else byHex[hex].freq += freq;
  }

  const deduplicated = Object.values(byHex).sort((a, b) => b.freq - a.freq);

  // Name by role heuristics
  const named = [];
  let textIdx = 0, bgIdx = 0, accentIdx = 0;

  for (const { cssVal, freq, hex } of deduplicated) {
    const lum = luminance(cssVal);
    let name;

    if (isNeonGreen(cssVal)) {
      name = 'color/accent';
    } else if (lum > 0.6) {
      name = textIdx === 0 ? 'color/text/primary' : `color/text/muted${textIdx > 1 ? '-' + textIdx : ''}`;
      textIdx++;
    } else if (lum < 0.05) {
      name = bgIdx === 0 ? 'color/bg/void' : bgIdx === 1 ? 'color/bg/layer' : bgIdx === 2 ? 'color/bg/surface' : `color/bg/layer-${bgIdx}`;
      bgIdx++;
    } else if (lum < 0.2) {
      name = `color/bg/${bgIdx === 0 ? 'layer' : bgIdx === 1 ? 'surface' : 'lift'}`;
      bgIdx++;
    } else {
      name = `color/other/${accentIdx}`;
      accentIdx++;
    }

    named.push({ name, value: cssVal, hex, frequency: freq });
  }

  return named;
}

function processFonts(fontMap, sizeMap, weightMap, lineHeightMap) {
  const families = Object.entries(fontMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const sizes = Object.entries(sizeMap)
    .filter(([v]) => !v.includes('%'))
    .sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))
    .slice(0, 12);
  const weights = Object.entries(weightMap).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const lineHeights = Object.entries(lineHeightMap).sort((a, b) => b[1] - a[1]).slice(0, 6);

  const sizeScale = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl'];

  return {
    families: families.map(([value, frequency], i) => ({
      name: `font/family/${i === 0 ? 'display' : i === 1 ? 'body' : 'mono'}`,
      value: value.replace(/['"]/g, ''),
      frequency,
    })),
    sizes: sizes.map(([value, frequency], i) => ({
      name: `font/size/${sizeScale[i] || 'size-' + i}`,
      value,
      frequency,
    })),
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
  const sorted = Object.entries(spacingMap)
    .filter(([v]) => v.endsWith('px') && !v.includes(' '))
    .map(([v, f]) => [parseFloat(v), f, v])
    .filter(([px]) => px >= 4 && px <= 256)
    .sort((a, b) => a[0] - b[0]);

  // Deduplicate exact px values
  const dedup = {};
  for (const [px, freq, cssVal] of sorted) {
    if (!dedup[px]) dedup[px] = { px, freq, cssVal };
    else dedup[px].freq += freq;
  }

  // Detect base unit (most common GCD among small values)
  const small = Object.keys(dedup).map(Number).filter(px => px <= 16);
  let baseUnit = 4;
  if (small.includes(8)) baseUnit = 8;
  else if (small.includes(4)) baseUnit = 4;
  else if (small.includes(5)) baseUnit = 5;

  const named = Object.values(dedup)
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

  const scale = ['none', 'sm', 'md', 'lg', 'xl', 'full'];
  const vals = Object.values(dedup).sort((a, b) => parseFloat(a.v) - parseFloat(b.v));

  return vals.map(({ v, f }, i) => {
    const px = parseFloat(v);
    let name = `radius/${scale[Math.min(i, scale.length - 1)]}`;
    if (px >= 9000) name = 'radius/full';
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

async function extractTokens(url, mode) {
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
    const raw = await extractFromPage(page);
    await context.close();

    const spacingResult = processSpacing(raw.spacings);

    return {
      colors: processColors(raw.colors),
      typography: processFonts(raw.fonts, raw.sizes, raw.weights, raw.lineHeights),
      spacing: spacingResult.tokens,
      radius: processRadii(raw.radii),
      shadows: processShadows(raw.shadows),
      transitions: processTransitions(raw.transitions),
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
        results.dark.shadows.length;
    }
    if (mode === 'both' || mode === 'light') {
      results.light = await runExtraction('light');
      results.light.meta.totalTokens =
        results.light.colors.length +
        (results.light.typography.families?.length || 0) +
        (results.light.typography.sizes?.length || 0) +
        results.light.spacing.length +
        results.light.radius.length +
        results.light.shadows.length;
    }
  } finally {
    await browser.close();
  }

  const primary = results.dark || results.light;
  const hasDark = !!results.dark;
  const hasLight = !!results.light;

  return {
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
}

module.exports = { extractTokens };
