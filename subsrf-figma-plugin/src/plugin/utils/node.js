import { rgbToHex } from './color.js';

export function resolveVarName(id) {
  try {
    const v = figma.variables && figma.variables.getVariableById(id);
    return v ? v.name : null;
  } catch (_) { return null; }
}

function resolveStyleName(id) {
  if (!id) return null;
  try {
    const s = figma.getStyleById(id);
    return s ? s.name : null;
  } catch (_) { return null; }
}

function gradientCss(f) {
  const stops = (f.gradientStops || []).map(s =>
    rgbToHex(s.color.r, s.color.g, s.color.b) + ' ' + Math.round(s.position * 100) + '%'
  ).join(', ');
  if (f.type === 'GRADIENT_LINEAR') return `linear-gradient(${stops})`;
  if (f.type === 'GRADIENT_RADIAL') return `radial-gradient(${stops})`;
  return f.type.replace('GRADIENT_', '').toLowerCase() + `-gradient(${stops})`;
}

const MAX_CHILDREN = 40;

export function extractNodeFull(node, depth, maxDepth) {
  if (!node) return null;
  const info = { id: node.id, name: node.name, type: node.type };

  if ('width'  in node) info.width  = Math.round(node.width);
  if ('height' in node) info.height = Math.round(node.height);
  if ('x' in node) info.x = Math.round(node.x);
  if ('y' in node) info.y = Math.round(node.y);

  // How this node sizes itself inside an auto-layout parent
  if (node.layoutSizingHorizontal && node.layoutSizingHorizontal !== 'FIXED') {
    info.sizingH = node.layoutSizingHorizontal; // FILL | HUG
  }
  if (node.layoutSizingVertical && node.layoutSizingVertical !== 'FIXED') {
    info.sizingV = node.layoutSizingVertical; // FILL | HUG
  }
  // Auto-layout child alignment and grow within parent
  if (node.layoutAlign && node.layoutAlign !== 'MIN' && node.layoutAlign !== 'INHERIT') {
    info.layoutAlign = node.layoutAlign; // CENTER | MAX | STRETCH
  }
  if (node.layoutGrow && node.layoutGrow !== 0) {
    info.layoutGrow = node.layoutGrow;
  }
  // Absolute-positioned child inside an auto-layout parent
  if (node.layoutPositioning === 'ABSOLUTE') {
    info.layoutPositioning = 'ABSOLUTE';
  }

  if ('blendMode' in node && node.blendMode !== 'NORMAL' && node.blendMode !== 'PASS_THROUGH') {
    info.blendMode = node.blendMode;
  }
  if (node.clipsContent === true) info.clipsContent = true;
  if (typeof node.minWidth === 'number'  && node.minWidth  > 0) info.minWidth  = node.minWidth;
  if (typeof node.maxWidth === 'number')                         info.maxWidth  = node.maxWidth;
  if (typeof node.minHeight === 'number' && node.minHeight > 0) info.minHeight = node.minHeight;
  if (typeof node.maxHeight === 'number')                        info.maxHeight = node.maxHeight;

  const bv = ('boundVariables' in node) ? (node.boundVariables || {}) : {};

  if ('fills' in node && Array.isArray(node.fills)) {
    const visible = node.fills.filter(f => f.visible !== false);
    if (visible.length > 0) {
      const styleName = resolveStyleName(node.fillStyleId);
      if (styleName) info.fillStyle = styleName;
      info.fills = visible.map((f, i) => {
        if (f.type === 'SOLID') {
          const hex = rgbToHex(f.color.r, f.color.g, f.color.b);
          const tok = bv.fills && bv.fills[i] ? resolveVarName(bv.fills[i].id) : null;
          return { type: 'SOLID', color: tok ? `${hex} (${tok})` : hex, opacity: f.opacity !== undefined ? Math.round(f.opacity * 100) / 100 : 1 };
        }
        if (f.type === 'IMAGE') return { type: 'IMAGE', note: 'image fill' };
        if (f.type && f.type.indexOf('GRADIENT') === 0) return { type: f.type, css: gradientCss(f) };
        return { type: f.type };
      });
    }
  }

  if ('strokes' in node && Array.isArray(node.strokes)) {
    const visible = node.strokes.filter(s => s.visible !== false);
    if (visible.length > 0) {
      info.strokes = visible.map((s, i) => {
        const hex = s.color ? rgbToHex(s.color.r, s.color.g, s.color.b) : null;
        const tok = bv.strokes && bv.strokes[i] ? resolveVarName(bv.strokes[i].id) : null;
        const out = { type: s.type || 'SOLID', color: tok ? `${hex} (${tok})` : hex };
        if (typeof node.strokeWeight === 'number') out.weight = node.strokeWeight;
        if (node.strokeAlign) out.align = node.strokeAlign;
        if (Array.isArray(node.strokeDashes) && node.strokeDashes.length > 0) out.dashes = node.strokeDashes;
        return out;
      });
    }
  }

  if ('cornerRadius' in node && typeof node.cornerRadius === 'number' && node.cornerRadius > 0) {
    info.cornerRadius = node.cornerRadius;
  } else if ('topLeftRadius' in node) {
    const tl = node.topLeftRadius || 0, tr = node.topRightRadius || 0,
          br = node.bottomRightRadius || 0, bl = node.bottomLeftRadius || 0;
    if (tl || tr || br || bl) info.borderRadius = { tl, tr, br, bl };
  }

  if ('effects' in node && Array.isArray(node.effects)) {
    const visible = node.effects.filter(e => e.visible !== false);
    if (visible.length > 0) {
      const styleName = resolveStyleName(node.effectStyleId);
      if (styleName) info.effectStyle = styleName;
      info.effects = visible.map(e => {
        const out = { type: e.type };
        if ('radius' in e) out.radius = e.radius;
        if ('spread' in e) out.spread = e.spread;
        if (e.offset) out.offset = { x: e.offset.x, y: e.offset.y };
        if (e.color) out.color = rgbToHex(e.color.r, e.color.g, e.color.b) +
          (e.color.a < 1 ? ` (${Math.round(e.color.a * 100)}% opacity)` : '');
        return out;
      });
    }
  }

  if ('opacity' in node && node.opacity !== 1) info.opacity = node.opacity;

  if ('layoutMode' in node && node.layoutMode !== 'NONE') {
    const layout = {
      mode: node.layoutMode,
      gap: node.itemSpacing || 0,
      padding: { top: node.paddingTop || 0, right: node.paddingRight || 0, bottom: node.paddingBottom || 0, left: node.paddingLeft || 0 },
      primaryAxis: node.primaryAxisAlignItems,
      counterAxis: node.counterAxisAlignItems,
      primaryAxisSizing: node.primaryAxisSizingMode,
      counterAxisSizing: node.counterAxisSizingMode,
    };
    if (node.layoutWrap === 'WRAP') layout.wrap = true;
    if (node.counterAxisSpacing) layout.counterAxisGap = node.counterAxisSpacing;
    info.layout = layout;
  }

  if (node.type === 'TEXT') {
    try {
      info.text = node.characters;
      const styleName = resolveStyleName(node.textStyleId);
      if (styleName) info.textStyle = styleName;
      if (typeof node.fontSize === 'number') {
        const fsTok = bv.fontSize ? resolveVarName(bv.fontSize.id) : null;
        info.fontSize = fsTok ? `${node.fontSize} (${fsTok})` : node.fontSize;
      }
      if (typeof node.fontName === 'object' && node.fontName) {
        info.fontFamily = node.fontName.family;
        info.fontStyle  = node.fontName.style;
      }
      if (typeof node.fontWeight === 'number') info.fontWeight = node.fontWeight;
      if (node.textAlignHorizontal) info.textAlign = node.textAlignHorizontal;
      if (node.textAlignVertical && node.textAlignVertical !== 'TOP') info.textAlignV = node.textAlignVertical;
      if (node.textCase && node.textCase !== 'ORIGINAL') info.textCase = node.textCase;
      if (node.textDecoration && node.textDecoration !== 'NONE') info.textDecoration = node.textDecoration;
      if (typeof node.lineHeight === 'object' && node.lineHeight.unit !== 'AUTO') {
        info.lineHeight = node.lineHeight.value + (node.lineHeight.unit === 'PERCENT' ? '%' : 'px');
      }
      if (typeof node.letterSpacing === 'object') {
        info.letterSpacing = node.letterSpacing.value + (node.letterSpacing.unit === 'PERCENT' ? '%' : 'px');
      }
      if (typeof node.paragraphSpacing === 'number' && node.paragraphSpacing > 0) {
        info.paragraphSpacing = node.paragraphSpacing;
      }
    } catch (_) {}
  }

  if (node.type === 'COMPONENT_SET') info.isComponentSet = true;
  if (node.type === 'COMPONENT') {
    info.isComponent = true;
    try {
      if (node.variantProperties && Object.keys(node.variantProperties).length > 0) info.variantProperties = node.variantProperties;
      if (node.parent && node.parent.type === 'COMPONENT_SET') {
        info.variants = node.parent.children.map(s => ({ name: s.name, variantProperties: s.variantProperties }));
      }
      if (node.description) info.description = node.description;
    } catch (_) {}
  }
  if (node.type === 'INSTANCE') {
    try {
      info.mainComponentName = node.mainComponent ? node.mainComponent.name : null;
      if (node.mainComponent?.description) info.componentDescription = node.mainComponent.description;
      if (node.variantProperties && Object.keys(node.variantProperties).length > 0) info.variantProperties = node.variantProperties;
      // Exposed component properties (text, boolean, instance-swap)
      if (node.componentProperties && Object.keys(node.componentProperties).length > 0) {
        info.componentProperties = Object.fromEntries(
          Object.entries(node.componentProperties).map(([k, v]) => [k, { type: v.type, value: v.value }])
        );
      }
    } catch (_) {}
  }

  // Interactions (simplified — just record what triggers exist)
  try {
    if ('reactions' in node && Array.isArray(node.reactions) && node.reactions.length > 0) {
      info.interactions = node.reactions.map(r => r.trigger?.type).filter(Boolean);
    }
  } catch (_) {}

  if (depth < maxDepth && 'children' in node && Array.isArray(node.children) && node.children.length > 0) {
    const total = node.children.length;
    const slice = node.children.slice(0, MAX_CHILDREN);
    info.children = slice.map(c => extractNodeFull(c, depth + 1, maxDepth));
    if (total > MAX_CHILDREN) info.childrenTruncated = `${total - MAX_CHILDREN} more children not shown`;
  }

  return info;
}
