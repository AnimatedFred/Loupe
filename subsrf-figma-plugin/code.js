(() => {
  // src/plugin/handlers/storage.js
  async function handleStorage(msg) {
    if (msg.type === "GET_STORAGE") {
      try {
        const value = await figma.clientStorage.getAsync(msg.key);
        figma.ui.postMessage({ type: "STORAGE_VALUE", key: msg.key, value });
      } catch (err) {
        figma.ui.postMessage({ type: "STORAGE_VALUE", key: msg.key, value: null, error: err.message });
      }
    } else if (msg.type === "SET_STORAGE") {
      try {
        await figma.clientStorage.setAsync(msg.key, msg.value);
      } catch (_) {
      }
    } else if (msg.type === "DEL_STORAGE") {
      try {
        await figma.clientStorage.deleteAsync(msg.key);
      } catch (_) {
      }
    }
  }
  function handleResize(msg) {
    figma.ui.resize(msg.width, msg.height);
  }

  // src/plugin/utils/color.js
  function parseRgb(color) {
    if (typeof color !== "string") return { r: 0, g: 0, b: 0 };
    const c = color.trim().toLowerCase();
    const named = {
      white: { r: 255, g: 255, b: 255 },
      black: { r: 0, g: 0, b: 0 },
      red: { r: 255, g: 0, b: 0 },
      blue: { r: 0, g: 0, b: 255 },
      green: { r: 0, g: 128, b: 0 },
      yellow: { r: 255, g: 255, b: 0 },
      transparent: { r: 0, g: 0, b: 0, a: 0 },
      gray: { r: 128, g: 128, b: 128 },
      grey: { r: 128, g: 128, b: 128 }
    };
    if (named[c]) return named[c];
    if (color.startsWith("rgb")) {
      const values = color.match(/\d+(\.\d+)?/g).map(Number);
      return { r: values[0] || 0, g: values[1] || 0, b: values[2] || 0, a: values[3] };
    }
    if (color.startsWith("#")) {
      let hex = color.replace("#", "");
      if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
      return {
        r: parseInt(hex.substring(0, 2), 16) || 0,
        g: parseInt(hex.substring(2, 4), 16) || 0,
        b: parseInt(hex.substring(4, 6), 16) || 0
      };
    }
    return { r: 0, g: 0, b: 0 };
  }
  function cssColorToRgb(color) {
    const { r, g, b } = parseRgb(color);
    return { r: r / 255, g: g / 255, b: b / 255 };
  }
  function createSolidFill(cssColor) {
    const rgb = parseRgb(cssColor);
    return {
      type: "SOLID",
      color: { r: rgb.r / 255, g: rgb.g / 255, b: rgb.b / 255 },
      opacity: rgb.a !== void 0 ? rgb.a : 1
    };
  }
  function rgbToHex(r, g, b) {
    return "#" + [r, g, b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("");
  }

  // src/plugin/handlers/nodeOps.js
  async function handleNodeOps(msg) {
    switch (msg.type) {
      case "CREATE_FRAME": {
        const f = figma.createFrame();
        f.name = msg.name || "Frame";
        f.x = msg.x !== void 0 ? msg.x : figma.viewport.center.x;
        f.y = msg.y !== void 0 ? msg.y : figma.viewport.center.y;
        if (msg.width && msg.height) f.resize(msg.width, msg.height);
        figma.currentPage.appendChild(f);
        figma.viewport.scrollAndZoomIntoView([f]);
        figma.notify(`Created frame "${f.name}"`);
        break;
      }
      case "SET_TEXT": {
        const node = msg.nodeId ? figma.getNodeById(msg.nodeId) : figma.currentPage.selection[0];
        if (!node || node.type !== "TEXT") {
          figma.notify("No text node found");
          break;
        }
        await figma.loadFontAsync(node.fontName);
        node.characters = msg.text || "";
        figma.notify("Text updated");
        break;
      }
      case "SET_FILL": {
        const node = msg.nodeId ? figma.getNodeById(msg.nodeId) : figma.currentPage.selection[0];
        if (!node || !("fills" in node)) {
          figma.notify("No fillable node found");
          break;
        }
        node.fills = [{ type: "SOLID", color: cssColorToRgb(msg.color || "#000000") }];
        figma.notify("Fill updated");
        break;
      }
      case "MOVE": {
        const node = msg.nodeId ? figma.getNodeById(msg.nodeId) : figma.currentPage.selection[0];
        if (!node) {
          figma.notify("No node found");
          break;
        }
        if (msg.x !== void 0) node.x = msg.x;
        if (msg.y !== void 0) node.y = msg.y;
        if (msg.width && msg.height) node.resize(msg.width, msg.height);
        break;
      }
      case "DELETE": {
        const node = msg.nodeId ? figma.getNodeById(msg.nodeId) : figma.currentPage.selection[0];
        if (!node) {
          figma.notify("No node found");
          break;
        }
        node.remove();
        figma.notify("Node deleted");
        break;
      }
      case "CLONE": {
        const node = msg.nodeId ? figma.getNodeById(msg.nodeId) : figma.currentPage.selection[0];
        if (!node) {
          figma.notify("No node found");
          break;
        }
        const clone = node.clone();
        if (msg.x !== void 0) clone.x = msg.x;
        if (msg.y !== void 0) clone.y = msg.y;
        figma.viewport.scrollAndZoomIntoView([clone]);
        figma.notify("Node cloned");
        break;
      }
      case "SWAP_COMPONENT": {
        const node = msg.nodeId ? figma.getNodeById(msg.nodeId) : figma.currentPage.selection[0];
        if (!node || node.type !== "INSTANCE") {
          figma.notify("No component instance selected");
          break;
        }
        const component = await figma.importComponentByKeyAsync(msg.componentKey);
        node.swapComponent(component);
        figma.notify("Component swapped");
        break;
      }
    }
  }

  // src/plugin/utils/font.js
  async function loadFont(family, weight) {
    const style = mapWeight(weight);
    const fontName = { family, style };
    try {
      await figma.loadFontAsync(fontName);
      return fontName;
    } catch (_) {
      const fallback = { family: "Inter", style };
      try {
        await figma.loadFontAsync(fallback);
        return fallback;
      } catch (_2) {
        await figma.loadFontAsync({ family: "Inter", style: "Regular" });
        return { family: "Inter", style: "Regular" };
      }
    }
  }
  function mapWeight(weight) {
    const w = parseInt(weight);
    if (w >= 900) return "Black";
    if (w >= 800) return "Extra Bold";
    if (w >= 700) return "Bold";
    if (w >= 600) return "Semi Bold";
    if (w >= 500) return "Medium";
    return "Regular";
  }
  function parseFontFamily(cssFamily) {
    if (!cssFamily) return "Inter";
    const first = cssFamily.split(",")[0].replace(/['"]/g, "").trim();
    return first || "Inter";
  }

  // src/plugin/utils/gradient.js
  function parseAllShadows(cssShadow) {
    const result = [];
    let depth = 0, start = 0;
    for (let i = 0; i <= cssShadow.length; i++) {
      const ch = cssShadow[i];
      if (ch === "(") depth++;
      else if (ch === ")") depth--;
      else if ((ch === "," || i === cssShadow.length) && depth === 0) {
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
    const withoutColor = cssShadow.replace(colorMatch[0], "");
    const nums = withoutColor.match(/-?\d+(\.\d+)?/g);
    if (!nums || nums.length < 2) return null;
    const x = parseFloat(nums[0]) || 0;
    const y = parseFloat(nums[1]) || 0;
    const blur = parseFloat(nums[2]) || 0;
    const spread = parseFloat(nums[3]) || 0;
    if (x === 0 && y === 0 && blur === 0) return null;
    const color = parseRgb(colorMatch[0]);
    return {
      type: "DROP_SHADOW",
      color: { r: color.r / 255, g: color.g / 255, b: color.b / 255, a: color.a !== void 0 ? color.a : 1 },
      offset: { x, y },
      radius: blur,
      spread,
      visible: true,
      blendMode: "NORMAL"
    };
  }
  function parseLinearGradient(bgImage) {
    const content = extractGradientContent(bgImage);
    if (!content) return null;
    let parts = splitTopLevel(content);
    if (parts.length < 2) return null;
    let angle = 180;
    const first = parts[0].trim();
    if (/^to\s+/i.test(first)) {
      angle = keywordToAngle(first);
      parts = parts.slice(1);
    } else if (/^-?\d+(\.\d+)?deg/i.test(first)) {
      angle = parseFloat(first);
      parts = parts.slice(1);
    } else if (/^-?\d+(\.\d+)?turn/i.test(first)) {
      angle = parseFloat(first) * 360;
      parts = parts.slice(1);
    } else if (/^-?\d+(\.\d+)?rad/i.test(first)) {
      angle = parseFloat(first) * (180 / Math.PI);
      parts = parts.slice(1);
    }
    const stops = parts.map((p) => parseColorStop(p.trim())).filter(Boolean);
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
      type: "GRADIENT_LINEAR",
      gradientTransform: [
        [sinT, cosT, 0.5 - 0.5 * sinT],
        [-cosT, sinT, 0.5 + 0.5 * cosT]
      ],
      gradientStops: stops.map((s) => ({
        position: s.position,
        color: { r: s.r / 255, g: s.g / 255, b: s.b / 255, a: s.a }
      })),
      opacity: 1,
      visible: true,
      blendMode: "NORMAL"
    };
  }
  function extractGradientContent(bgImage) {
    const idx = bgImage.indexOf("linear-gradient(");
    if (idx === -1) return null;
    const start = idx + "linear-gradient(".length;
    let depth = 1, i = start;
    while (i < bgImage.length && depth > 0) {
      if (bgImage[i] === "(") depth++;
      else if (bgImage[i] === ")") depth--;
      i++;
    }
    return bgImage.substring(start, i - 1);
  }
  function splitTopLevel(str) {
    const parts = [];
    let depth = 0, current = "";
    for (let i = 0; i < str.length; i++) {
      if (str[i] === "(") depth++;
      else if (str[i] === ")") depth--;
      else if (str[i] === "," && depth === 0) {
        parts.push(current);
        current = "";
        continue;
      }
      current += str[i];
    }
    parts.push(current);
    return parts;
  }
  function keywordToAngle(keyword) {
    const map = {
      "to top": 0,
      "to top right": 45,
      "to right top": 45,
      "to right": 90,
      "to bottom right": 135,
      "to right bottom": 135,
      "to bottom": 180,
      "to bottom left": 225,
      "to left bottom": 225,
      "to left": 270,
      "to top left": 315,
      "to left top": 315
    };
    const k = keyword.toLowerCase().replace(/\s+/g, " ").trim();
    return map[k] !== void 0 ? map[k] : 180;
  }
  function parseColorStop(str) {
    const posMatch = str.match(/([\d.]+%)\s*$/);
    let position = null;
    if (posMatch) {
      position = parseFloat(posMatch[1]) / 100;
      str = str.slice(0, str.lastIndexOf(posMatch[0])).trim();
    }
    const colorStr = str.trim();
    if (!colorStr || colorStr === "transparent") return { r: 0, g: 0, b: 0, a: 0, position };
    const rgb = parseRgb(colorStr);
    return { r: rgb.r, g: rgb.g, b: rgb.b, a: rgb.a !== void 0 ? rgb.a : 1, position };
  }

  // src/plugin/handlers/importElements.js
  var BLEND_MAP = {
    "multiply": "MULTIPLY",
    "screen": "SCREEN",
    "overlay": "OVERLAY",
    "darken": "DARKEN",
    "lighten": "LIGHTEN",
    "color-dodge": "COLOR_DODGE",
    "color-burn": "COLOR_BURN",
    "hard-light": "HARD_LIGHT",
    "soft-light": "SOFT_LIGHT",
    "difference": "DIFFERENCE",
    "exclusion": "EXCLUSION",
    "hue": "HUE",
    "saturation": "SATURATION",
    "color": "COLOR",
    "luminosity": "LUMINOSITY"
  };
  var SLACK = 4;
  async function handleImportElements(msg) {
    var _a, _b;
    const elements = msg.elements || msg.data && msg.data.elements || [];
    const tier = msg.tier || "free";
    const isPaidTier = tier === "starter" || tier === "pro";
    if (!elements.length) {
      figma.notify("No elements found to sync");
      return;
    }
    elements.forEach((el) => {
      if (!el.rect) el.rect = { left: 0, top: 0, width: 100, height: 40 };
    });
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    elements.forEach(({ rect: r }) => {
      if (r.left < minX) minX = r.left;
      if (r.top < minY) minY = r.top;
      if (r.left + r.width > maxX) maxX = r.left + r.width;
      if (r.top + r.height > maxY) maxY = r.top + r.height;
    });
    const sorted = elements.slice().sort(
      (a, b) => b.rect.width * b.rect.height - a.rect.width * a.rect.height
    );
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
        if (rj.left - SLACK <= ri.left && rj.top - SLACK <= ri.top && rj.left + rj.width + SLACK >= ri.left + ri.width && rj.top + rj.height + SLACK >= ri.top + ri.height && rjArea < bestArea) {
          bestArea = rjArea;
          parentIdx[i] = j;
        }
      }
    }
    const hasChild = new Array(sorted.length).fill(false);
    for (let i = 0; i < sorted.length; i++) {
      if (parentIdx[i] !== -1) hasChild[parentIdx[i]] = true;
    }
    await figma.loadFontAsync({ family: "Inter", style: "Regular" });
    await figma.loadFontAsync({ family: "Inter", style: "Medium" });
    await figma.loadFontAsync({ family: "Inter", style: "Semi Bold" });
    await figma.loadFontAsync({ family: "Inter", style: "Bold" });
    const canvasOffsetX = figma.viewport.center.x - (maxX - minX) / 2;
    const canvasOffsetY = figma.viewport.center.y - (maxY - minY) / 2;
    const frames = new Array(sorted.length).fill(null);
    const autoLayoutInfo = {};
    for (let j = 0; j < sorted.length; j++) {
      try {
        const elObj = sorted[j];
        const styles = elObj.styles || {};
        const rect = elObj.rect;
        const container = figma.createFrame();
        const safeCls = elObj.cls ? " ." + elObj.cls.trim().split(/\s+/).slice(0, 2).join(".") : "";
        container.name = (elObj.tagName || "DIV") + safeCls;
        container.resize(Math.max(1, rect.width), Math.max(1, rect.height));
        container.clipsContent = false;
        if (isPaidTier && styles.backgroundImage && styles.backgroundImage !== "none") {
          const gradFill = parseLinearGradient(styles.backgroundImage);
          if (gradFill) {
            container.fills = [gradFill];
          } else if (styles.backgroundColor && styles.backgroundColor !== "transparent" && styles.backgroundColor !== "rgba(0, 0, 0, 0)") {
            container.fills = [createSolidFill(styles.backgroundColor)];
          } else {
            container.fills = [];
          }
        } else if (styles.backgroundColor && styles.backgroundColor !== "transparent" && styles.backgroundColor !== "rgba(0, 0, 0, 0)") {
          container.fills = [createSolidFill(styles.backgroundColor)];
        } else {
          container.fills = [];
        }
        const op = parseFloat(styles.opacity);
        if (!isNaN(op) && op !== 1) container.opacity = op;
        const bTL = parseInt(styles.borderTopLeftRadius) || parseInt(styles.borderRadius) || 0;
        const bTR = parseInt(styles.borderTopRightRadius) || parseInt(styles.borderRadius) || 0;
        const bBR = parseInt(styles.borderBottomRightRadius) || parseInt(styles.borderRadius) || 0;
        const bBL = parseInt(styles.borderBottomLeftRadius) || parseInt(styles.borderRadius) || 0;
        if (bTL || bTR || bBR || bBL) {
          if (bTL === bTR && bTR === bBR && bBR === bBL) container.cornerRadius = bTL;
          else {
            container.topLeftRadius = bTL;
            container.topRightRadius = bTR;
            container.bottomRightRadius = bBR;
            container.bottomLeftRadius = bBL;
          }
        }
        const effects = [];
        if (styles.boxShadow && styles.boxShadow !== "none") {
          effects.push(...parseAllShadows(styles.boxShadow));
        }
        if (styles.backdropFilter && styles.backdropFilter !== "none") {
          const m = styles.backdropFilter.match(/blur\((\d+(?:\.\d+)?)/);
          if (m) effects.push({ type: "BACKGROUND_BLUR", radius: parseFloat(m[1]), visible: true });
        }
        if (styles.filter && styles.filter !== "none") {
          const m = styles.filter.match(/blur\((\d+(?:\.\d+)?)/);
          if (m) effects.push({ type: "LAYER_BLUR", radius: parseFloat(m[1]), visible: true });
        }
        if (effects.length > 0) container.effects = effects;
        if (styles.mixBlendMode && BLEND_MAP[styles.mixBlendMode]) {
          container.blendMode = BLEND_MAP[styles.mixBlendMode];
        }
        const bwTop = parseInt(styles.borderTopWidth) || 0;
        const bwRight = parseInt(styles.borderRightWidth) || 0;
        const bwBottom = parseInt(styles.borderBottomWidth) || 0;
        const bwLeft = parseInt(styles.borderLeftWidth) || 0;
        const bStyle = styles.borderTopStyle || styles.borderLeftStyle || "none";
        if ((bwTop || bwRight || bwBottom || bwLeft) && bStyle !== "none") {
          const bColor = styles.borderTopColor || styles.borderLeftColor || "#000000";
          const uniformBw = bwTop === bwRight && bwRight === bwBottom && bwBottom === bwLeft ? bwTop : Math.max(bwTop, bwRight, bwBottom, bwLeft);
          container.strokeWeight = uniformBw;
          container.strokes = [createSolidFill(bColor)];
          container.strokeAlign = "INSIDE";
        }
        if (isPaidTier && styles.display === "flex") {
          const isRow = !(styles.flexDirection || "row").startsWith("column");
          container.layoutMode = isRow ? "HORIZONTAL" : "VERTICAL";
          container.layoutWrap = styles.flexWrap === "wrap" || styles.flexWrap === "wrap-reverse" ? "WRAP" : "NO_WRAP";
          container.primaryAxisSizingMode = "FIXED";
          container.counterAxisSizingMode = "FIXED";
          const gap = parseFloat(styles.gap) || 0;
          if (gap > 0) container.itemSpacing = gap;
          container.paddingTop = parseInt(styles.paddingTop) || 0;
          container.paddingRight = parseInt(styles.paddingRight) || 0;
          container.paddingBottom = parseInt(styles.paddingBottom) || 0;
          container.paddingLeft = parseInt(styles.paddingLeft) || 0;
          const jc = styles.justifyContent || "flex-start";
          container.primaryAxisAlignItems = jc === "center" ? "CENTER" : jc === "flex-end" || jc === "end" ? "MAX" : jc === "space-between" ? "SPACE_BETWEEN" : "MIN";
          const ai = styles.alignItems || "stretch";
          container.counterAxisAlignItems = ai === "center" ? "CENTER" : ai === "flex-end" || ai === "end" ? "MAX" : "MIN";
          autoLayoutInfo[j] = isRow ? "HORIZONTAL" : "VERTICAL";
        }
        if (((_a = elObj.tagName) == null ? void 0 : _a.toLowerCase()) === "img" && ((_b = elObj.attributes) == null ? void 0 : _b.src)) {
          try {
            const image = await figma.createImageAsync(elObj.attributes.src);
            const scaleMode = styles.objectFit === "contain" ? "FIT" : styles.objectFit === "none" ? "CROP" : "FILL";
            container.fills = [{ type: "IMAGE", imageHash: image.hash, scaleMode }];
          } catch (_) {
          }
        }
        const elText = (elObj.text || "").trim();
        let isTextLeaf = !hasChild[j] && elText.length > 0;
        if (isTextLeaf) {
          const jArea = rect.width * rect.height;
          for (let k = 0; k < sorted.length; k++) {
            if (k === j) continue;
            const kText = (sorted[k].text || "").trim();
            const kArea = sorted[k].rect.width * sorted[k].rect.height;
            const kRect = sorted[k].rect;
            const isInside = kRect.left >= rect.left - SLACK && kRect.top >= rect.top - SLACK && kRect.left + kRect.width <= rect.left + rect.width + SLACK && kRect.top + kRect.height <= rect.top + rect.height + SLACK;
            if (kText.length > 4 && kArea < jArea && elText.includes(kText) && isInside) {
              isTextLeaf = false;
              break;
            }
          }
        }
        if (isTextLeaf) {
          const fontName = await loadFont(parseFontFamily(styles.fontFamily), styles.fontWeight || "400");
          const textNode = figma.createText();
          textNode.fontName = fontName;
          textNode.characters = elText;
          textNode.fontSize = Math.max(8, parseInt(styles.fontSize) || 14);
          if (styles.color) textNode.fills = [createSolidFill(styles.color)];
          if (styles.lineHeight && styles.lineHeight !== "normal") {
            const lh = parseFloat(styles.lineHeight);
            if (!isNaN(lh) && lh > 0) textNode.lineHeight = { value: lh, unit: "PIXELS" };
          }
          if (styles.letterSpacing && styles.letterSpacing !== "normal") {
            const ls = parseFloat(styles.letterSpacing);
            if (!isNaN(ls)) textNode.letterSpacing = { value: ls, unit: "PIXELS" };
          }
          if (styles.textAlign === "center") textNode.textAlignHorizontal = "CENTER";
          else if (styles.textAlign === "right") textNode.textAlignHorizontal = "RIGHT";
          else textNode.textAlignHorizontal = "LEFT";
          if (styles.textDecoration && styles.textDecoration !== "none") {
            if (styles.textDecoration.includes("underline")) textNode.textDecoration = "UNDERLINE";
            else if (styles.textDecoration.includes("line-through")) textNode.textDecoration = "STRIKETHROUGH";
          }
          if (styles.textTransform === "uppercase") textNode.characters = textNode.characters.toUpperCase();
          else if (styles.textTransform === "lowercase") textNode.characters = textNode.characters.toLowerCase();
          textNode.textAutoResize = "HEIGHT";
          const pL = parseInt(styles.paddingLeft) || 0, pT = parseInt(styles.paddingTop) || 0;
          const pR = parseInt(styles.paddingRight) || 0;
          try {
            textNode.resize(Math.max(20, rect.width - pL - pR), textNode.height);
          } catch (_) {
          }
          textNode.x = pL;
          textNode.y = pT;
          container.appendChild(textNode);
        }
        frames[j] = container;
      } catch (err) {
        console.warn("Frame creation error:", err);
      }
    }
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
      if (alDir === "HORIZONTAL") ordered.sort((a, b) => sorted[a].rect.left - sorted[b].rect.left);
      else if (alDir === "VERTICAL") ordered.sort((a, b) => sorted[a].rect.top - sorted[b].rect.top);
      else ordered.sort((a, b) => (parseInt((sorted[a].styles || {}).zIndex) || 0) - (parseInt((sorted[b].styles || {}).zIndex) || 0));
      for (const c of ordered) {
        if (!frames[c]) continue;
        parentFrame.appendChild(frames[c]);
        if (!alDir) {
          const cRect = sorted[c].rect;
          const origin = parentJIdx === -1 ? { left: minX, top: minY } : sorted[parentJIdx].rect;
          frames[c].x = cRect.left - origin.left;
          frames[c].y = cRect.top - origin.top;
        }
        buildHierarchy(frames[c], childrenOf[c], c);
      }
    }
    buildHierarchy(figma.currentPage, rootList, -1);
    for (const ri of rootList) {
      if (!frames[ri]) continue;
      frames[ri].x = canvasOffsetX + (sorted[ri].rect.left - minX);
      frames[ri].y = canvasOffsetY + (sorted[ri].rect.top - minY);
    }
    const allRootFrames = rootList.map((r) => frames[r]).filter(Boolean);
    figma.viewport.scrollAndZoomIntoView(allRootFrames);
    figma.notify(`Sync complete \u2014 ${sorted.length} elements, nested by hierarchy.`);
  }

  // src/plugin/handlers/importVariables.js
  async function handleImportVariables(msg) {
    try {
      let getOrCreateCollection = function(name, modes) {
        const existing = figma.variables.getLocalVariableCollections().find((c) => c.name === name);
        if (existing) return existing;
        const col = figma.variables.createVariableCollection(name);
        col.renameMode(col.modes[0].modeId, modes[0]);
        for (let i = 1; i < modes.length; i++) {
          try {
            col.addMode(modes[i]);
          } catch (_) {
          }
        }
        return col;
      }, importVarsIntoCollection = function(vars, collection) {
        for (const v of vars) {
          try {
            const existing = figma.variables.getLocalVariables().find((lv) => lv.name === v.name && lv.variableCollectionId === collection.id);
            const figmaVar = existing || figma.variables.createVariable(v.name, collection, v.type);
            for (const [modeName, modeValue] of Object.entries(v.values)) {
              let mode = collection.modes.find((m) => m.name === modeName);
              if (!mode) mode = collection.modes[0];
              if (!mode) continue;
              figmaVar.setValueForMode(mode.modeId, modeValue);
            }
            created++;
          } catch (_) {
            skipped++;
          }
        }
      };
      const data = msg.data;
      if (!figma.variables) {
        figma.ui.postMessage({ type: "IMPORT_VARIABLES_RESULT", error: "Variables API not available in this Figma plan." });
        return;
      }
      const colorModes = data.modes || ["Default"];
      let created = 0, skipped = 0;
      const colorVars = data.variables.filter((v) => v.type === "COLOR");
      const floatVars = data.variables.filter((v) => v.type === "FLOAT");
      const stringVars = data.variables.filter((v) => v.type === "STRING");
      const spacingVars = floatVars.filter((v) => v.name.startsWith("space/"));
      const radiusVars = floatVars.filter((v) => v.name.startsWith("radius/"));
      const otherFloats = floatVars.filter((v) => !v.name.startsWith("space/") && !v.name.startsWith("radius/"));
      if (colorVars.length > 0) importVarsIntoCollection(colorVars, getOrCreateCollection("Colors", colorModes));
      if (spacingVars.length > 0) importVarsIntoCollection(spacingVars, getOrCreateCollection("Spacing", ["Default"]));
      if (radiusVars.length > 0) importVarsIntoCollection(radiusVars, getOrCreateCollection("Radius", ["Default"]));
      if (otherFloats.length > 0 || stringVars.length > 0) {
        importVarsIntoCollection([...otherFloats, ...stringVars], getOrCreateCollection("Other", ["Default"]));
      }
      figma.ui.postMessage({ type: "IMPORT_VARIABLES_RESULT", created, skipped });
      figma.notify(`Variables imported: ${created} created${skipped ? `, ${skipped} skipped` : ""}`);
    } catch (err) {
      figma.ui.postMessage({ type: "IMPORT_VARIABLES_RESULT", error: err.message });
    }
  }

  // src/plugin/handlers/importTextStyles.js
  async function handleImportTextStyles(msg) {
    try {
      const styles = msg.styles;
      let created = 0, skipped = 0;
      const resolvedFonts = {};
      for (const s of styles) {
        const fontKey = `${s.fontFamily}::${s.fontStyle || "Regular"}`;
        try {
          let resolved = resolvedFonts[fontKey];
          if (!resolved) {
            try {
              await figma.loadFontAsync({ family: s.fontFamily, style: s.fontStyle || "Regular" });
              resolved = { family: s.fontFamily, style: s.fontStyle || "Regular" };
            } catch (_) {
              await figma.loadFontAsync({ family: "Inter", style: "Regular" });
              resolved = { family: "Inter", style: "Regular" };
            }
            resolvedFonts[fontKey] = resolved;
          }
          const existing = figma.getLocalTextStyles().find((ts) => ts.name === s.name);
          const textStyle = existing || figma.createTextStyle();
          textStyle.name = s.name;
          textStyle.fontName = resolved;
          textStyle.fontSize = s.fontSize;
          created++;
        } catch (_) {
          skipped++;
        }
      }
      figma.ui.postMessage({ type: "IMPORT_TEXT_STYLES_RESULT", created, skipped });
      figma.notify(`Text styles: ${created} created${skipped ? `, ${skipped} skipped` : ""}`);
    } catch (err) {
      figma.ui.postMessage({ type: "IMPORT_TEXT_STYLES_RESULT", error: err.message });
    }
  }

  // src/plugin/utils/node.js
  function resolveVarName(id) {
    try {
      const v = figma.variables && figma.variables.getVariableById(id);
      return v ? v.name : null;
    } catch (_) {
      return null;
    }
  }
  function gradientCss(f) {
    const stops = (f.gradientStops || []).map(
      (s) => rgbToHex(s.color.r, s.color.g, s.color.b) + " " + Math.round(s.position * 100) + "%"
    ).join(", ");
    if (f.type === "GRADIENT_LINEAR") return `linear-gradient(${stops})`;
    if (f.type === "GRADIENT_RADIAL") return `radial-gradient(${stops})`;
    return f.type.replace("GRADIENT_", "").toLowerCase() + `-gradient(${stops})`;
  }
  function extractNodeFull(node, depth, maxDepth) {
    if (!node) return null;
    const info = { id: node.id, name: node.name, type: node.type };
    if ("width" in node) info.width = Math.round(node.width);
    if ("height" in node) info.height = Math.round(node.height);
    if ("x" in node) info.x = Math.round(node.x);
    if ("y" in node) info.y = Math.round(node.y);
    if ("blendMode" in node && node.blendMode !== "NORMAL" && node.blendMode !== "PASS_THROUGH") {
      info.blendMode = node.blendMode;
    }
    if (node.clipsContent === true) info.clipsContent = true;
    if (typeof node.minWidth === "number" && node.minWidth > 0) info.minWidth = node.minWidth;
    if (typeof node.maxWidth === "number") info.maxWidth = node.maxWidth;
    if (typeof node.minHeight === "number" && node.minHeight > 0) info.minHeight = node.minHeight;
    if (typeof node.maxHeight === "number") info.maxHeight = node.maxHeight;
    const bv = "boundVariables" in node ? node.boundVariables || {} : {};
    if ("fills" in node && Array.isArray(node.fills)) {
      const visible = node.fills.filter((f) => f.visible !== false);
      if (visible.length > 0) {
        info.fills = visible.map((f, i) => {
          if (f.type === "SOLID") {
            const hex = rgbToHex(f.color.r, f.color.g, f.color.b);
            const tok = bv.fills && bv.fills[i] ? resolveVarName(bv.fills[i].id) : null;
            return { type: "SOLID", color: tok ? `${hex} (${tok})` : hex, opacity: f.opacity !== void 0 ? Math.round(f.opacity * 100) / 100 : 1 };
          }
          if (f.type === "IMAGE") return { type: "IMAGE", note: "image fill" };
          if (f.type && f.type.indexOf("GRADIENT") === 0) return { type: f.type, css: gradientCss(f) };
          return { type: f.type };
        });
      }
    }
    if ("strokes" in node && Array.isArray(node.strokes)) {
      const visible = node.strokes.filter((s) => s.visible !== false);
      if (visible.length > 0) {
        info.strokes = visible.map((s, i) => {
          const hex = s.color ? rgbToHex(s.color.r, s.color.g, s.color.b) : null;
          const tok = bv.strokes && bv.strokes[i] ? resolveVarName(bv.strokes[i].id) : null;
          const out = { type: s.type || "SOLID", color: tok ? `${hex} (${tok})` : hex };
          if (typeof node.strokeWeight === "number") out.weight = node.strokeWeight;
          if (node.strokeAlign) out.align = node.strokeAlign;
          if (Array.isArray(node.strokeDashes) && node.strokeDashes.length > 0) out.dashes = node.strokeDashes;
          return out;
        });
      }
    }
    if ("cornerRadius" in node && typeof node.cornerRadius === "number" && node.cornerRadius > 0) {
      info.cornerRadius = node.cornerRadius;
    } else if ("topLeftRadius" in node) {
      const tl = node.topLeftRadius || 0, tr = node.topRightRadius || 0, br = node.bottomRightRadius || 0, bl = node.bottomLeftRadius || 0;
      if (tl || tr || br || bl) info.borderRadius = { tl, tr, br, bl };
    }
    if ("effects" in node && Array.isArray(node.effects)) {
      const visible = node.effects.filter((e) => e.visible !== false);
      if (visible.length > 0) {
        info.effects = visible.map((e) => {
          const out = { type: e.type };
          if ("radius" in e) out.radius = e.radius;
          if ("spread" in e) out.spread = e.spread;
          if (e.offset) out.offset = { x: e.offset.x, y: e.offset.y };
          if (e.color) out.color = rgbToHex(e.color.r, e.color.g, e.color.b);
          return out;
        });
      }
    }
    if ("opacity" in node && node.opacity !== 1) info.opacity = node.opacity;
    if ("layoutMode" in node && node.layoutMode !== "NONE") {
      info.layout = {
        mode: node.layoutMode,
        gap: node.itemSpacing || 0,
        padding: { top: node.paddingTop || 0, right: node.paddingRight || 0, bottom: node.paddingBottom || 0, left: node.paddingLeft || 0 },
        primaryAxis: node.primaryAxisAlignItems,
        counterAxis: node.counterAxisAlignItems,
        wrap: node.layoutWrap === "WRAP"
      };
    }
    if (node.type === "TEXT") {
      try {
        info.text = node.characters;
        if (typeof node.fontSize === "number") {
          const fsTok = bv.fontSize ? resolveVarName(bv.fontSize.id) : null;
          info.fontSize = fsTok ? `${node.fontSize} (${fsTok})` : node.fontSize;
        }
        if (typeof node.fontName === "object" && node.fontName) {
          info.fontFamily = node.fontName.family;
          info.fontStyle = node.fontName.style;
        }
        if (node.textAlignHorizontal) info.textAlign = node.textAlignHorizontal;
        if (node.textCase && node.textCase !== "ORIGINAL") info.textCase = node.textCase;
        if (typeof node.lineHeight === "object" && node.lineHeight.unit !== "AUTO") {
          info.lineHeight = node.lineHeight.value + (node.lineHeight.unit === "PERCENT" ? "%" : "px");
        }
        if (typeof node.letterSpacing === "object") {
          info.letterSpacing = node.letterSpacing.value + (node.letterSpacing.unit === "PERCENT" ? "%" : "px");
        }
      } catch (_) {
      }
    }
    if (node.type === "COMPONENT_SET") info.isComponentSet = true;
    if (node.type === "COMPONENT") {
      info.isComponent = true;
      try {
        if (node.variantProperties && Object.keys(node.variantProperties).length > 0) info.variantProperties = node.variantProperties;
        if (node.parent && node.parent.type === "COMPONENT_SET") {
          info.variants = node.parent.children.map((s) => ({ name: s.name, variantProperties: s.variantProperties }));
        }
      } catch (_) {
      }
    }
    if (node.type === "INSTANCE") {
      try {
        info.mainComponentName = node.mainComponent ? node.mainComponent.name : null;
      } catch (_) {
      }
      try {
        if (node.variantProperties && Object.keys(node.variantProperties).length > 0) info.variantProperties = node.variantProperties;
      } catch (_) {
      }
    }
    if (depth < maxDepth && "children" in node && Array.isArray(node.children) && node.children.length > 0) {
      info.children = node.children.slice(0, 30).map((c) => extractNodeFull(c, depth + 1, maxDepth));
    }
    return info;
  }

  // src/plugin/handlers/compose.js
  async function handleCompose(_msg) {
    const sel = figma.currentPage.selection;
    if (sel.length === 0) {
      figma.ui.postMessage({ type: "SELECTION_DATA", nodes: [], empty: true });
      return;
    }
    let rootNodes = sel;
    if (sel.length === 1 && isTransparentWrapper(sel[0])) {
      rootNodes = sel[0].children;
    }
    const depth = rootNodes.length > 4 ? 4 : 6;
    const nodes = Array.from(rootNodes).slice(0, 20).map((n) => extractNodeFull(n, 0, depth));
    figma.ui.postMessage({ type: "SELECTION_DATA", nodes });
  }
  async function handleQuery(msg) {
    try {
      const fn = new Function("figma", "return (async () => { " + msg.code + " })()");
      const result = await fn(figma);
      figma.ui.postMessage({ type: "QUERY_RESULT", queryId: msg.queryId, result });
    } catch (err) {
      figma.ui.postMessage({ type: "QUERY_RESULT", queryId: msg.queryId, error: err.message });
    }
  }
  async function handleEval(msg) {
    try {
      const code = msg.data && msg.data.code || msg.code;
      const fn = new Function("figma", "return (async () => { " + code + " })()");
      await fn(figma);
      figma.notify("AI Design Sync Complete");
    } catch (err) {
      figma.notify("AI Error: " + err.message);
    }
  }
  function isTransparentWrapper(node) {
    if (!("children" in node) || !Array.isArray(node.children) || node.children.length === 0) return false;
    const hasVisualFill = "fills" in node && Array.isArray(node.fills) && node.fills.some((f) => f.visible !== false && f.type !== "IMAGE");
    const hasStroke = "strokes" in node && Array.isArray(node.strokes) && node.strokes.some((s) => s.visible !== false);
    const hasEffect = "effects" in node && Array.isArray(node.effects) && node.effects.some((e) => e.visible !== false);
    return !hasVisualFill && !hasStroke && !hasEffect;
  }

  // src/plugin/main.js
  figma.showUI(__html__, { width: 360, height: 720, themeColors: true });
  var NODE_OPS = /* @__PURE__ */ new Set(["CREATE_FRAME", "SET_TEXT", "SET_FILL", "MOVE", "DELETE", "CLONE", "SWAP_COMPONENT"]);
  figma.ui.onmessage = async (msg) => {
    if (msg.type === "GET_STORAGE" || msg.type === "SET_STORAGE" || msg.type === "DEL_STORAGE") return handleStorage(msg);
    if (msg.type === "RESIZE") return handleResize(msg);
    if (msg.type === "FIGMA_QUERY") return handleQuery(msg);
    if (msg.type === "EVAL") return handleEval(msg);
    if (NODE_OPS.has(msg.type)) return handleNodeOps(msg);
    if (msg.type === "IMPORT_ELEMENTS") return handleImportElements(msg);
    if (msg.type === "READ_SELECTION") return handleCompose(msg);
    if (msg.type === "IMPORT_VARIABLES") return handleImportVariables(msg);
    if (msg.type === "IMPORT_TEXT_STYLES") return handleImportTextStyles(msg);
  };
  figma.on("selectionchange", () => {
    const sel = figma.currentPage.selection;
    figma.ui.postMessage({
      type: "SELECTION_CHANGED",
      count: sel.length,
      nodes: sel.slice(0, 20).map((n) => ({
        id: n.id,
        name: n.name,
        type: n.type,
        width: "width" in n ? Math.round(n.width) : null,
        height: "height" in n ? Math.round(n.height) : null
      }))
    });
  });
})();
