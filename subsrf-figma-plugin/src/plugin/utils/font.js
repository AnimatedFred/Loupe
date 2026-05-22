export async function loadFont(family, weight) {
  const style = mapWeight(weight);
  const fontName = { family, style };
  try {
    await figma.loadFontAsync(fontName);
    return fontName;
  } catch (_) {
    const fallback = { family: 'Inter', style };
    try {
      await figma.loadFontAsync(fallback);
      return fallback;
    } catch (_2) {
      await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
      return { family: 'Inter', style: 'Regular' };
    }
  }
}

export function mapWeight(weight) {
  const w = parseInt(weight);
  if (w >= 900) return 'Black';
  if (w >= 800) return 'Extra Bold';
  if (w >= 700) return 'Bold';
  if (w >= 600) return 'Semi Bold';
  if (w >= 500) return 'Medium';
  return 'Regular';
}

export function parseFontFamily(cssFamily) {
  if (!cssFamily) return 'Inter';
  const first = cssFamily.split(',')[0].replace(/['"]/g, '').trim();
  return first || 'Inter';
}
