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

function figmaTransformer(tokenSet) {
  const primary = tokenSet.dark || tokenSet.light;
  if (!primary) return '{}';
  const modes = (tokenSet.hasDark && tokenSet.hasLight) ? ['Dark', 'Light'] : [tokenSet.hasDark ? 'Dark' : 'Light'];
  const variables = [];
  const parseRgb = (css) => {
    const m = css.match(/rgba?\((\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)(?:,\s*(\d+(?:\.\d+)?))?\)/);
    if (!m) return null;
    return { r: +m[1]/255, g: +m[2]/255, b: +m[3]/255, a: m[4] !== undefined ? +m[4] : 1 };
  };
  for (const t of primary.colors || []) {
    const vals = {};
    if (tokenSet.dark) vals['Dark'] = parseRgb(tokenSet.dark.colors?.find(c => c.name === t.name)?.value || t.value);
    if (tokenSet.light) vals['Light'] = parseRgb(tokenSet.light.colors?.find(c => c.name === t.name)?.value || t.value);
    variables.push({ name: t.name, type: 'COLOR', values: vals });
  }
  for (const t of primary.spacing || []) variables.push({ name: t.name, type: 'FLOAT', values: { Default: parseFloat(t.value) } });
  for (const t of primary.radius || []) variables.push({ name: t.name, type: 'FLOAT', values: { Default: parseFloat(t.value) } });

  let hostname = tokenSet.url || 'tokens';
  try { hostname = new URL(tokenSet.url.startsWith('http') ? tokenSet.url : 'https://' + tokenSet.url).hostname; } catch {}

  return JSON.stringify({ name: `${hostname} tokens`, modes, variables }, null, 2);
}

function jsonTransformer(tokenSet, mode) {
  const tokens = tokenSet[mode] || tokenSet.dark || tokenSet.light;
  return JSON.stringify(tokens, null, 2);
}

export async function POST(request) {
  const { tokens, format, mode = 'dark' } = await request.json();
  if (!tokens) return NextResponse.json({ error: 'tokens required' }, { status: 400 });

  let content;
  try {
    switch (format) {
      case 'css':              content = cssTransformer(tokens, mode); break;
      case 'tailwind':         content = tailwindTransformer(tokens, mode); break;
      case 'style_dictionary': content = styleDictionaryTransformer(tokens, mode); break;
      case 'figma':            content = figmaTransformer(tokens); break;
      default:                 content = jsonTransformer(tokens, mode);
    }
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  return NextResponse.json({ content, format });
}
