import { NextResponse } from 'next/server';

// Inline transformers — runs in the Next.js process (no extractor service needed for transforms)

function cssTransformer(tokenSet, mode) {
  const tokens = tokenSet[mode] || tokenSet.dark || tokenSet.light;
  if (!tokens) return '/* No tokens available */';
  const lines = [`/* ${tokenSet.url} — extracted by Subsrf Scan */\n:root {`];
  if (tokens.colors?.length) {
    lines.push('  /* Colors */');
    for (const t of tokens.colors) lines.push(`  --${t.name.replace(/\//g, '-')}: ${t.value};`);
  }
  if (tokens.typography?.families?.length) {
    lines.push('\n  /* Typography */');
    for (const t of tokens.typography.families) lines.push(`  --${t.name.replace(/\//g, '-')}: ${t.value};`);
    for (const t of tokens.typography.sizes || []) lines.push(`  --${t.name.replace(/\//g, '-')}: ${t.value};`);
  }
  if (tokens.spacing?.length) {
    lines.push('\n  /* Spacing */');
    for (const t of tokens.spacing) lines.push(`  --${t.name.replace(/\//g, '-')}: ${t.value};`);
  }
  if (tokens.radius?.length) {
    lines.push('\n  /* Border Radius */');
    for (const t of tokens.radius) lines.push(`  --${t.name.replace(/\//g, '-')}: ${t.value};`);
  }
  if (tokens.shadows?.length) {
    lines.push('\n  /* Shadows */');
    for (const t of tokens.shadows) lines.push(`  --${t.name.replace(/\//g, '-')}: ${t.value};`);
  }
  lines.push('}');
  return lines.join('\n');
}

function tailwindTransformer(tokenSet, mode) {
  const tokens = tokenSet[mode] || tokenSet.dark || tokenSet.light;
  if (!tokens) return '// No tokens available';
  const colors = {};
  for (const t of tokens.colors || []) {
    const parts = t.name.split('/').slice(1);
    let obj = colors;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!obj[parts[i]]) obj[parts[i]] = {};
      obj = obj[parts[i]];
    }
    obj[parts[parts.length - 1]] = t.value;
  }
  const spacing = Object.fromEntries((tokens.spacing || []).map(t => [t.name.split('/')[1], t.value]));
  const radius = Object.fromEntries((tokens.radius || []).map(t => [t.name.split('/')[1], t.value]));
  const shadows = Object.fromEntries((tokens.shadows || []).map(t => [t.name.split('/')[1], t.value]));

  return `// tailwind.config.js — extracted from ${tokenSet.url}
module.exports = {
  theme: {
    extend: ${JSON.stringify({ colors, spacing, borderRadius: radius, boxShadow: shadows }, null, 6)}
  }
}`;
}

function styleDictionaryTransformer(tokenSet, mode) {
  const tokens = tokenSet[mode] || tokenSet.dark || tokenSet.light;
  if (!tokens) return '{}';
  const sd = {};
  const set = (obj, path, value, type) => {
    const parts = path.split('/');
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) { if (!cur[parts[i]]) cur[parts[i]] = {}; cur = cur[parts[i]]; }
    cur[parts[parts.length - 1]] = { value, type };
  };
  for (const t of tokens.colors || []) set(sd, t.name, t.value, 'color');
  for (const t of tokens.typography?.families || []) set(sd, t.name, t.value, 'fontFamily');
  for (const t of tokens.typography?.sizes || []) set(sd, t.name, t.value, 'fontSize');
  for (const t of tokens.spacing || []) set(sd, t.name, t.value, 'spacing');
  for (const t of tokens.radius || []) set(sd, t.name, t.value, 'borderRadius');
  for (const t of tokens.shadows || []) set(sd, t.name, t.value, 'shadow');
  return JSON.stringify(sd, null, 2);
}

function figmaTransformer(tokenSet, subset = 'all') {
  const dark = tokenSet.dark;
  const light = tokenSet.light;
  const primary = dark || light;
  if (!primary) return '{}';
  const hasBoth = !!dark && !!light;
  const colorModes = hasBoth ? ['Dark', 'Light'] : [(dark ? 'Dark' : 'Light')];
  const variables = [];
  const parseRgb = (css) => {
    const m = css?.match(/rgba?\((\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)(?:,\s*(\d+(?:\.\d+)?))?\)/);
    if (!m) return null;
    return { r: +m[1]/255, g: +m[2]/255, b: +m[3]/255, a: m[4] !== undefined ? +m[4] : 1 };
  };

  const incColors  = subset === 'all' || subset === 'colors';
  const incSpacing = subset === 'all' || subset === 'spacing';
  const incRadius  = subset === 'all' || subset === 'radius';
  const incShadows = subset === 'all' || subset === 'shadows';

  if (incColors) {
    for (const t of primary.colors || []) {
      const vals = {};
      if (hasBoth) {
        vals['Dark']  = parseRgb(dark.colors?.find(c => c.name === t.name)?.value) ?? parseRgb(t.value);
        vals['Light'] = parseRgb(light.colors?.find(c => c.name === t.name)?.value) ?? parseRgb(t.value);
      } else {
        vals[colorModes[0]] = parseRgb(t.value);
      }
      variables.push({ name: t.name, type: 'COLOR', values: vals });
    }
  }
  if (incSpacing) {
    const seen = new Set();
    for (const t of primary.spacing || []) {
      const px = parseFloat(t.value);
      if (isNaN(px)) continue;
      const name = `space/${px}`;
      if (seen.has(name)) continue;
      seen.add(name);
      variables.push({ name, type: 'FLOAT', values: { Default: px } });
    }
  }
  if (incRadius) {
    const seen = new Set();
    for (const t of primary.radius || []) {
      const px = parseFloat(t.value);
      if (isNaN(px) || seen.has(t.name)) continue;
      seen.add(t.name);
      variables.push({ name: t.name, type: 'FLOAT', values: { Default: px } });
    }
  }
  if (incShadows) {
    for (const t of primary.shadows || []) {
      variables.push({ name: t.name, type: 'STRING', values: { Default: t.value } });
    }
  }

  let hostname = tokenSet.url || 'tokens';
  try { hostname = new URL(tokenSet.url.startsWith('http') ? tokenSet.url : 'https://' + tokenSet.url).hostname; } catch {}

  const modes = (subset === 'all' || subset === 'colors') ? colorModes : ['Default'];
  const collectionLabel = subset === 'all' ? 'tokens' : subset;
  return JSON.stringify({ name: `${hostname} ${collectionLabel}`, modes, variables }, null, 2);
}

function jsonTransformer(tokenSet, mode) {
  const tokens = tokenSet[mode] || tokenSet.dark || tokenSet.light;
  return JSON.stringify(tokens, null, 2);
}

export async function POST(request) {
  const { tokens, format, mode = 'dark', subset = 'all' } = await request.json();
  if (!tokens) return NextResponse.json({ error: 'tokens required' }, { status: 400 });

  let content;
  try {
    switch (format) {
      case 'css':              content = cssTransformer(tokens, mode); break;
      case 'tailwind':         content = tailwindTransformer(tokens, mode); break;
      case 'style_dictionary': content = styleDictionaryTransformer(tokens, mode); break;
      case 'figma':            content = figmaTransformer(tokens, subset); break;
      default:                 content = jsonTransformer(tokens, mode);
    }
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  return NextResponse.json({ content, format });
}
