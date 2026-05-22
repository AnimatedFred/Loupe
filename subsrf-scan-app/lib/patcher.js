// Applies deterministic token fixes to source files.
// Takes the file contents + audit violations + token set and returns patched files.

function buildReplacementMap(tokens) {
  const mode = tokens?.hasDark ? 'dark' : tokens?.hasLight ? 'light' : null;
  const t = mode ? tokens[mode] : null;
  if (!t) return { colors: [], spacing: [], radius: [] };

  // Build: raw value / alias → CSS variable string
  const colors = [];
  for (const token of t.colors || []) {
    const varStr = `var(--${token.name.replace(/\//g, '-')})`;
    const canonical = token.hex || token.value;

    // All forms this color might appear as in source code
    const forms = new Set([canonical]);
    if (canonical) forms.add(canonical.toLowerCase());

    // Short hex
    const h = canonical?.replace('#', '') || '';
    if (h.length === 6 && h[0] === h[1] && h[2] === h[3] && h[4] === h[5]) {
      forms.add('#' + h[0] + h[2] + h[4]);
      forms.add('#' + h[0].toLowerCase() + h[2].toLowerCase() + h[4].toLowerCase());
    }

    // rgb/rgba form from raw value
    if (token.value && token.value !== canonical) {
      forms.add(token.value);
      const m = token.value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      if (m) {
        forms.add(`rgb(${m[1]}, ${m[2]}, ${m[3]})`);
        forms.add(`rgba(${m[1]}, ${m[2]}, ${m[3]}, 1)`);
      }
    }

    for (const form of forms) {
      if (form) colors.push({ find: form, replace: varStr, name: token.name });
    }
  }

  const spacing = [];
  for (const token of t.spacing || []) {
    const varStr = `var(--${token.name.replace(/\//g, '-')})`;
    const px = parseFloat(token.value);
    if (!isNaN(px)) {
      spacing.push({ find: `${px}px`, replace: varStr, name: token.name });
      const rem = Math.round((px / 16) * 1000) / 1000;
      spacing.push({ find: `${rem}rem`, replace: varStr, name: token.name });
    }
  }

  const radius = [];
  for (const token of t.radius || []) {
    const varStr = `var(--${token.name.replace(/\//g, '-')})`;
    const px = parseFloat(token.value);
    if (!isNaN(px)) {
      radius.push({ find: `${px}px`, replace: varStr, name: token.name });
      const rem = Math.round((px / 16) * 1000) / 1000;
      radius.push({ find: `${rem}rem`, replace: varStr, name: token.name });
    }
  }

  return { colors, spacing, radius };
}

// Patch a single line: replace token values with CSS variables.
// Only replaces inside string literals (between quotes) to avoid
// touching variable declarations or comments.
function patchLine(line, colorMap, spacingMap, radiusMap, violations) {
  let patched = line;
  let fixCount = 0;

  // Determine which rules have violations on this line
  const hasColor   = violations.some(v => v.rule === 'hardcoded-color');
  const hasSpacing = violations.some(v => v.rule === 'hardcoded-spacing');
  const hasRadius  = violations.some(v => v.rule === 'hardcoded-radius');

  if (hasColor) {
    for (const { find, replace } of colorMap) {
      // Match inside string literals: '...' or "..."
      const escaped = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`(['"])${escaped}\\1`, 'g');
      const next = patched.replace(re, (_, quote) => `${quote}${replace}${quote}`);
      if (next !== patched) { patched = next; fixCount++; }

      // Also match bare values in CSS (e.g. color: #fff;)
      const reCSS = new RegExp(`(?<=[:\\s])${escaped}(?=[;\\s,)\\n])`, 'g');
      const nextCSS = patched.replace(reCSS, replace);
      if (nextCSS !== patched) { patched = nextCSS; fixCount++; }
    }
  }

  if (hasSpacing) {
    for (const { find, replace } of spacingMap) {
      const escaped = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Only replace in style prop string values, not elsewhere (e.g. width/height shorthand numbers)
      const re = new RegExp(`(['"])${escaped}\\1`, 'g');
      const next = patched.replace(re, (_, quote) => `${quote}${replace}${quote}`);
      if (next !== patched) { patched = next; fixCount++; }
    }
  }

  if (hasRadius) {
    for (const { find, replace } of radiusMap) {
      const escaped = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`(['"])${escaped}\\1`, 'g');
      const next = patched.replace(re, (_, quote) => `${quote}${replace}${quote}`);
      if (next !== patched) { patched = next; fixCount++; }

      const reCSS = new RegExp(`(?<=border[\\w-]*radius\\s*:\\s*)${escaped}(?=[;\\s])`, 'gi');
      const nextCSS = patched.replace(reCSS, replace);
      if (nextCSS !== patched) { patched = nextCSS; fixCount++; }
    }
  }

  return { line: patched, fixCount };
}

// Apply all token fixes to a set of files.
// Returns array of { path, content, sha, fixCount } for files that changed.
export function applyTokenFixes(fileContents, violations, tokens) {
  const { colors, spacing, radius } = buildReplacementMap(tokens);

  // Group violations by file and line for fast lookup
  const violationsByFile = new Map();
  for (const v of violations) {
    if (!violationsByFile.has(v.file)) violationsByFile.set(v.file, new Map());
    const byLine = violationsByFile.get(v.file);
    if (!byLine.has(v.line)) byLine.set(v.line, []);
    byLine.get(v.line).push(v);
  }

  const patches = [];

  for (const file of fileContents) {
    const byLine = violationsByFile.get(file.path);
    if (!byLine || byLine.size === 0) continue;

    const lines = file.content.split('\n');
    let totalFixes = 0;
    const patchedLines = lines.map((line, idx) => {
      const lineNum = idx + 1;
      const lineViolations = byLine.get(lineNum);
      if (!lineViolations) return line;

      const { line: patched, fixCount } = patchLine(line, colors, spacing, radius, lineViolations);
      totalFixes += fixCount;
      return patched;
    });

    if (totalFixes === 0) continue;

    patches.push({
      path: file.path,
      content: patchedLines.join('\n'),
      sha: file.sha,
      fixCount: totalFixes,
    });
  }

  return patches;
}
