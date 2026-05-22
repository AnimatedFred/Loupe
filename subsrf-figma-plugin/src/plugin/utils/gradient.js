import { parseRgb } from './color.js';

export function parseAllShadows(cssShadow) {
  const result = [];
  let depth = 0, start = 0;
  for (let i = 0; i <= cssShadow.length; i++) {
    const ch = cssShadow[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if ((ch === ',' || i === cssShadow.length) && depth === 0) {
      const part = cssShadow.slice(start, i).trim();
      if (part) {
        const s = parseShadow(part);
        if (s) result.push(s);
      }
      start = i + 1;
    }
  }
  return result;
}

function parseShadow(cssShadow) {
  const colorMatch = cssShadow.match(/rgba?\([^)]+\)|#[a-fA-F0-9]{3,8}/);
  if (!colorMatch) return null;
  const withoutColor = cssShadow.replace(colorMatch[0], '');
  const nums = withoutColor.match(/-?\d+(\.\d+)?/g);
  if (!nums || nums.length < 2) return null;
  const x = parseFloat(nums[0]) || 0;
  const y = parseFloat(nums[1]) || 0;
  const blur = parseFloat(nums[2]) || 0;
  const spread = parseFloat(nums[3]) || 0;
  // Skip flat halo shadows (focus rings, Tailwind ring) — no Figma equivalent
  if (x === 0 && y === 0 && blur === 0) return null;
  const color = parseRgb(colorMatch[0]);
  return {
    type: 'DROP_SHADOW',
    color: { r: color.r / 255, g: color.g / 255, b: color.b / 255, a: color.a !== undefined ? color.a : 1 },
    offset: { x, y },
    radius: blur,
    spread,
    visible: true,
    blendMode: 'NORMAL',
  };
}

export function parseLinearGradient(bgImage) {
  const content = extractGradientContent(bgImage);
  if (!content) return null;
  let parts = splitTopLevel(content);
  if (parts.length < 2) return null;

  let angle = 180;
  const first = parts[0].trim();
  if (/^to\s+/i.test(first)) {
    angle = keywordToAngle(first); parts = parts.slice(1);
  } else if (/^-?\d+(\.\d+)?deg/i.test(first)) {
    angle = parseFloat(first); parts = parts.slice(1);
  } else if (/^-?\d+(\.\d+)?turn/i.test(first)) {
    angle = parseFloat(first) * 360; parts = parts.slice(1);
  } else if (/^-?\d+(\.\d+)?rad/i.test(first)) {
    angle = parseFloat(first) * (180 / Math.PI); parts = parts.slice(1);
  }

  const stops = parts.map(p => parseColorStop(p.trim())).filter(Boolean);
  if (stops.length < 2) return null;

  for (let i = 0; i < stops.length; i++) {
    if (stops[i].position === null) {
      if (i === 0) stops[i].position = 0;
      else if (i === stops.length - 1) stops[i].position = 1;
      else stops[i].position = i / (stops.length - 1);
    }
  }

  const theta = angle * Math.PI / 180;
  const sinT = Math.sin(theta), cosT = Math.cos(theta);
  return {
    type: 'GRADIENT_LINEAR',
    gradientTransform: [
      [sinT,  cosT,  0.5 - 0.5 * sinT],
      [-cosT, sinT,  0.5 + 0.5 * cosT],
    ],
    gradientStops: stops.map(s => ({
      position: s.position,
      color: { r: s.r / 255, g: s.g / 255, b: s.b / 255, a: s.a },
    })),
    opacity: 1,
    visible: true,
    blendMode: 'NORMAL',
  };
}

function extractGradientContent(bgImage) {
  const idx = bgImage.indexOf('linear-gradient(');
  if (idx === -1) return null;
  const start = idx + 'linear-gradient('.length;
  let depth = 1, i = start;
  while (i < bgImage.length && depth > 0) {
    if (bgImage[i] === '(') depth++;
    else if (bgImage[i] === ')') depth--;
    i++;
  }
  return bgImage.substring(start, i - 1);
}

function splitTopLevel(str) {
  const parts = [];
  let depth = 0, current = '';
  for (let i = 0; i < str.length; i++) {
    if (str[i] === '(') depth++;
    else if (str[i] === ')') depth--;
    else if (str[i] === ',' && depth === 0) { parts.push(current); current = ''; continue; }
    current += str[i];
  }
  parts.push(current);
  return parts;
}

function keywordToAngle(keyword) {
  const map = {
    'to top': 0, 'to top right': 45, 'to right top': 45,
    'to right': 90, 'to bottom right': 135, 'to right bottom': 135,
    'to bottom': 180, 'to bottom left': 225, 'to left bottom': 225,
    'to left': 270, 'to top left': 315, 'to left top': 315,
  };
  const k = keyword.toLowerCase().replace(/\s+/g, ' ').trim();
  return map[k] !== undefined ? map[k] : 180;
}

function parseColorStop(str) {
  const posMatch = str.match(/([\d.]+%)\s*$/);
  let position = null;
  if (posMatch) {
    position = parseFloat(posMatch[1]) / 100;
    str = str.slice(0, str.lastIndexOf(posMatch[0])).trim();
  }
  const colorStr = str.trim();
  if (!colorStr || colorStr === 'transparent') return { r: 0, g: 0, b: 0, a: 0, position };
  const rgb = parseRgb(colorStr);
  return { r: rgb.r, g: rgb.g, b: rgb.b, a: rgb.a !== undefined ? rgb.a : 1, position };
}
