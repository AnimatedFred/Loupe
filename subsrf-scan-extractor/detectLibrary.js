// Component library fingerprinting against reference database.

const LIBRARY_DB = {
  'Tailwind CSS v3': {
    colors: ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'],
    spacingScale: [4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96],
    radii: [2, 4, 6, 8, 12, 16, 9999],
    fonts: ['ui-sans-serif', 'system-ui', 'Inter'],
    classPatterns: [],
  },
  'shadcn/ui': {
    colors: ['#0F0F0F', '#FAFAFA', '#18181B', '#E4E4E7', '#A1A1AA', '#3F3F46'],
    spacingScale: [4, 8, 12, 16, 24, 32, 48, 64],
    radii: [4, 6, 8, 12],
    fonts: ['Inter', 'ui-sans-serif'],
    classPatterns: ['radix-', 'data-state', 'data-radix'],
  },
  'Material UI': {
    colors: ['#1976D2', '#9C27B0', '#2E7D32', '#ED6C02', '#D32F2F', '#0288D1'],
    spacingScale: [4, 8, 12, 16, 20, 24, 32, 40, 48],
    radii: [4, 8, 12, 16, 50],
    fonts: ['Roboto', 'Arial', 'sans-serif'],
    classPatterns: ['MuiButton', 'MuiTypography', 'MuiPaper', 'MuiBox'],
  },
  'Ant Design': {
    colors: ['#1677FF', '#52C41A', '#FAAD14', '#FF4D4F', '#722ED1'],
    spacingScale: [4, 8, 12, 16, 20, 24, 32, 40, 48, 64],
    radii: [2, 4, 6, 8],
    fonts: ['Chinese Quote', 'Inter', 'Segoe UI', 'PingFang SC'],
    classPatterns: ['ant-btn', 'ant-input', 'ant-layout', 'ant-table'],
  },
  'Chakra UI': {
    colors: ['#3182CE', '#38A169', '#DD6B20', '#E53E3E', '#805AD5'],
    spacingScale: [4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64],
    radii: [2, 4, 6, 8, 12, 16, 9999],
    fonts: ['Inter', 'system-ui', 'sans-serif'],
    classPatterns: ['chakra-', 'css-'],
  },
  'Bootstrap': {
    colors: ['#0D6EFD', '#198754', '#FFC107', '#DC3545', '#6C757D', '#6610F2'],
    spacingScale: [4, 8, 12, 16, 24, 32, 48, 64, 80, 96],
    radii: [4, 8, 16, 9999],
    fonts: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto'],
    classPatterns: ['btn-', 'col-', 'row', 'container', 'navbar-', 'modal-'],
  },
};

// Approximate CIELAB ΔE using a simplified perceptual distance on RGB.
function colorDistance(hexA, hexB) {
  const parseHex = (h) => {
    const n = parseInt(h.replace('#', ''), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const [r1, g1, b1] = parseHex(hexA);
  const [r2, g2, b2] = parseHex(hexB);
  return Math.sqrt(
    2 * (r1 - r2) ** 2 +
    4 * (g1 - g2) ** 2 +
    3 * (b1 - b2) ** 2
  );
}

function scoreLibraryMatch(tokens, library) {
  const primary = tokens.dark || tokens.light;
  if (!primary) return 0;

  let score = 0;
  let checks = 0;

  // Color match: for each reference color, check if any extracted color is within threshold
  const extractedHexes = (primary.colors || []).map(c => c.hex).filter(Boolean);
  let colorMatches = 0;
  for (const refColor of library.colors) {
    const closest = extractedHexes.reduce((best, hex) => {
      const d = colorDistance(refColor, hex);
      return d < best ? d : best;
    }, Infinity);
    if (closest < 30) colorMatches++;
  }
  score += colorMatches / Math.max(library.colors.length, 1);
  checks++;

  // Spacing scale overlap
  const extractedSpacing = (primary.spacing || []).map(s => parseFloat(s.value));
  let spacingMatches = 0;
  for (const refPx of library.spacingScale) {
    if (extractedSpacing.some(px => Math.abs(px - refPx) <= 2)) spacingMatches++;
  }
  score += spacingMatches / Math.max(library.spacingScale.length, 1);
  checks++;

  // Font family match
  const extractedFonts = (primary.typography?.families || []).map(f => f.value.toLowerCase());
  const fontMatch = library.fonts.some(f => extractedFonts.some(ef => ef.includes(f.toLowerCase())));
  if (fontMatch) score += 1;
  checks++;

  return score / checks;
}

function detectLibrary(tokenResult) {
  const scores = Object.entries(LIBRARY_DB).map(([name, lib]) => ({
    library: name,
    confidence: Math.round(scoreLibraryMatch(tokenResult, lib) * 100) / 100,
  })).sort((a, b) => b.confidence - a.confidence);

  const primary = tokenResult.dark || tokenResult.light;

  // Identify custom tokens not matching any reference library color
  const customTokens = [];
  if (primary?.colors) {
    const allRefColors = Object.values(LIBRARY_DB).flatMap(l => l.colors);
    for (const token of primary.colors) {
      if (!token.hex) continue;
      const nearestDist = allRefColors.reduce((best, ref) => {
        const d = colorDistance(token.hex, ref);
        return d < best ? d : best;
      }, Infinity);
      if (nearestDist > 40) customTokens.push(token.name);
    }
  }

  return {
    primaryMatch: scores[0] || null,
    secondaryMatch: scores[1]?.confidence > 0.3 ? scores[1] : null,
    customTokens: customTokens.slice(0, 8),
  };
}

module.exports = { detectLibrary };
