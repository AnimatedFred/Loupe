// Subsrf to Figma Bridge v2.0
figma.showUI(__html__, { width: 360, height: 720, themeColors: true });

figma.ui.onmessage = async (msg) => {

  // ── Plugin storage (persist auth session across plugin restarts) ──────────
  if (msg.type === 'GET_STORAGE') {
    try {
      var value = await figma.clientStorage.getAsync(msg.key);
      figma.ui.postMessage({ type: 'STORAGE_VALUE', key: msg.key, value: value });
    } catch (err) {
      figma.ui.postMessage({ type: 'STORAGE_VALUE', key: msg.key, value: null, error: err.message });
    }
    return;
  }

  if (msg.type === 'SET_STORAGE') {
    try { await figma.clientStorage.setAsync(msg.key, msg.value); } catch (err) {}
    return;
  }

  if (msg.type === 'DEL_STORAGE') {
    try { await figma.clientStorage.deleteAsync(msg.key); } catch (err) {}
    return;
  }

  if (msg.type === 'RESIZE') {
    figma.ui.resize(msg.width, msg.height);
    return;
  }

  // ── Query: run code and return result to the UI for posting back to Railway ──
  if (msg.type === 'FIGMA_QUERY') {
    try {
      const fn = new Function('figma', 'return (async () => { ' + msg.code + ' })()');
      const result = await fn(figma);
      figma.ui.postMessage({ type: 'QUERY_RESULT', queryId: msg.queryId, result });
    } catch (err) {
      figma.ui.postMessage({ type: 'QUERY_RESULT', queryId: msg.queryId, error: err.message });
    }
    return;
  }

  // ── EVAL: run arbitrary write code in the Figma sandbox ───────────────────
  if (msg.type === 'EVAL') {
    try {
      const code = (msg.data && msg.data.code) || msg.code;
      const fn = new Function('figma', 'return (async () => { ' + code + ' })()');
      await fn(figma);
      figma.notify('AI Design Sync Complete');
    } catch (err) {
      figma.notify('AI Error: ' + err.message);
    }
    return;
  }

  // ── Named write operations ─────────────────────────────────────────────────
  if (msg.type === 'CREATE_FRAME') {
    const f = figma.createFrame();
    f.name = msg.name || 'Frame';
    f.x = msg.x !== undefined ? msg.x : figma.viewport.center.x;
    f.y = msg.y !== undefined ? msg.y : figma.viewport.center.y;
    if (msg.width && msg.height) f.resize(msg.width, msg.height);
    figma.currentPage.appendChild(f);
    figma.viewport.scrollAndZoomIntoView([f]);
    figma.notify(`Created frame "${f.name}"`);
    return;
  }

  if (msg.type === 'SET_TEXT') {
    const node = msg.nodeId ? figma.getNodeById(msg.nodeId) : figma.currentPage.selection[0];
    if (!node || node.type !== 'TEXT') { figma.notify('No text node found'); return; }
    await figma.loadFontAsync(node.fontName);
    node.characters = msg.text || '';
    figma.notify('Text updated');
    return;
  }

  if (msg.type === 'SET_FILL') {
    const node = msg.nodeId ? figma.getNodeById(msg.nodeId) : figma.currentPage.selection[0];
    if (!node || !('fills' in node)) { figma.notify('No fillable node found'); return; }
    const rgb = cssColorToRgb(msg.color || '#000000');
    node.fills = [{ type: 'SOLID', color: rgb }];
    figma.notify('Fill updated');
    return;
  }

  if (msg.type === 'MOVE') {
    const node = msg.nodeId ? figma.getNodeById(msg.nodeId) : figma.currentPage.selection[0];
    if (!node) { figma.notify('No node found'); return; }
    if (msg.x !== undefined) node.x = msg.x;
    if (msg.y !== undefined) node.y = msg.y;
    if (msg.width && msg.height) node.resize(msg.width, msg.height);
    return;
  }

  if (msg.type === 'DELETE') {
    const node = msg.nodeId ? figma.getNodeById(msg.nodeId) : figma.currentPage.selection[0];
    if (!node) { figma.notify('No node found'); return; }
    node.remove();
    figma.notify('Node deleted');
    return;
  }

  if (msg.type === 'CLONE') {
    const node = msg.nodeId ? figma.getNodeById(msg.nodeId) : figma.currentPage.selection[0];
    if (!node) { figma.notify('No node found'); return; }
    const clone = node.clone();
    if (msg.x !== undefined) clone.x = msg.x;
    if (msg.y !== undefined) clone.y = msg.y;
    figma.viewport.scrollAndZoomIntoView([clone]);
    figma.notify('Node cloned');
    return;
  }

  if (msg.type === 'SWAP_COMPONENT') {
    const node = msg.nodeId ? figma.getNodeById(msg.nodeId) : figma.currentPage.selection[0];
    if (!node || node.type !== 'INSTANCE') { figma.notify('No component instance selected'); return; }
    const component = await figma.importComponentByKeyAsync(msg.componentKey);
    node.swapComponent(component);
    figma.notify('Component swapped');
    return;
  }

  if (msg.type === 'IMPORT_ELEMENTS') {
    var elements = msg.elements || (msg.data && msg.data.elements) || [];
    var context = msg.context || (msg.data && msg.data.context) || {};
    var tier = msg.tier || 'free';
    var isPaidTier = tier === 'starter' || tier === 'pro';

    if (!elements || elements.length === 0) {
      figma.notify('No elements found to sync');
      return;
    }

    // Ensure every element has a rect
    elements.forEach(function(el) {
      if (!el.rect) el.rect = { left: 0, top: 0, width: 100, height: 40 };
    });

    // ── Bounding box ────────────────────────────────────────────────────────
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    elements.forEach(function(el) {
      var r = el.rect;
      if (r.left < minX) minX = r.left;
      if (r.top  < minY) minY = r.top;
      if (r.left + r.width  > maxX) maxX = r.left + r.width;
      if (r.top  + r.height > maxY) maxY = r.top  + r.height;
    });

    // ── Sort largest → smallest so parents always come before children ──────
    var sorted = elements.slice().sort(function(a, b) {
      return (b.rect.width * b.rect.height) - (a.rect.width * a.rect.height);
    });

    // ── Build containment tree ───────────────────────────────────────────────
    // parentIdx[i] = index in sorted[] of the smallest element that fully
    // contains sorted[i], or -1 if it sits directly in the root frame.
    var SLACK = 4; // px tolerance for fractional rects
    var parentIdx = new Array(sorted.length).fill(-1);
    for (var i = 0; i < sorted.length; i++) {
      var ri = sorted[i].rect;
      var riArea = ri.width * ri.height;
      var bestArea = Infinity;
      for (var j = 0; j < sorted.length; j++) {
        if (j === i) continue;
        var rj = sorted[j].rect;
        var rjArea = rj.width * rj.height;
        if (rjArea <= riArea) continue; // parent must be strictly larger
        if (rj.left - SLACK <= ri.left &&
            rj.top  - SLACK <= ri.top  &&
            rj.left + rj.width  + SLACK >= ri.left + ri.width  &&
            rj.top  + rj.height + SLACK >= ri.top  + ri.height &&
            rjArea < bestArea) {
          bestArea = rjArea;
          parentIdx[i] = j;
        }
      }
    }

    // ── Mark containers (elements that have at least one captured child) ────
    var hasChild = new Array(sorted.length).fill(false);
    for (var i = 0; i < sorted.length; i++) {
      if (parentIdx[i] !== -1) hasChild[parentIdx[i]] = true;
    }

    // ── Fonts ────────────────────────────────────────────────────────────────
    await figma.loadFontAsync({ family: "Inter", style: "Regular" });
    await figma.loadFontAsync({ family: "Inter", style: "Medium" });
    await figma.loadFontAsync({ family: "Inter", style: "Semi Bold" });
    await figma.loadFontAsync({ family: "Inter", style: "Bold" });

    // ── Canvas origin — elements placed directly, no wrapper frame ─────────
    var canvasOffsetX = figma.viewport.center.x - (maxX - minX) / 2;
    var canvasOffsetY = figma.viewport.center.y - (maxY - minY) / 2;

    // ── Create element frames ────────────────────────────────────────────────
    var frames = new Array(sorted.length).fill(null);
    var autoLayoutInfo = {}; // index → 'HORIZONTAL' | 'VERTICAL'

    for (var j = 0; j < sorted.length; j++) {
      try {
        var elObj = sorted[j];
        var styles = elObj.styles || {};
        var rect = elObj.rect;

        var container = figma.createFrame();
        var safeCls = elObj.cls ? ' .' + elObj.cls.trim().split(/\s+/).slice(0, 2).join('.') : '';
        container.name = (elObj.tagName || 'DIV') + safeCls;
        container.resize(Math.max(1, rect.width), Math.max(1, rect.height));
        container.clipsContent = false;

        // Background — gradient takes precedence over solid color
        if (isPaidTier && styles.backgroundImage && styles.backgroundImage !== 'none') {
          var gradFill = parseLinearGradient(styles.backgroundImage);
          if (gradFill) {
            container.fills = [gradFill];
          } else if (styles.backgroundColor &&
              styles.backgroundColor !== 'transparent' &&
              styles.backgroundColor !== 'rgba(0, 0, 0, 0)') {
            container.fills = [createSolidFill(styles.backgroundColor)];
          } else {
            container.fills = [];
          }
        } else if (styles.backgroundColor &&
            styles.backgroundColor !== 'transparent' &&
            styles.backgroundColor !== 'rgba(0, 0, 0, 0)') {
          container.fills = [createSolidFill(styles.backgroundColor)];
        } else {
          container.fills = [];
        }

        // Opacity
        var op = parseFloat(styles.opacity);
        if (!isNaN(op) && op !== 1) container.opacity = op;

        // Border radius — per-corner when values differ
        var bTL = parseInt(styles.borderTopLeftRadius)     || parseInt(styles.borderRadius) || 0;
        var bTR = parseInt(styles.borderTopRightRadius)    || parseInt(styles.borderRadius) || 0;
        var bBR = parseInt(styles.borderBottomRightRadius) || parseInt(styles.borderRadius) || 0;
        var bBL = parseInt(styles.borderBottomLeftRadius)  || parseInt(styles.borderRadius) || 0;
        if (bTL || bTR || bBR || bBL) {
          if (bTL === bTR && bTR === bBR && bBR === bBL) {
            container.cornerRadius = bTL;
          } else {
            container.topLeftRadius     = bTL;
            container.topRightRadius    = bTR;
            container.bottomRightRadius = bBR;
            container.bottomLeftRadius  = bBL;
          }
        }

        // Effects: shadows + backdrop blur + layer blur
        var effects = [];
        if (styles.boxShadow && styles.boxShadow !== 'none') {
          var shadows = parseAllShadows(styles.boxShadow);
          effects = effects.concat(shadows);
        }
        if (styles.backdropFilter && styles.backdropFilter !== 'none') {
          var bfMatch = styles.backdropFilter.match(/blur\((\d+(?:\.\d+)?)/);
          if (bfMatch) effects.push({ type: 'BACKGROUND_BLUR', radius: parseFloat(bfMatch[1]), visible: true });
        }
        if (styles.filter && styles.filter !== 'none') {
          var fMatch = styles.filter.match(/blur\((\d+(?:\.\d+)?)/);
          if (fMatch) effects.push({ type: 'LAYER_BLUR', radius: parseFloat(fMatch[1]), visible: true });
        }
        if (effects.length > 0) container.effects = effects;

        // Blend mode
        var blendMap = {
          'multiply':'MULTIPLY','screen':'SCREEN','overlay':'OVERLAY','darken':'DARKEN',
          'lighten':'LIGHTEN','color-dodge':'COLOR_DODGE','color-burn':'COLOR_BURN',
          'hard-light':'HARD_LIGHT','soft-light':'SOFT_LIGHT','difference':'DIFFERENCE',
          'exclusion':'EXCLUSION','hue':'HUE','saturation':'SATURATION','color':'COLOR','luminosity':'LUMINOSITY'
        };
        if (styles.mixBlendMode && blendMap[styles.mixBlendMode]) {
          container.blendMode = blendMap[styles.mixBlendMode];
        }

        // Border — use per-side widths; fall back to uniform stroke if all sides match
        var bwTop    = parseInt(styles.borderTopWidth)    || 0;
        var bwRight  = parseInt(styles.borderRightWidth)  || 0;
        var bwBottom = parseInt(styles.borderBottomWidth) || 0;
        var bwLeft   = parseInt(styles.borderLeftWidth)   || 0;
        var bStyle = styles.borderTopStyle || styles.borderLeftStyle || 'none';
        if ((bwTop || bwRight || bwBottom || bwLeft) && bStyle !== 'none') {
          var bColor = styles.borderTopColor || styles.borderLeftColor || '#000000';
          var uniformBw = (bwTop === bwRight && bwRight === bwBottom && bwBottom === bwLeft) ? bwTop : Math.max(bwTop, bwRight, bwBottom, bwLeft);
          container.strokeWeight = uniformBw;
          container.strokes = [createSolidFill(bColor)];
          container.strokeAlign = 'INSIDE';
        }

        // Auto Layout — map flex containers (Starter + Pro)
        if (isPaidTier && styles.display === 'flex') {
          var flexDir = styles.flexDirection || 'row';
          var isRow = !flexDir.startsWith('column');
          container.layoutMode = isRow ? 'HORIZONTAL' : 'VERTICAL';
          container.layoutWrap = (styles.flexWrap === 'wrap' || styles.flexWrap === 'wrap-reverse') ? 'WRAP' : 'NO_WRAP';
          container.primaryAxisSizingMode = 'FIXED';
          container.counterAxisSizingMode = 'FIXED';

          var gapPx = parseFloat(styles.gap) || 0;
          if (gapPx > 0) container.itemSpacing = gapPx;

          container.paddingTop    = parseInt(styles.paddingTop)    || 0;
          container.paddingRight  = parseInt(styles.paddingRight)  || 0;
          container.paddingBottom = parseInt(styles.paddingBottom) || 0;
          container.paddingLeft   = parseInt(styles.paddingLeft)   || 0;

          var jc = styles.justifyContent || 'flex-start';
          container.primaryAxisAlignItems =
            jc === 'center' ? 'CENTER' :
            (jc === 'flex-end' || jc === 'end') ? 'MAX' :
            jc === 'space-between' ? 'SPACE_BETWEEN' : 'MIN';

          var ai = styles.alignItems || 'stretch';
          container.counterAxisAlignItems =
            ai === 'center' ? 'CENTER' :
            (ai === 'flex-end' || ai === 'end') ? 'MAX' : 'MIN';

          autoLayoutInfo[j] = isRow ? 'HORIZONTAL' : 'VERTICAL';
        }

        // Image
        if (elObj.tagName && elObj.tagName.toLowerCase() === 'img' &&
            elObj.attributes && elObj.attributes.src) {
          try {
            var image = await figma.createImageAsync(elObj.attributes.src);
            var scaleMode = styles.objectFit === 'contain' ? 'FIT' : styles.objectFit === 'none' ? 'CROP' : 'FILL';
            container.fills = [{ type: 'IMAGE', imageHash: image.hash, scaleMode: scaleMode }];
          } catch (e) { /* image load failed, leave empty */ }
        }

        // Text — only on true leaf elements to prevent duplication.
        // A "leaf" passes two checks:
        //   1. No geometric children detected via bounding box (hasChild)
        //   2. No smaller sibling/cousin element has text that is a substring
        //      of this element's text (catches containment the bbox missed)
        var elText = elObj.text ? elObj.text.trim() : '';
        var isTextLeaf = !hasChild[j] && elText.length > 0;

        if (isTextLeaf) {
          var jArea = rect.width * rect.height;
          for (var k = 0; k < sorted.length; k++) {
            if (k === j) continue;
            var kText = (sorted[k].text || '').trim();
            var kArea = sorted[k].rect.width * sorted[k].rect.height;
            var kRect = sorted[k].rect;
            // Only suppress text if the smaller element is geometrically inside this
            // element's bounds — prevents unrelated page elements from triggering false
            // suppression via accidental substring matches.
            var isInsideBounds =
              kRect.left   >= rect.left   - SLACK &&
              kRect.top    >= rect.top    - SLACK &&
              kRect.left + kRect.width  <= rect.left + rect.width  + SLACK &&
              kRect.top  + kRect.height <= rect.top  + rect.height + SLACK;
            if (kText.length > 4 && kArea < jArea && elText.includes(kText) && isInsideBounds) {
              isTextLeaf = false;
              break;
            }
          }
        }

        if (isTextLeaf) {
          var fontFamily = parseFontFamily(styles.fontFamily);
          var fontName = await loadFont(fontFamily, styles.fontWeight || '400');

          var textNode = figma.createText();
          textNode.fontName = fontName;
          textNode.characters = elText;
          textNode.fontSize = Math.max(8, parseInt(styles.fontSize) || 14);

          if (styles.color) textNode.fills = [createSolidFill(styles.color)];

          if (styles.lineHeight && styles.lineHeight !== 'normal') {
            var lh = parseFloat(styles.lineHeight);
            if (!isNaN(lh) && lh > 0) textNode.lineHeight = { value: lh, unit: 'PIXELS' };
          }

          if (styles.letterSpacing && styles.letterSpacing !== 'normal') {
            var ls = parseFloat(styles.letterSpacing);
            if (!isNaN(ls)) textNode.letterSpacing = { value: ls, unit: 'PIXELS' };
          }

          if (styles.textAlign === 'center') textNode.textAlignHorizontal = 'CENTER';
          else if (styles.textAlign === 'right') textNode.textAlignHorizontal = 'RIGHT';
          else textNode.textAlignHorizontal = 'LEFT';

          if (styles.textDecoration && styles.textDecoration !== 'none') {
            if (styles.textDecoration.includes('underline')) textNode.textDecoration = 'UNDERLINE';
            else if (styles.textDecoration.includes('line-through')) textNode.textDecoration = 'STRIKETHROUGH';
          }
          if (styles.textTransform === 'uppercase') textNode.characters = textNode.characters.toUpperCase();
          else if (styles.textTransform === 'lowercase') textNode.characters = textNode.characters.toLowerCase();

          textNode.textAutoResize = 'HEIGHT';
          var pL = parseInt(styles.paddingLeft) || 0;
          var pT = parseInt(styles.paddingTop) || 0;
          var pR = parseInt(styles.paddingRight) || 0;
          var textW = Math.max(20, rect.width - pL - pR);
          try { textNode.resize(textW, textNode.height); } catch (e) {}
          textNode.x = pL;
          textNode.y = pT;
          container.appendChild(textNode);
        }

        frames[j] = container;
      } catch (err) {
        console.warn('Frame creation error:', err);
      }
    }

    // ── Build ordered child lists ────────────────────────────────────────────
    var childrenOf = sorted.map(function() { return []; });
    var rootList = [];
    for (var j = 0; j < sorted.length; j++) {
      if (parentIdx[j] === -1) rootList.push(j);
      else childrenOf[parentIdx[j]].push(j);
    }

    // Sort root elements by z-index (lower first = rendered below), then by position
    rootList.sort(function(a, b) {
      var za = parseInt((sorted[a].styles || {}).zIndex) || 0;
      var zb = parseInt((sorted[b].styles || {}).zIndex) || 0;
      if (za !== zb) return za - zb;
      var ra = sorted[a].rect, rb = sorted[b].rect;
      return ra.top !== rb.top ? ra.top - rb.top : ra.left - rb.left;
    });

    // ── Recursively append children ──────────────────────────────────────────
    // Auto-layout parents: children are ordered by visual position, x/y skipped.
    // Absolute parents: children are positioned relative to parent's top-left.
    function buildHierarchy(parentFrame, childList, parentJIdx) {
      var alDir = parentJIdx !== -1 ? autoLayoutInfo[parentJIdx] : null;

      var orderedChildren = childList.slice();
      if (alDir === 'HORIZONTAL') {
        orderedChildren.sort(function(a, b) { return sorted[a].rect.left - sorted[b].rect.left; });
      } else if (alDir === 'VERTICAL') {
        orderedChildren.sort(function(a, b) { return sorted[a].rect.top - sorted[b].rect.top; });
      } else {
        // Absolute: sort by z-index so higher z-index elements are appended last (on top in Figma)
        orderedChildren.sort(function(a, b) {
          var za = parseInt((sorted[a].styles || {}).zIndex) || 0;
          var zb = parseInt((sorted[b].styles || {}).zIndex) || 0;
          return za - zb;
        });
      }

      for (var k = 0; k < orderedChildren.length; k++) {
        var c = orderedChildren[k];
        if (!frames[c]) continue;

        parentFrame.appendChild(frames[c]);

        if (!alDir) {
          // Absolute positioning relative to parent's top-left corner
          var cRect = sorted[c].rect;
          var origin = parentJIdx === -1
            ? { left: minX, top: minY }
            : sorted[parentJIdx].rect;
          frames[c].x = cRect.left - origin.left;
          frames[c].y = cRect.top  - origin.top;
        }

        buildHierarchy(frames[c], childrenOf[c], c);
      }
    }

    buildHierarchy(figma.currentPage, rootList, -1);

    // Position root-level elements on the canvas using the computed offset
    for (var ri = 0; ri < rootList.length; ri++) {
      var rc = rootList[ri];
      if (!frames[rc]) continue;
      var rcRect = sorted[rc].rect;
      frames[rc].x = canvasOffsetX + (rcRect.left - minX);
      frames[rc].y = canvasOffsetY + (rcRect.top  - minY);
    }

    var allRootFrames = rootList.map(function(r) { return frames[r]; }).filter(Boolean);
    figma.viewport.scrollAndZoomIntoView(allRootFrames);
    figma.notify('Sync complete — ' + sorted.length + ' elements, nested by hierarchy.');
  }

  // ── Compose: read current Figma selection and return structured node data ──
  if (msg.type === 'READ_SELECTION') {
    var sel = figma.currentPage.selection;
    if (sel.length === 0) {
      figma.ui.postMessage({ type: 'SELECTION_DATA', nodes: [], empty: true });
      return;
    }

    // Unwrap transparent container nodes (e.g. "Html → Body", root frames with no fills/strokes).
    // When a single invisible wrapper is selected, use its children as the root nodes so the AI
    // sees the actual UI sections rather than a featureless container.
    function isTransparentWrapper(node) {
      if (!('children' in node) || !Array.isArray(node.children) || node.children.length === 0) return false;
      var hasVisualFill = 'fills' in node && Array.isArray(node.fills) &&
        node.fills.some(function(f) { return f.visible !== false && f.type !== 'IMAGE'; });
      var hasStroke = 'strokes' in node && Array.isArray(node.strokes) &&
        node.strokes.some(function(s) { return s.visible !== false; });
      var hasEffect = 'effects' in node && Array.isArray(node.effects) &&
        node.effects.some(function(e) { return e.visible !== false; });
      return !hasVisualFill && !hasStroke && !hasEffect;
    }

    var rootNodes = sel;
    if (sel.length === 1 && isTransparentWrapper(sel[0])) {
      rootNodes = sel[0].children;
    }

    // Adapt depth: full pages (many sections) get depth 4 to keep payload manageable;
    // focused selections (1–3 nodes) get depth 6 for full detail.
    var depth = rootNodes.length > 4 ? 4 : 6;
    var nodes = rootNodes.slice(0, 20).map(function(n) { return extractNodeFull(n, 0, depth); });
    figma.ui.postMessage({ type: 'SELECTION_DATA', nodes: nodes });
    return;
  }
};

function parseAllShadows(cssShadow) {
  // Split comma-separated shadows, respecting rgba() parentheses
  var result = [];
  var depth = 0, start = 0;
  for (var i = 0; i <= cssShadow.length; i++) {
    var ch = cssShadow[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if ((ch === ',' || i === cssShadow.length) && depth === 0) {
      var part = cssShadow.slice(start, i).trim();
      if (part) {
        var s = parseShadow(part);
        if (s) result.push(s);
      }
      start = i + 1;
    }
  }
  return result;
}

function parseShadow(cssShadow) {
  // Extract color token first so the numbers-only pass is clean
  var colorMatch = cssShadow.match(/rgba?\([^)]+\)|#[a-fA-F0-9]{3,8}/);
  if (!colorMatch) return null;

  var withoutColor = cssShadow.replace(colorMatch[0], '');
  var nums = withoutColor.match(/-?\d+(\.\d+)?/g);
  if (!nums || nums.length < 2) return null;

  var x      = parseFloat(nums[0]) || 0;
  var y      = parseFloat(nums[1]) || 0;
  var blur   = parseFloat(nums[2]) || 0;
  var spread = parseFloat(nums[3]) || 0;

  // Skip spread-only "ring" shadows (Tailwind ring, focus outlines).
  // x=0 y=0 blur=0 spread>0 means a flat halo — no Figma equivalent,
  // usually a focus/hover UI state we don't want baked in.
  if (x === 0 && y === 0 && blur === 0) return null;

  var color = parseRgb(colorMatch[0]);
  return {
    type: 'DROP_SHADOW',
    color: { r: color.r / 255, g: color.g / 255, b: color.b / 255, a: color.a !== undefined ? color.a : 1 },
    offset: { x: x, y: y },
    radius: blur,
    spread: spread,
    visible: true,
    blendMode: 'NORMAL'
  };
}

function createSolidFill(cssColor) {
  var rgb = parseRgb(cssColor);
  return {
    type: 'SOLID',
    color: { r: rgb.r / 255, g: rgb.g / 255, b: rgb.b / 255 },
    opacity: rgb.a !== undefined ? rgb.a : 1
  };
}

async function loadFont(family, weight) {
  var style = mapWeight(weight);
  var fontName = { family: family, style: style };

  try {
    await figma.loadFontAsync(fontName);
    return fontName;
  } catch (e) {
    // Fallback to Inter
    var fallback = { family: "Inter", style: style };
    try {
      await figma.loadFontAsync(fallback);
      return fallback;
    } catch (e2) {
      await figma.loadFontAsync({ family: "Inter", style: "Regular" });
      return { family: "Inter", style: "Regular" };
    }
  }
}

function mapWeight(weight) {
  var w = parseInt(weight);
  if (w >= 900) return 'Black';
  if (w >= 800) return 'Extra Bold';
  if (w >= 700) return 'Bold';
  if (w >= 600) return 'Semi Bold';
  if (w >= 500) return 'Medium';
  return 'Regular';
}

function parseFontFamily(cssFamily) {
  if (!cssFamily) return "Inter";
  var families = cssFamily.split(',');
  var first = families[0].replace(/['"]/g, '').trim();
  return first || "Inter";
}


function cssColorToRgb(color) {
  const { r, g, b } = parseRgb(color);
  return { r: r / 255, g: g / 255, b: b / 255 };
}

function parseRgb(color) {
  if (typeof color !== 'string') return { r: 0, g: 0, b: 0 };
  var c = color.trim().toLowerCase();
  var named = { white:{r:255,g:255,b:255}, black:{r:0,g:0,b:0}, red:{r:255,g:0,b:0},
    blue:{r:0,g:0,b:255}, green:{r:0,g:128,b:0}, yellow:{r:255,g:255,b:0},
    transparent:{r:0,g:0,b:0,a:0}, gray:{r:128,g:128,b:128}, grey:{r:128,g:128,b:128} };
  if (named[c]) return named[c];
  if (color.startsWith('rgb')) {
    var values = color.match(/\d+(\.\d+)?/g).map(Number);
    return { r: values[0] || 0, g: values[1] || 0, b: values[2] || 0, a: values[3] };
  }
  if (color.startsWith('#')) {
    var hex = color.replace('#', '');
    if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
    return {
      r: parseInt(hex.substring(0, 2), 16) || 0,
      g: parseInt(hex.substring(2, 4), 16) || 0,
      b: parseInt(hex.substring(4, 6), 16) || 0
    };
  }
  return { r: 0, g: 0, b: 0 };
}

// ── Gradient fill (linear-gradient → GRADIENT_LINEAR) ─────────────────────

function parseLinearGradient(bgImage) {
  var content = extractGradientContent(bgImage);
  if (!content) return null;

  var parts = splitTopLevel(content);
  if (parts.length < 2) return null;

  var angle = 180; // default: to bottom
  var firstPart = parts[0].trim();

  if (/^to\s+/i.test(firstPart)) {
    angle = keywordToAngle(firstPart);
    parts = parts.slice(1);
  } else if (/^-?\d+(\.\d+)?deg/i.test(firstPart)) {
    angle = parseFloat(firstPart);
    parts = parts.slice(1);
  } else if (/^-?\d+(\.\d+)?turn/i.test(firstPart)) {
    angle = parseFloat(firstPart) * 360;
    parts = parts.slice(1);
  } else if (/^-?\d+(\.\d+)?rad/i.test(firstPart)) {
    angle = parseFloat(firstPart) * (180 / Math.PI);
    parts = parts.slice(1);
  }

  var stops = [];
  for (var i = 0; i < parts.length; i++) {
    var stop = parseColorStop(parts[i].trim());
    if (stop) stops.push(stop);
  }
  if (stops.length < 2) return null;

  // Fill in missing positions
  for (var i = 0; i < stops.length; i++) {
    if (stops[i].position === null) {
      if (i === 0) stops[i].position = 0;
      else if (i === stops.length - 1) stops[i].position = 1;
      else stops[i].position = i / (stops.length - 1);
    }
  }

  // gradientTransform from angle — see formula derivation in comments
  var theta = angle * Math.PI / 180;
  var sinT = Math.sin(theta);
  var cosT = Math.cos(theta);

  return {
    type: 'GRADIENT_LINEAR',
    gradientTransform: [
      [sinT,  cosT,  0.5 - 0.5 * sinT],
      [-cosT, sinT,  0.5 + 0.5 * cosT]
    ],
    gradientStops: stops.map(function(s) {
      return { position: s.position, color: { r: s.r / 255, g: s.g / 255, b: s.b / 255, a: s.a } };
    }),
    opacity: 1,
    visible: true,
    blendMode: 'NORMAL'
  };
}

// Extract the argument string inside the outermost linear-gradient() call,
// handling nested rgba() etc. via balanced-paren traversal.
function extractGradientContent(bgImage) {
  var idx = bgImage.indexOf('linear-gradient(');
  if (idx === -1) return null;
  var start = idx + 'linear-gradient('.length;
  var depth = 1, i = start;
  while (i < bgImage.length && depth > 0) {
    if (bgImage[i] === '(') depth++;
    else if (bgImage[i] === ')') depth--;
    i++;
  }
  return bgImage.substring(start, i - 1);
}

// Split by top-level commas only (skips commas inside parentheses).
function splitTopLevel(str) {
  var parts = [], depth = 0, current = '';
  for (var i = 0; i < str.length; i++) {
    if (str[i] === '(') depth++;
    else if (str[i] === ')') depth--;
    else if (str[i] === ',' && depth === 0) { parts.push(current); current = ''; continue; }
    current += str[i];
  }
  parts.push(current);
  return parts;
}

function keywordToAngle(keyword) {
  var map = {
    'to top': 0, 'to top right': 45, 'to right top': 45,
    'to right': 90, 'to bottom right': 135, 'to right bottom': 135,
    'to bottom': 180, 'to bottom left': 225, 'to left bottom': 225,
    'to left': 270, 'to top left': 315, 'to left top': 315
  };
  var k = keyword.toLowerCase().replace(/\s+/g, ' ').trim();
  return map[k] !== undefined ? map[k] : 180;
}

// Parse one color stop: "rgba(0,0,0,0.5) 30%" → {r,g,b,a,position}
function parseColorStop(str) {
  var posMatch = str.match(/([\d.]+%)\s*$/);
  var position = null;
  if (posMatch) {
    position = parseFloat(posMatch[1]) / 100;
    str = str.slice(0, str.lastIndexOf(posMatch[0])).trim();
  }
  var colorStr = str.trim();
  if (!colorStr || colorStr === 'transparent') {
    return { r: 0, g: 0, b: 0, a: 0, position: position };
  }
  var rgb = parseRgb(colorStr);
  return { r: rgb.r, g: rgb.g, b: rgb.b, a: rgb.a !== undefined ? rgb.a : 1, position: position };
}

// ── Compose: extract structured node data from Figma selection ────────────────

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(function(v) {
    return Math.round(v * 255).toString(16).padStart(2, '0');
  }).join('');
}

function resolveVarName(id) {
  try {
    var v = figma.variables && figma.variables.getVariableById(id);
    return v ? v.name : null;
  } catch (_e) { return null; }
}

function gradientCss(f) {
  var stops = (f.gradientStops || []).map(function(s) {
    return rgbToHex(s.color.r, s.color.g, s.color.b) + ' ' + Math.round(s.position * 100) + '%';
  }).join(', ');
  if (f.type === 'GRADIENT_LINEAR') return 'linear-gradient(' + stops + ')';
  if (f.type === 'GRADIENT_RADIAL') return 'radial-gradient(' + stops + ')';
  return f.type.replace('GRADIENT_', '').toLowerCase() + '-gradient(' + stops + ')';
}

function extractNodeFull(node, depth, maxDepth) {
  if (!node) return null;
  var info = {
    id: node.id,
    name: node.name,
    type: node.type
  };

  if ('width'  in node) info.width  = Math.round(node.width);
  if ('height' in node) info.height = Math.round(node.height);
  if ('x' in node) info.x = Math.round(node.x);
  if ('y' in node) info.y = Math.round(node.y);

  // Blend mode (skip default values)
  if ('blendMode' in node && node.blendMode !== 'NORMAL' && node.blendMode !== 'PASS_THROUGH') {
    info.blendMode = node.blendMode;
  }

  // Clip content
  if (node.clipsContent === true) info.clipsContent = true;

  // Min/max dimensions
  if (typeof node.minWidth === 'number' && node.minWidth > 0) info.minWidth = node.minWidth;
  if (typeof node.maxWidth === 'number') info.maxWidth = node.maxWidth;
  if (typeof node.minHeight === 'number' && node.minHeight > 0) info.minHeight = node.minHeight;
  if (typeof node.maxHeight === 'number') info.maxHeight = node.maxHeight;

  var bv = ('boundVariables' in node) ? (node.boundVariables || {}) : {};

  // Fills
  if ('fills' in node && Array.isArray(node.fills)) {
    var visibleFills = node.fills.filter(function(f) { return f.visible !== false; });
    if (visibleFills.length > 0) {
      info.fills = visibleFills.map(function(f, i) {
        if (f.type === 'SOLID') {
          var hex = rgbToHex(f.color.r, f.color.g, f.color.b);
          var tok = bv.fills && bv.fills[i] ? resolveVarName(bv.fills[i].id) : null;
          return {
            type: 'SOLID',
            color: tok ? hex + ' (' + tok + ')' : hex,
            opacity: f.opacity !== undefined ? Math.round(f.opacity * 100) / 100 : 1
          };
        }
        if (f.type === 'IMAGE') return { type: 'IMAGE', note: 'image fill' };
        if (f.type && f.type.indexOf('GRADIENT') === 0) return { type: f.type, css: gradientCss(f) };
        return { type: f.type };
      });
    }
  }

  // Strokes
  if ('strokes' in node && Array.isArray(node.strokes)) {
    var visibleStrokes = node.strokes.filter(function(s) { return s.visible !== false; });
    if (visibleStrokes.length > 0) {
      info.strokes = visibleStrokes.map(function(s, i) {
        var hex = s.color ? rgbToHex(s.color.r, s.color.g, s.color.b) : null;
        var tok = bv.strokes && bv.strokes[i] ? resolveVarName(bv.strokes[i].id) : null;
        var out = { type: s.type || 'SOLID', color: tok ? hex + ' (' + tok + ')' : hex };
        if (typeof node.strokeWeight === 'number') out.weight = node.strokeWeight;
        if (node.strokeAlign) out.align = node.strokeAlign;
        if (Array.isArray(node.strokeDashes) && node.strokeDashes.length > 0) out.dashes = node.strokeDashes;
        return out;
      });
    }
  }

  // Corner radius
  if ('cornerRadius' in node && typeof node.cornerRadius === 'number' && node.cornerRadius > 0) {
    info.cornerRadius = node.cornerRadius;
  } else if ('topLeftRadius' in node) {
    var tl = node.topLeftRadius || 0, tr = node.topRightRadius || 0,
        br = node.bottomRightRadius || 0, bl = node.bottomLeftRadius || 0;
    if (tl || tr || br || bl) info.borderRadius = { tl: tl, tr: tr, br: br, bl: bl };
  }

  // Effects
  if ('effects' in node && Array.isArray(node.effects)) {
    var visibleEffects = node.effects.filter(function(e) { return e.visible !== false; });
    if (visibleEffects.length > 0) {
      info.effects = visibleEffects.map(function(e) {
        var out = { type: e.type };
        if ('radius' in e) out.radius = e.radius;
        if ('spread' in e) out.spread = e.spread;
        if (e.offset) out.offset = { x: e.offset.x, y: e.offset.y };
        if (e.color) out.color = rgbToHex(e.color.r, e.color.g, e.color.b);
        return out;
      });
    }
  }

  // Opacity
  if ('opacity' in node && node.opacity !== 1) info.opacity = node.opacity;

  // Auto layout
  if ('layoutMode' in node && node.layoutMode !== 'NONE') {
    info.layout = {
      mode: node.layoutMode,
      gap: node.itemSpacing || 0,
      padding: {
        top: node.paddingTop || 0, right: node.paddingRight || 0,
        bottom: node.paddingBottom || 0, left: node.paddingLeft || 0
      },
      primaryAxis: node.primaryAxisAlignItems,
      counterAxis: node.counterAxisAlignItems,
      wrap: node.layoutWrap === 'WRAP'
    };
  }

  // Typography
  if (node.type === 'TEXT') {
    try {
      info.text = node.characters;
      if (typeof node.fontSize === 'number') {
        var fsTok = bv.fontSize ? resolveVarName(bv.fontSize.id) : null;
        info.fontSize = fsTok ? node.fontSize + ' (' + fsTok + ')' : node.fontSize;
      }
      if (typeof node.fontName === 'object' && node.fontName) {
        info.fontFamily = node.fontName.family;
        info.fontStyle = node.fontName.style;
      }
      if (node.textAlignHorizontal) info.textAlign = node.textAlignHorizontal;
      if (node.textCase && node.textCase !== 'ORIGINAL') info.textCase = node.textCase;
      if (typeof node.lineHeight === 'object' && node.lineHeight.unit !== 'AUTO') {
        info.lineHeight = node.lineHeight.value + (node.lineHeight.unit === 'PERCENT' ? '%' : 'px');
      }
      if (typeof node.letterSpacing === 'object') {
        info.letterSpacing = node.letterSpacing.value + (node.letterSpacing.unit === 'PERCENT' ? '%' : 'px');
      }
    } catch (_e) {}
  }

  // Component / instance info
  if (node.type === 'COMPONENT_SET') {
    info.isComponentSet = true;
  }
  if (node.type === 'COMPONENT') {
    info.isComponent = true;
    try {
      if (node.variantProperties && Object.keys(node.variantProperties).length > 0) {
        info.variantProperties = node.variantProperties;
      }
      if (node.parent && node.parent.type === 'COMPONENT_SET') {
        info.variants = node.parent.children.map(function(s) {
          return { name: s.name, variantProperties: s.variantProperties };
        });
      }
    } catch (_e) {}
  }
  if (node.type === 'INSTANCE') {
    try { info.mainComponentName = node.mainComponent ? node.mainComponent.name : null; } catch (_e) {}
    try {
      if (node.variantProperties && Object.keys(node.variantProperties).length > 0) {
        info.variantProperties = node.variantProperties;
      }
    } catch (_e) {}
  }

  // Children (up to depth limit, max 30 per level)
  if (depth < maxDepth && 'children' in node && Array.isArray(node.children) && node.children.length > 0) {
    info.children = node.children.slice(0, 30).map(function(c) {
      return extractNodeFull(c, depth + 1, maxDepth);
    });
  }

  return info;
}

// Push current selection to UI whenever it changes
figma.on('selectionchange', function() {
  var sel = figma.currentPage.selection;
  figma.ui.postMessage({
    type: 'SELECTION_CHANGED',
    count: sel.length,
    nodes: sel.slice(0, 20).map(function(n) {
      return { id: n.id, name: n.name, type: n.type,
               width: 'width' in n ? Math.round(n.width) : null,
               height: 'height' in n ? Math.round(n.height) : null };
    })
  });
});
