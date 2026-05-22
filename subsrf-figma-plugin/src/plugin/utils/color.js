export function parseRgb(color) {
  if (typeof color !== 'string') return { r: 0, g: 0, b: 0 };
  const c = color.trim().toLowerCase();
  const named = {
    white: { r: 255, g: 255, b: 255 }, black: { r: 0, g: 0, b: 0 },
    red: { r: 255, g: 0, b: 0 }, blue: { r: 0, g: 0, b: 255 },
    green: { r: 0, g: 128, b: 0 }, yellow: { r: 255, g: 255, b: 0 },
    transparent: { r: 0, g: 0, b: 0, a: 0 },
    gray: { r: 128, g: 128, b: 128 }, grey: { r: 128, g: 128, b: 128 },
  };
  if (named[c]) return named[c];
  if (color.startsWith('rgb')) {
    const values = color.match(/\d+(\.\d+)?/g).map(Number);
    return { r: values[0] || 0, g: values[1] || 0, b: values[2] || 0, a: values[3] };
  }
  if (color.startsWith('#')) {
    let hex = color.replace('#', '');
    if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
    return {
      r: parseInt(hex.substring(0, 2), 16) || 0,
      g: parseInt(hex.substring(2, 4), 16) || 0,
      b: parseInt(hex.substring(4, 6), 16) || 0,
    };
  }
  return { r: 0, g: 0, b: 0 };
}

export function cssColorToRgb(color) {
  const { r, g, b } = parseRgb(color);
  return { r: r / 255, g: g / 255, b: b / 255 };
}

export function createSolidFill(cssColor) {
  const rgb = parseRgb(cssColor);
  return {
    type: 'SOLID',
    color: { r: rgb.r / 255, g: rgb.g / 255, b: rgb.b / 255 },
    opacity: rgb.a !== undefined ? rgb.a : 1,
  };
}

export function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
}
