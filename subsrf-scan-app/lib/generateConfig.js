// Generates a machine-parseable .subsrf.json config from a scan token set.
// This is the rule file the remediation agent reads to know what to enforce.

const SPACING_PROPERTIES = [
  'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
  'gap', 'rowGap', 'columnGap',
  'top', 'right', 'bottom', 'left',
  'width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight',
];

function cssVarName(name) {
  return '--' + name.replace(/\//g, '-');
}

function colorAliases(hex, rawValue) {
  const aliases = new Set();

  if (hex) {
    // Always include lowercase
    aliases.add(hex.toLowerCase());

    // Shorthand hex if all pairs match: #aabbcc → #abc
    const h = hex.replace('#', '');
    if (h.length === 6 && h[0] === h[1] && h[2] === h[3] && h[4] === h[5]) {
      aliases.add('#' + h[0] + h[2] + h[4]);
      aliases.add('#' + h[0].toUpperCase() + h[2].toUpperCase() + h[4].toUpperCase());
    }
  }

  // Include rgb/rgba form from the raw computed value if it differs from hex
  if (rawValue && rawValue !== hex) {
    const m = rawValue.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (m) {
      aliases.add(`rgb(${m[1]}, ${m[2]}, ${m[3]})`);
      const alpha = m[4] !== undefined ? parseFloat(m[4]) : 1;
      if (alpha === 1) {
        aliases.add(`rgba(${m[1]}, ${m[2]}, ${m[3]}, 1)`);
      } else {
        aliases.add(`rgba(${m[1]}, ${m[2]}, ${m[3]}, ${alpha})`);
      }
    }
  }

  // Remove the canonical value itself from aliases
  if (hex) aliases.delete(hex);

  return [...aliases].filter(Boolean);
}

function numericAliases(pxValue) {
  const px = parseFloat(pxValue);
  if (isNaN(px) || px <= 0) return [];

  const rem = Math.round((px / 16) * 1000) / 1000;
  const remStr = `${rem}rem`;

  // Only include rem if it's not the same string as the source value
  return remStr !== pxValue ? [remStr] : [];
}

function resolveHostname(url) {
  if (!url) return 'unknown';
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
  } catch {
    return url;
  }
}

export function generateConfig(tokenSet, sourceUrl) {
  const mode = tokenSet?.hasDark ? 'dark' : tokenSet?.hasLight ? 'light' : null;
  const tokens = mode ? tokenSet[mode] : null;

  const colors = (tokens?.colors || []).map(t => {
    const canonical = t.hex || t.value;
    const aliases = colorAliases(t.hex, t.value);
    const entry = { variable: cssVarName(t.name), value: canonical };
    if (aliases.length) entry.aliases = aliases;
    return entry;
  });

  const spacing = (tokens?.spacing || []).map(t => {
    const aliases = numericAliases(t.value);
    return {
      variable: cssVarName(t.name),
      value: t.value,
      ...(aliases.length ? { aliases } : {}),
      properties: SPACING_PROPERTIES,
    };
  });

  const radius = (tokens?.radius || []).map(t => {
    const aliases = numericAliases(t.value);
    return {
      variable: cssVarName(t.name),
      value: t.value,
      ...(aliases.length ? { aliases } : {}),
    };
  });

  return {
    version: '1',
    source: resolveHostname(sourceUrl),
    generated: new Date().toISOString().split('T')[0],
    scope: {
      include: [
        'src/**/*.{jsx,tsx,js,ts}',
        'app/**/*.{jsx,tsx,js,ts}',
        'components/**/*.{jsx,tsx}',
        'styles/**/*.{css,scss}',
      ],
      exclude: [
        'node_modules/**',
        '.next/**',
        '**/*.test.*',
        '**/*.spec.*',
        '**/*.stories.*',
      ],
    },
    enforce: {
      colors: 'error',
      spacing: 'warn',
      radius: 'warn',
      typography: 'off',
    },
    tokens: { colors, spacing, radius },
  };
}
