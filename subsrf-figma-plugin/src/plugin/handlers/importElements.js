import { createSolidFill } from '../utils/color.js';
import { loadFont, parseFontFamily } from '../utils/font.js';
import { parseAllShadows, parseLinearGradient } from '../utils/gradient.js';

const BLEND_MAP = {
  'multiply': 'MULTIPLY', 'screen': 'SCREEN', 'overlay': 'OVERLAY',
  'darken': 'DARKEN', 'lighten': 'LIGHTEN', 'color-dodge': 'COLOR_DODGE',
  'color-burn': 'COLOR_BURN', 'hard-light': 'HARD_LIGHT', 'soft-light': 'SOFT_LIGHT',
  'difference': 'DIFFERENCE', 'exclusion': 'EXCLUSION', 'hue': 'HUE',
  'saturation': 'SATURATION', 'color': 'COLOR', 'luminosity': 'LUMINOSITY',
};

const SLACK = 4; // px tolerance for fractional rects

export async function handleImportElements(msg) {
  const elements = msg.elements || (msg.data && msg.data.elements) || [];
  const tier = msg.tier || 'free';
  const isPaidTier = tier === 'starter' || tier === 'pro';

  if (!elements.length) { figma.notify('No elements found to sync'); return; }

  elements.forEach(el => { if (!el.rect) el.rect = { left: 0, top: 0, width: 100, height: 40 }; });

  // Bounding box
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  elements.forEach(({ rect: r }) => {
    if (r.left              < minX) minX = r.left;
    if (r.top               < minY) minY = r.top;
    if (r.left + r.width  > maxX) maxX = r.left + r.width;
    if (r.top  + r.height > maxY) maxY = r.top  + r.height;
  });

  // Sort largest → smallest so parents come before children
  const sorted = elements.slice().sort((a, b) =>
    (b.rect.width * b.rect.height) - (a.rect.width * a.rect.height)
  );

  // Build containment tree
  const parentIdx = new Array(sorted.length).fill(-1);
  for (let i = 0; i < sorted.length; i++) {
    const ri = sorted[i].rect;
    const riArea = ri.width * ri.height;
    let bestArea = Infinity;
    for (let j = 0; j < sorted.length; j++) {
      if (j === i) continue;
      const rj = sorted[j].rect;
      const rjArea = rj.width * rj.height;
      if (rjArea <= riArea) continue;
      if (rj.left - SLACK <= ri.left && rj.top - SLACK <= ri.top &&
          rj.left + rj.width  + SLACK >= ri.left + ri.width  &&
          rj.top  + rj.height + SLACK >= ri.top  + ri.height &&
          rjArea < bestArea) {
        bestArea = rjArea;
        parentIdx[i] = j;
      }
    }
  }

  const hasChild = new Array(sorted.length).fill(false);
  for (let i = 0; i < sorted.length; i++) {
    if (parentIdx[i] !== -1) hasChild[parentIdx[i]] = true;
  }

  await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
  await figma.loadFontAsync({ family: 'Inter', style: 'Medium' });
  await figma.loadFontAsync({ family: 'Inter', style: 'Semi Bold' });
  await figma.loadFontAsync({ family: 'Inter', style: 'Bold' });

  const canvasOffsetX = figma.viewport.center.x - (maxX - minX) / 2;
  const canvasOffsetY = figma.viewport.center.y - (maxY - minY) / 2;

  const frames = new Array(sorted.length).fill(null);
  const autoLayoutInfo = {}; // index → 'HORIZONTAL' | 'VERTICAL'

  for (let j = 0; j < sorted.length; j++) {
    try {
      const elObj = sorted[j];
      const styles = elObj.styles || {};
      const rect = elObj.rect;

      const container = figma.createFrame();
      const safeCls = elObj.cls ? ' .' + elObj.cls.trim().split(/\s+/).slice(0, 2).join('.') : '';
      container.name = (elObj.tagName || 'DIV') + safeCls;
      container.resize(Math.max(1, rect.width), Math.max(1, rect.height));
      container.clipsContent = false;

      // Background
      if (isPaidTier && styles.backgroundImage && styles.backgroundImage !== 'none') {
        const gradFill = parseLinearGradient(styles.backgroundImage);
        if (gradFill) {
          container.fills = [gradFill];
        } else if (styles.backgroundColor && styles.backgroundColor !== 'transparent' && styles.backgroundColor !== 'rgba(0, 0, 0, 0)') {
          container.fills = [createSolidFill(styles.backgroundColor)];
        } else {
          container.fills = [];
        }
      } else if (styles.backgroundColor && styles.backgroundColor !== 'transparent' && styles.backgroundColor !== 'rgba(0, 0, 0, 0)') {
        container.fills = [createSolidFill(styles.backgroundColor)];
      } else {
        container.fills = [];
      }

      const op = parseFloat(styles.opacity);
      if (!isNaN(op) && op !== 1) container.opacity = op;

      // Border radius
      const bTL = parseInt(styles.borderTopLeftRadius)     || parseInt(styles.borderRadius) || 0;
      const bTR = parseInt(styles.borderTopRightRadius)    || parseInt(styles.borderRadius) || 0;
      const bBR = parseInt(styles.borderBottomRightRadius) || parseInt(styles.borderRadius) || 0;
      const bBL = parseInt(styles.borderBottomLeftRadius)  || parseInt(styles.borderRadius) || 0;
      if (bTL || bTR || bBR || bBL) {
        if (bTL === bTR && bTR === bBR && bBR === bBL) container.cornerRadius = bTL;
        else { container.topLeftRadius = bTL; container.topRightRadius = bTR; container.bottomRightRadius = bBR; container.bottomLeftRadius = bBL; }
      }

      // Effects
      const effects = [];
      if (styles.boxShadow && styles.boxShadow !== 'none') {
        effects.push(...parseAllShadows(styles.boxShadow));
      }
      if (styles.backdropFilter && styles.backdropFilter !== 'none') {
        const m = styles.backdropFilter.match(/blur\((\d+(?:\.\d+)?)/);
        if (m) effects.push({ type: 'BACKGROUND_BLUR', radius: parseFloat(m[1]), visible: true });
      }
      if (styles.filter && styles.filter !== 'none') {
        const m = styles.filter.match(/blur\((\d+(?:\.\d+)?)/);
        if (m) effects.push({ type: 'LAYER_BLUR', radius: parseFloat(m[1]), visible: true });
      }
      if (effects.length > 0) container.effects = effects;

      if (styles.mixBlendMode && BLEND_MAP[styles.mixBlendMode]) {
        container.blendMode = BLEND_MAP[styles.mixBlendMode];
      }

      // Border
      const bwTop = parseInt(styles.borderTopWidth) || 0;
      const bwRight = parseInt(styles.borderRightWidth) || 0;
      const bwBottom = parseInt(styles.borderBottomWidth) || 0;
      const bwLeft = parseInt(styles.borderLeftWidth) || 0;
      const bStyle = styles.borderTopStyle || styles.borderLeftStyle || 'none';
      if ((bwTop || bwRight || bwBottom || bwLeft) && bStyle !== 'none') {
        const bColor = styles.borderTopColor || styles.borderLeftColor || '#000000';
        const uniformBw = (bwTop === bwRight && bwRight === bwBottom && bwBottom === bwLeft)
          ? bwTop : Math.max(bwTop, bwRight, bwBottom, bwLeft);
        container.strokeWeight = uniformBw;
        container.strokes = [createSolidFill(bColor)];
        container.strokeAlign = 'INSIDE';
      }

      // Auto Layout
      if (isPaidTier && styles.display === 'flex') {
        const isRow = !(styles.flexDirection || 'row').startsWith('column');
        container.layoutMode = isRow ? 'HORIZONTAL' : 'VERTICAL';
        container.layoutWrap = (styles.flexWrap === 'wrap' || styles.flexWrap === 'wrap-reverse') ? 'WRAP' : 'NO_WRAP';
        container.primaryAxisSizingMode = 'FIXED';
        container.counterAxisSizingMode = 'FIXED';
        const gap = parseFloat(styles.gap) || 0;
        if (gap > 0) container.itemSpacing = gap;
        container.paddingTop    = parseInt(styles.paddingTop)    || 0;
        container.paddingRight  = parseInt(styles.paddingRight)  || 0;
        container.paddingBottom = parseInt(styles.paddingBottom) || 0;
        container.paddingLeft   = parseInt(styles.paddingLeft)   || 0;
        const jc = styles.justifyContent || 'flex-start';
        container.primaryAxisAlignItems = jc === 'center' ? 'CENTER' : (jc === 'flex-end' || jc === 'end') ? 'MAX' : jc === 'space-between' ? 'SPACE_BETWEEN' : 'MIN';
        const ai = styles.alignItems || 'stretch';
        container.counterAxisAlignItems = ai === 'center' ? 'CENTER' : (ai === 'flex-end' || ai === 'end') ? 'MAX' : 'MIN';
        autoLayoutInfo[j] = isRow ? 'HORIZONTAL' : 'VERTICAL';
      }

      // Image
      if (elObj.tagName?.toLowerCase() === 'img' && elObj.attributes?.src) {
        try {
          const image = await figma.createImageAsync(elObj.attributes.src);
          const scaleMode = styles.objectFit === 'contain' ? 'FIT' : styles.objectFit === 'none' ? 'CROP' : 'FILL';
          container.fills = [{ type: 'IMAGE', imageHash: image.hash, scaleMode }];
        } catch (_) {}
      }

      // Text
      const elText = (elObj.text || '').trim();
      let isTextLeaf = !hasChild[j] && elText.length > 0;
      if (isTextLeaf) {
        const jArea = rect.width * rect.height;
        for (let k = 0; k < sorted.length; k++) {
          if (k === j) continue;
          const kText = (sorted[k].text || '').trim();
          const kArea = sorted[k].rect.width * sorted[k].rect.height;
          const kRect = sorted[k].rect;
          const isInside =
            kRect.left >= rect.left - SLACK && kRect.top >= rect.top - SLACK &&
            kRect.left + kRect.width  <= rect.left + rect.width  + SLACK &&
            kRect.top  + kRect.height <= rect.top  + rect.height + SLACK;
          if (kText.length > 4 && kArea < jArea && elText.includes(kText) && isInside) {
            isTextLeaf = false; break;
          }
        }
      }

      if (isTextLeaf) {
        const fontName = await loadFont(parseFontFamily(styles.fontFamily), styles.fontWeight || '400');
        const textNode = figma.createText();
        textNode.fontName = fontName;
        textNode.characters = elText;
        textNode.fontSize = Math.max(8, parseInt(styles.fontSize) || 14);
        if (styles.color) textNode.fills = [createSolidFill(styles.color)];
        if (styles.lineHeight && styles.lineHeight !== 'normal') {
          const lh = parseFloat(styles.lineHeight);
          if (!isNaN(lh) && lh > 0) textNode.lineHeight = { value: lh, unit: 'PIXELS' };
        }
        if (styles.letterSpacing && styles.letterSpacing !== 'normal') {
          const ls = parseFloat(styles.letterSpacing);
          if (!isNaN(ls)) textNode.letterSpacing = { value: ls, unit: 'PIXELS' };
        }
        if (styles.textAlign === 'center')      textNode.textAlignHorizontal = 'CENTER';
        else if (styles.textAlign === 'right')  textNode.textAlignHorizontal = 'RIGHT';
        else                                    textNode.textAlignHorizontal = 'LEFT';
        if (styles.textDecoration && styles.textDecoration !== 'none') {
          if (styles.textDecoration.includes('underline'))    textNode.textDecoration = 'UNDERLINE';
          else if (styles.textDecoration.includes('line-through')) textNode.textDecoration = 'STRIKETHROUGH';
        }
        if (styles.textTransform === 'uppercase') textNode.characters = textNode.characters.toUpperCase();
        else if (styles.textTransform === 'lowercase') textNode.characters = textNode.characters.toLowerCase();
        textNode.textAutoResize = 'HEIGHT';
        const pL = parseInt(styles.paddingLeft) || 0, pT = parseInt(styles.paddingTop) || 0;
        const pR = parseInt(styles.paddingRight) || 0;
        try { textNode.resize(Math.max(20, rect.width - pL - pR), textNode.height); } catch (_) {}
        textNode.x = pL;
        textNode.y = pT;
        container.appendChild(textNode);
      }

      frames[j] = container;
    } catch (err) {
      console.warn('Frame creation error:', err);
    }
  }

  // Build child lists
  const childrenOf = sorted.map(() => []);
  const rootList = [];
  for (let j = 0; j < sorted.length; j++) {
    if (parentIdx[j] === -1) rootList.push(j);
    else childrenOf[parentIdx[j]].push(j);
  }

  rootList.sort((a, b) => {
    const za = parseInt((sorted[a].styles || {}).zIndex) || 0;
    const zb = parseInt((sorted[b].styles || {}).zIndex) || 0;
    if (za !== zb) return za - zb;
    const ra = sorted[a].rect, rb = sorted[b].rect;
    return ra.top !== rb.top ? ra.top - rb.top : ra.left - rb.left;
  });

  function buildHierarchy(parentFrame, childList, parentJIdx) {
    const alDir = parentJIdx !== -1 ? autoLayoutInfo[parentJIdx] : null;
    const ordered = childList.slice();
    if (alDir === 'HORIZONTAL') ordered.sort((a, b) => sorted[a].rect.left - sorted[b].rect.left);
    else if (alDir === 'VERTICAL') ordered.sort((a, b) => sorted[a].rect.top - sorted[b].rect.top);
    else ordered.sort((a, b) => (parseInt((sorted[a].styles || {}).zIndex) || 0) - (parseInt((sorted[b].styles || {}).zIndex) || 0));

    for (const c of ordered) {
      if (!frames[c]) continue;
      parentFrame.appendChild(frames[c]);
      if (!alDir) {
        const cRect = sorted[c].rect;
        const origin = parentJIdx === -1 ? { left: minX, top: minY } : sorted[parentJIdx].rect;
        frames[c].x = cRect.left - origin.left;
        frames[c].y = cRect.top  - origin.top;
      }
      buildHierarchy(frames[c], childrenOf[c], c);
    }
  }

  buildHierarchy(figma.currentPage, rootList, -1);

  for (const ri of rootList) {
    if (!frames[ri]) continue;
    frames[ri].x = canvasOffsetX + (sorted[ri].rect.left - minX);
    frames[ri].y = canvasOffsetY + (sorted[ri].rect.top  - minY);
  }

  const allRootFrames = rootList.map(r => frames[r]).filter(Boolean);
  figma.viewport.scrollAndZoomIntoView(allRootFrames);
  figma.notify(`Sync complete — ${sorted.length} elements, nested by hierarchy.`);
}
