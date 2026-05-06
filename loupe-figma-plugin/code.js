// Loupe to Figma Bridge v2.0
figma.showUI(__html__, { width: 340, height: 500, themeColors: true });

figma.ui.onmessage = async (msg) => {

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
    f.x = msg.x ?? figma.viewport.center.x;
    f.y = msg.y ?? figma.viewport.center.y;
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

    // ── Main wrapper frame ───────────────────────────────────────────────────
    var mainFrame = figma.createFrame();
    mainFrame.name = 'Loupe: ' + (context.title || 'UI Capture') + ' (' + new Date().toLocaleTimeString() + ')';
    mainFrame.x = figma.viewport.center.x - (maxX - minX) / 2;
    mainFrame.y = figma.viewport.center.y - (maxY - minY) / 2;
    mainFrame.resize(Math.max(200, maxX - minX), Math.max(200, maxY - minY));
    mainFrame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    mainFrame.clipsContent = false;

    // ── Create element frames ────────────────────────────────────────────────
    var frames = new Array(sorted.length).fill(null);

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

        // Background
        if (styles.backgroundColor &&
            styles.backgroundColor !== 'transparent' &&
            styles.backgroundColor !== 'rgba(0, 0, 0, 0)') {
          container.fills = [createSolidFill(styles.backgroundColor)];
        } else {
          container.fills = [];
        }

        // Opacity
        var op = parseFloat(styles.opacity);
        if (!isNaN(op) && op !== 1) container.opacity = op;

        // Border radius
        var bRad = parseInt(styles.borderRadius);
        if (!isNaN(bRad) && bRad > 0) container.cornerRadius = bRad;

        // Drop shadow
        if (styles.boxShadow && styles.boxShadow !== 'none') {
          var shadow = parseShadow(styles.boxShadow);
          if (shadow) container.effects = [shadow];
        }

        // Border — only apply if the border is actually visible (style !== 'none')
        var bw = parseInt(styles.borderTopWidth) || parseInt(styles.borderLeftWidth) ||
                 parseInt(styles.borderRightWidth) || parseInt(styles.borderBottomWidth) || 0;
        var bStyle = styles.borderTopStyle || 'none';
        if (bw > 0 && bStyle !== 'none') {
          var bColor = styles.borderTopColor || styles.borderLeftColor || '#000000';
          container.strokeWeight = bw;
          container.strokes = [createSolidFill(bColor)];
          container.strokeAlign = 'INSIDE';
        }

        // Image
        if (elObj.tagName && elObj.tagName.toLowerCase() === 'img' &&
            elObj.attributes && elObj.attributes.src) {
          try {
            var image = await figma.createImageAsync(elObj.attributes.src);
            container.fills = [{ type: 'IMAGE', imageHash: image.hash, scaleMode: 'FILL' }];
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
            // If a smaller element has meaningful text that appears inside
            // our text, we are a container — suppress our text node.
            if (kText.length > 4 && kArea < jArea && elText.includes(kText)) {
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

    // Sort root elements top-to-bottom, left-to-right
    rootList.sort(function(a, b) {
      var ra = sorted[a].rect, rb = sorted[b].rect;
      return ra.top !== rb.top ? ra.top - rb.top : ra.left - rb.left;
    });

    // ── Recursively append children with absolute positioning ────────────────
    function buildHierarchy(parentFrame, childList, parentJIdx) {
      for (var k = 0; k < childList.length; k++) {
        var c = childList[k];
        if (!frames[c]) continue;

        parentFrame.appendChild(frames[c]);

        // Position relative to parent's top-left corner
        var cRect = sorted[c].rect;
        var origin = parentJIdx === -1
          ? { left: minX, top: minY }
          : sorted[parentJIdx].rect;
        frames[c].x = cRect.left - origin.left;
        frames[c].y = cRect.top  - origin.top;

        buildHierarchy(frames[c], childrenOf[c], c);
      }
    }

    buildHierarchy(mainFrame, rootList, -1);

    figma.viewport.scrollAndZoomIntoView([mainFrame]);
    figma.notify('Sync complete — ' + sorted.length + ' elements, nested by hierarchy.');
  }
};

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
