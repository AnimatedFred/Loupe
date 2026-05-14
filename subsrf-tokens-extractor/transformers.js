// Pure format transformer functions.
// Each takes a TokenSet and returns a string in the target format.

function cssTransformer(tokenSet, mode = 'dark') {
  const tokens = tokenSet[mode] || tokenSet.dark || tokenSet.light;
  if (!tokens) return '/* No tokens available */';

  const lines = [`/* ${tokenSet.url} — extracted by Subsrf Tokens */\n:root {`];

  if (tokens.colors?.length) {
    lines.push('  /* Colors */');
    for (const t of tokens.colors) {
      const cssName = '--' + t.name.replace(/\//g, '-');
      lines.push(`  ${cssName}: ${t.value};`);
    }
  }

  if (tokens.typography?.families?.length) {
    lines.push('\n  /* Typography */');
    for (const t of tokens.typography.families) {
      lines.push(`  --${t.name.replace(/\//g, '-')}: ${t.value};`);
    }
    for (const t of tokens.typography.sizes || []) {
      lines.push(`  --${t.name.replace(/\//g, '-')}: ${t.value};`);
    }
    for (const t of tokens.typography.lineHeights || []) {
      lines.push(`  --${t.name.replace(/\//g, '-')}: ${t.value};`);
    }
  }

  if (tokens.spacing?.length) {
    lines.push('\n  /* Spacing */');
    for (const t of tokens.spacing) {
      lines.push(`  --${t.name.replace(/\//g, '-')}: ${t.value};`);
    }
  }

  if (tokens.radius?.length) {
    lines.push('\n  /* Border Radius */');
    for (const t of tokens.radius) {
      lines.push(`  --${t.name.replace(/\//g, '-')}: ${t.value};`);
    }
  }

  if (tokens.shadows?.length) {
    lines.push('\n  /* Shadows */');
    for (const t of tokens.shadows) {
      lines.push(`  --${t.name.replace(/\//g, '-')}: ${t.value};`);
    }
  }

  lines.push('}');
  return lines.join('\n');
}

function tailwindTransformer(tokenSet, mode = 'dark') {
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
    obj[parts[parts.length - 1]] = `'${t.value}'`;
  }

  const spacing = {};
  for (const t of tokens.spacing || []) {
    const key = t.name.split('/')[1];
    if (key) spacing[`'${key}'`] = `'${t.value}'`;
  }

  const radii = {};
  for (const t of tokens.radius || []) {
    const key = t.name.split('/')[1];
    if (key) radii[key] = `'${t.value}'`;
  }

  const shadows = {};
  for (const t of tokens.shadows || []) {
    const key = t.name.split('/')[1];
    if (key) shadows[key] = `'${t.value}'`;
  }

  const fontFamilies = {};
  for (const t of tokens.typography?.families || []) {
    const key = t.name.split('/')[2];
    if (key) fontFamilies[key] = `['${t.value}']`;
  }

  const colorsStr = JSON.stringify(colors, null, 8).replace(/"([^"]+)":/g, '$1:').replace(/"/g, '').replace(/\n/g, '\n    ');
  const spacingStr = JSON.stringify(spacing, null, 8).replace(/"([^"]+)":/g, '$1:').replace(/"/g, '').replace(/\n/g, '\n    ');
  const radiiStr = JSON.stringify(radii, null, 8).replace(/"([^"]+)":/g, '$1:').replace(/"/g, '').replace(/\n/g, '\n    ');
  const shadowStr = JSON.stringify(shadows, null, 8).replace(/"([^"]+)":/g, '$1:').replace(/"/g, '').replace(/\n/g, '\n    ');

  return `// tailwind.config.js — extracted from ${tokenSet.url}
module.exports = {
  theme: {
    extend: {
      colors: ${colorsStr},
      spacing: ${spacingStr},
      borderRadius: ${radiiStr},
      boxShadow: ${shadowStr},
    }
  }
}`;
}

function jsonTransformer(tokenSet, mode = 'dark') {
  const tokens = tokenSet[mode] || tokenSet.dark || tokenSet.light;
  if (!tokens) return '{}';
  return JSON.stringify(tokens, null, 2);
}

function styleDictionaryTransformer(tokenSet, mode = 'dark') {
  const tokens = tokenSet[mode] || tokenSet.dark || tokenSet.light;
  if (!tokens) return '{}';

  const sd = {};

  const setNested = (obj, path, value, type) => {
    const parts = path.split('/');
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!cur[parts[i]]) cur[parts[i]] = {};
      cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = { value, type };
  };

  for (const t of tokens.colors || []) setNested(sd, t.name, t.value, 'color');
  for (const t of tokens.typography?.families || []) setNested(sd, t.name, t.value, 'fontFamily');
  for (const t of tokens.typography?.sizes || []) setNested(sd, t.name, t.value, 'fontSize');
  for (const t of tokens.spacing || []) setNested(sd, t.name, t.value, 'spacing');
  for (const t of tokens.radius || []) setNested(sd, t.name, t.value, 'borderRadius');
  for (const t of tokens.shadows || []) setNested(sd, t.name, t.value, 'shadow');

  return JSON.stringify(sd, null, 2);
}

function figmaTransformer(tokenSet) {
  const dark = tokenSet.dark;
  const light = tokenSet.light;
  const primary = dark || light;
  if (!primary) return '{}';

  const modes = tokenSet.hasDark && tokenSet.hasLight ? ['Dark', 'Light'] : [tokenSet.hasDark ? 'Dark' : 'Light'];

  const variables = [];

  const addVar = (name, type, values) => variables.push({ name, type, values });

  const parseRgb = (css) => {
    const m = css.match(/rgba?\((\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)(?:,\s*(\d+(?:\.\d+)?))?\)/);
    if (!m) return null;
    return {
      r: parseFloat(m[1]) / 255,
      g: parseFloat(m[2]) / 255,
      b: parseFloat(m[3]) / 255,
      a: m[4] !== undefined ? parseFloat(m[4]) : 1,
    };
  };

  for (const t of primary.colors || []) {
    const vals = {};
    if (dark) vals['Dark'] = parseRgb(dark.colors.find(c => c.name === t.name)?.value || t.value) || t.value;
    if (light) vals['Light'] = parseRgb(light.colors.find(c => c.name === t.name)?.value || t.value) || t.value;
    if (Object.values(vals).some(Boolean)) {
      addVar(t.name, 'COLOR', vals);
    }
  }

  for (const t of primary.spacing || []) {
    addVar(t.name, 'FLOAT', { Default: parseFloat(t.value) });
  }

  for (const t of primary.radius || []) {
    addVar(t.name, 'FLOAT', { Default: parseFloat(t.value) });
  }

  return JSON.stringify({
    name: new URL(tokenSet.url.startsWith('http') ? tokenSet.url : 'https://' + tokenSet.url).hostname + ' tokens',
    modes,
    variables,
  }, null, 2);
}

function transform(tokenSet, format, mode = 'dark') {
  switch (format) {
    case 'css': return { content: cssTransformer(tokenSet, mode), ext: 'css', lang: 'css' };
    case 'tailwind': return { content: tailwindTransformer(tokenSet, mode), ext: 'js', lang: 'js' };
    case 'json': return { content: jsonTransformer(tokenSet, mode), ext: 'json', lang: 'json' };
    case 'style_dictionary': return { content: styleDictionaryTransformer(tokenSet, mode), ext: 'json', lang: 'json' };
    case 'figma': return { content: figmaTransformer(tokenSet), ext: 'json', lang: 'json' };
    default: return { content: jsonTransformer(tokenSet, mode), ext: 'json', lang: 'json' };
  }
}

module.exports = { transform, cssTransformer, tailwindTransformer, jsonTransformer, styleDictionaryTransformer, figmaTransformer };
