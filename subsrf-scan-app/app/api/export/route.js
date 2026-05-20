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

function subSrfTransformer(tokenSet, mode) {
  const tokens = tokenSet[mode] || tokenSet.dark || tokenSet.light;
  const url = tokenSet.url || 'unknown';
  let hostname = url;
  try { hostname = new URL(url.startsWith('http') ? url : 'https://' + url).hostname; } catch {}

  if (!tokens) return `# .subsrf — ${hostname}\n\nNo tokens extracted.`;

  // ── helpers ────────────────────────────────────────────────────────────────

  const cssVar = name => '--' + name.replace(/\//g, '-');

  // Infer Tailwind utility prefix from token name path
  function twClass(name) {
    const leaf = name.split('/').pop();
    const lower = name.toLowerCase();
    if (lower.includes('/bg/') || lower.startsWith('color/bg') || lower.includes('/background')) return `bg-${leaf}`;
    if (lower.includes('/text/') || lower.includes('/fg/') || lower.includes('/foreground')) return `text-${leaf}`;
    if (lower.includes('/border/') || lower.includes('/stroke/')) return `border-${leaf}`;
    if (lower.includes('/ring/')) return `ring-${leaf}`;
    if (lower.includes('accent') || lower.includes('brand') || lower.includes('primary')) return `bg-${leaf} / text-${leaf}`;
    if (lower.includes('success') || lower.includes('error') || lower.includes('warn')) return `text-${leaf}`;
    return `bg-${leaf}`;
  }

  // Detect base unit from spacing array (most common GCD)
  function detectBaseUnit(spacingArr) {
    if (!spacingArr?.length) return 4;
    const pxValues = spacingArr.map(t => parseFloat(t.value)).filter(v => !isNaN(v) && v > 0);
    if (!pxValues.length) return 4;
    let g = pxValues[0];
    for (const v of pxValues) { let a = g, b = v; while (b) { [a, b] = [b, a % b]; } g = a; }
    return Math.round(g) || 4;
  }

  // Build authorized spacing scale from actual spacing tokens
  function buildSpacingScale(spacingArr, baseUnit) {
    if (!spacingArr?.length) return [];
    const seen = new Set();
    return spacingArr
      .map(t => ({ px: parseFloat(t.value), name: t.name }))
      .filter(({ px }) => !isNaN(px) && px > 0)
      .sort((a, b) => a.px - b.px)
      .filter(({ px }) => { if (seen.has(px)) return false; seen.add(px); return true; })
      .map(({ px, name }) => {
        const multiplier = Math.round(px / baseUnit);
        const varName = cssVar(name);
        return `* ${multiplier}x = \`${px}px\` (\`${varName}\`)`;
      });
  }

  const baseUnit = tokens.meta?.baseUnit || detectBaseUnit(tokens.spacing);
  const spacingScale = buildSpacingScale(tokens.spacing, baseUnit);

  // ── Section 1: Supreme Directives ─────────────────────────────────────────

  const directives = `## 🚨 1. SUPREME DIRECTIVES: THE DESIGN SUBSURFACE
You are an expert front-end engineer functioning as the execution layer for **${hostname}**. Your mandate is strictly limited to assembling UI components using the predefined design system in this document.

You do not have the authority to invent, alter, or guess visual design rules. The initial design definitions have already been extracted from the live application.

**YOU MUST STRICTLY OBEY THE FOLLOWING CONSTRAINTS:**

* **NO HALLUCINATED VALUES:** NEVER invent or hardcode hex colors, rgb/rgba values, or hsl strings. You must ONLY use the semantic CSS variables or Tailwind classes provided in the Token Dictionary below.
* **STRICT MATHEMATICAL SPACING:** NEVER use arbitrary pixel values outside the Spacing Math grid. Calculate layout exclusively from the authorized base-unit multipliers.
* **LOCKED TYPOGRAPHY SCALES:** NEVER guess font weights, sizes, or line heights. Bind all text elements to the paired variables in the Typography Scale.
* **NO UNAUTHORIZED ELEVATION:** NEVER write custom \`box-shadow\` or \`border-radius\` rules. Use only the exact tokens provided.
* **SILENT COMPLIANCE:** If a prompt requires a value not present in this file, find the closest matching semantic token. Do not create a new one.`;

  // ── Section 2: Spacing Math ────────────────────────────────────────────────

  const spacingSection = `## 📐 2. SPACING MATH: THE STRUCTURAL GRID
Layout is an exact science. All spatial relationships must snap to the base unit.

* **Base Unit:** \`${baseUnit}px\`
* **The Multiplier Rule:** Only use the following authorized multiples. Do not interpolate or invent values between these steps.

**Authorized Scale:**
${spacingScale.length ? spacingScale.join('\n') : `* 1x = \`${baseUnit}px\`, 2x = \`${baseUnit * 2}px\`, 4x = \`${baseUnit * 4}px\`, 6x = \`${baseUnit * 6}px\`, 8x = \`${baseUnit * 8}px\``}

**Enforcement Protocol:** If a layout scenario requires an off-grid value, you are required to mathematically force it to the nearest authorized step. No exceptions.`;

  // ── Section 3: Token Dictionary ────────────────────────────────────────────

  const lines = [`## 🎨 3. TOKEN DICTIONARY: THE SUBSURFACE VARIABLES
This project uses a hybrid token architecture. Use designated Tailwind utility classes for standard component construction. For custom CSS or inline styles, use the CSS custom properties. **DO NOT hardcode raw hex, rgb, or pixel values.**`];

  // Colors
  if (tokens.colors?.length) {
    lines.push('\n### Color System');
    lines.push('| Tailwind Class | CSS Variable | Value |');
    lines.push('|---|---|---|');
    for (const t of tokens.colors) {
      lines.push(`| \`${twClass(t.name)}\` | \`${cssVar(t.name)}\` | ${t.value} |`);
    }
  }

  // Typography
  const typoFamilies = tokens.typography?.families || [];
  const typoSizes = tokens.typography?.sizes || [];
  if (typoFamilies.length || typoSizes.length) {
    lines.push('\n### Typography Engine');
    lines.push('Do not mix font families. Maintain strict semantic separation.\n');
    if (typoFamilies.length) {
      for (const t of typoFamilies) {
        const leaf = t.name.split('/').pop();
        const twUtility = leaf?.includes('mono') ? '`font-mono`' : '`font-sans`';
        lines.push(`* **${leaf}:** ${twUtility} | \`${cssVar(t.name)}\` — ${t.value}`);
      }
    }
    if (typoSizes.length) {
      lines.push('\n**Type Scale:**');
      lines.push('| Tailwind | CSS Variable | Size |');
      lines.push('|---|---|---|');
      for (const t of typoSizes) {
        const px = parseFloat(t.value);
        let twText = '`text-base`';
        if (!isNaN(px)) {
          if (px <= 10) twText = '`text-xs`';
          else if (px <= 12) twText = '`text-sm`';
          else if (px <= 14) twText = '`text-base`';
          else if (px <= 16) twText = '`text-lg`';
          else if (px <= 20) twText = '`text-xl`';
          else if (px <= 24) twText = '`text-2xl`';
          else twText = '`text-3xl`';
        }
        lines.push(`| ${twText} | \`${cssVar(t.name)}\` | ${t.value} |`);
      }
    }
  }

  // Border Radius
  if (tokens.radius?.length) {
    lines.push('\n### Border Radius');
    lines.push('| Tailwind | CSS Variable | Value |');
    lines.push('|---|---|---|');
    for (const t of tokens.radius) {
      const leaf = t.name.split('/').pop();
      lines.push(`| \`rounded-${leaf}\` | \`${cssVar(t.name)}\` | ${t.value} |`);
    }
  }

  // Shadows
  if (tokens.shadows?.length) {
    lines.push('\n### Elevation & Depth');
    lines.push('| Tailwind | CSS Variable | Value |');
    lines.push('|---|---|---|');
    for (const t of tokens.shadows) {
      const leaf = t.name.split('/').pop();
      lines.push(`| \`shadow-${leaf}\` | \`${cssVar(t.name)}\` | ${t.value} |`);
    }
  }

  const tokenSection = lines.join('\n');

  // ── Assemble ───────────────────────────────────────────────────────────────

  const header = `# .subsrf — ${hostname}
> Generated by Subsrf Scan · ${new Date().toISOString().split('T')[0]}
> Source: ${url}
> This file is the design contract for AI coding agents. Treat it as a constitution, not a suggestion.

---
`;

  return [header, directives, '\n---\n', spacingSection, '\n---\n', tokenSection].join('\n');
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
      case 'subsrf':           content = subSrfTransformer(tokens, mode); break;
      default:                 content = jsonTransformer(tokens, mode);
    }
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  return NextResponse.json({ content, format });
}
