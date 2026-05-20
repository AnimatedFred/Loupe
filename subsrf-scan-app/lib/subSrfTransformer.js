// Generates a .subsrf design contract document from a token set.
// tokenSet: the full tokens object (with .dark, .light, .url, etc.)
// sourceUrl: optional override for the source URL (falls back to tokenSet.url)
// mode: 'dark' | 'light'
export function generateSubsrf(tokenSet, sourceUrl, mode) {
  const tokens = tokenSet[mode] || tokenSet.dark || tokenSet.light;
  const url = sourceUrl || tokenSet.url || 'unknown';
  let hostname = url;
  try { hostname = new URL(url.startsWith('http') ? url : 'https://' + url).hostname; } catch {}

  if (!tokens) return `# .subsrf — ${hostname}\n\nNo tokens extracted.`;

  // ── helpers ────────────────────────────────────────────────────────────────

  const cssVar = name => '--' + name.replace(/\//g, '-');

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

  function detectBaseUnit(spacingArr) {
    if (!spacingArr?.length) return 4;
    const pxValues = spacingArr.map(t => parseFloat(t.value)).filter(v => !isNaN(v) && v > 0);
    if (!pxValues.length) return 4;
    let g = pxValues[0];
    for (const v of pxValues) { let a = g, b = v; while (b) { [a, b] = [b, a % b]; } g = a; }
    return Math.round(g) || 4;
  }

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

  if (tokens.colors?.length) {
    lines.push('\n### Color System');
    lines.push('| Tailwind Class | CSS Variable | Value |');
    lines.push('|---|---|---|');
    for (const t of tokens.colors) {
      lines.push(`| \`${twClass(t.name)}\` | \`${cssVar(t.name)}\` | ${t.value} |`);
    }
  }

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

  if (tokens.radius?.length) {
    lines.push('\n### Border Radius');
    lines.push('| Tailwind | CSS Variable | Value |');
    lines.push('|---|---|---|');
    for (const t of tokens.radius) {
      const leaf = t.name.split('/').pop();
      lines.push(`| \`rounded-${leaf}\` | \`${cssVar(t.name)}\` | ${t.value} |`);
    }
  }

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
