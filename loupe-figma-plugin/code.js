// Loupe to Figma Bridge v1.0
figma.showUI(__html__, { width: 340, height: 500, themeColors: true });

figma.ui.onmessage = async (msg) => {
  // AI Eval Mode
  if (msg.type === 'EVAL') {
    try {
      // Create a safe context for evaluation
      const code = msg.data.code;
      const fn = new Function('figma', 'return (async () => { ' + code + ' })()');
      await fn(figma);
      figma.notify('AI Design Sync Complete');
    } catch (err) {
      console.error('AI Eval Error:', err);
      figma.notify('AI Error: ' + err.message);
    }
    return;
  }

  if (msg.type === 'IMPORT_ELEMENTS') {
    var elements = msg.elements || (msg.data && msg.data.elements) || [];
    var context = msg.context || (msg.data && msg.data.context) || {};
    
    if (!elements || elements.length === 0) {
      figma.notify('No elements found to sync');
      return;
    }

    // Find bounding box
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (var i = 0; i < elements.length; i++) {
      var el = elements[i];
      var r = el.rect || { left: 0, top: 0, width: 0, height: 0 };
      if (r.left < minX) minX = r.left;
      if (r.top < minY) minY = r.top;
      if (r.left + r.width > maxX) maxX = r.left + r.width;
      if (r.top + r.height > maxY) maxY = r.top + r.height;
    }

    var mainFrame = figma.createFrame();
    mainFrame.name = 'Loupe: ' + (context.title || 'UI Capture') + ' (' + new Date().toLocaleTimeString() + ')';
    mainFrame.x = figma.viewport.center.x - ((maxX - minX) / 2);
    mainFrame.y = figma.viewport.center.y - ((maxY - minY) / 2);
    mainFrame.resize(Math.max(200, maxX - minX), Math.max(200, maxY - minY));
    
    // Set background to pure white
    mainFrame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    
    console.log('Syncing ' + elements.length + ' elements with context:', context);

    await figma.loadFontAsync({ family: "Inter", style: "Regular" });
    await figma.loadFontAsync({ family: "Inter", style: "Bold" });

    // Sort elements by zIndex to preserve stacking order
    elements.sort(function(a, b) {
      var zA = parseInt(a.styles && a.styles.zIndex) || 0;
      var zB = parseInt(b.styles && b.styles.zIndex) || 0;
      return zA - zB;
    });

    for (var j = 0; j < elements.length; j++) {
      try {
        var elObj = elements[j];
        var styles = elObj.styles || {};
        var rect = elObj.rect || { left: 0, top: 0, width: 0, height: 0 };
        
        var container = figma.createFrame();
        container.name = (elObj.tagName || 'DIV') + (elObj.cls ? ' .' + elObj.cls : '');
        container.x = rect.left - minX;
        container.y = rect.top - minY;
        container.resize(Math.max(1, rect.width), Math.max(1, rect.height));

        // Opacity
        if (styles.opacity !== undefined) {
          container.opacity = parseFloat(styles.opacity);
        }

        // Background
        if (styles.backgroundColor && styles.backgroundColor !== 'transparent' && styles.backgroundColor !== 'rgba(0, 0, 0, 0)') {
          container.fills = [createSolidFill(styles.backgroundColor)];
        } else {
          container.fills = [];
        }

        // Border Radius
        if (styles.borderRadius) {
          var rVal = parseInt(styles.borderRadius);
          if (!isNaN(rVal)) container.cornerRadius = rVal;
        }

        // Clip Content (Overflow)
        if (styles.overflow === 'hidden') {
          container.clipsContent = true;
        }

        // Drop Shadows
        if (styles.boxShadow && styles.boxShadow !== 'none') {
          var shadow = parseShadow(styles.boxShadow);
          if (shadow) container.effects = [shadow];
        }

        // Borders (Individual side support)
        if (styles.borderTopWidth && parseInt(styles.borderTopWidth) > 0) {
          container.strokeTopWeight = parseInt(styles.borderTopWidth);
          container.strokes = [createSolidFill(styles.borderTopColor || '#000000')];
        }
        if (styles.borderRightWidth && parseInt(styles.borderRightWidth) > 0) {
          container.strokeRightWeight = parseInt(styles.borderRightWidth);
          container.strokes = [createSolidFill(styles.borderRightColor || '#000000')];
        }
        if (styles.borderBottomWidth && parseInt(styles.borderBottomWidth) > 0) {
          container.strokeBottomWeight = parseInt(styles.borderBottomWidth);
          container.strokes = [createSolidFill(styles.borderBottomColor || '#000000')];
        }
        if (styles.borderLeftWidth && parseInt(styles.borderLeftWidth) > 0) {
          container.strokeLeftWeight = parseInt(styles.borderLeftWidth);
          container.strokes = [createSolidFill(styles.borderLeftColor || '#000000')];
        }

        // Image Handling
        if (elObj.tagName.toLowerCase() === 'img' && elObj.attributes && elObj.attributes.src) {
          try {
            const image = await figma.createImageAsync(elObj.attributes.src);
            container.fills = [{ type: 'IMAGE', imageHash: image.hash, scaleMode: 'FILL' }];
          } catch (e) {
            console.warn('Image load failed', e);
          }
        }

        // Text Handling
        if (elObj.text && elObj.text.trim().length > 0) {
          var fontFamily = parseFontFamily(styles.fontFamily);
          var fontWeight = styles.fontWeight || '400';
          var fontName = await loadFont(fontFamily, fontWeight);
          
          var textNode = figma.createText();
          textNode.fontName = fontName;
          textNode.characters = elObj.text;
          
          var fs = parseInt(styles.fontSize) || 14;
          textNode.fontSize = Math.max(8, fs);
          
          if (styles.color) textNode.fills = [createSolidFill(styles.color)];
          
          // Line Height
          if (styles.lineHeight && styles.lineHeight !== 'normal') {
            var lh = parseInt(styles.lineHeight);
            if (!isNaN(lh)) textNode.lineHeight = { value: lh, unit: 'PIXELS' };
          }
          
          // Letter Spacing
          if (styles.letterSpacing && styles.letterSpacing !== 'normal') {
            var ls = parseFloat(styles.letterSpacing);
            if (!isNaN(ls)) textNode.letterSpacing = { value: ls, unit: 'PIXELS' };
          }

          // Alignment
          if (styles.textAlign === 'center') textNode.textAlignHorizontal = 'CENTER';
          else if (styles.textAlign === 'right') textNode.textAlignHorizontal = 'RIGHT';
          else textNode.textAlignHorizontal = 'LEFT';

          // Position text inside container
          if (rect.width < 300 && rect.height < 100) {
            textNode.x = (container.width - textNode.width) / 2;
            textNode.y = (container.height - textNode.height) / 2;
          } else {
            textNode.x = 0; textNode.y = 0;
            textNode.resize(container.width, container.height);
          }
          
          container.appendChild(textNode);
        }

        // Auto Layout (Flexbox)
        if (styles.display === 'flex') {
          container.layoutMode = styles.flexDirection === 'column' ? 'VERTICAL' : 'HORIZONTAL';
          container.itemSpacing = parseInt(styles.gap) || 0;
          
          container.paddingTop = parseInt(styles.paddingTop) || 0;
          container.paddingRight = parseInt(styles.paddingRight) || 0;
          container.paddingBottom = parseInt(styles.paddingBottom) || 0;
          container.paddingLeft = parseInt(styles.paddingLeft) || 0;

          // Alignment
          if (styles.justifyContent === 'center') container.primaryAxisAlignItems = 'CENTER';
          else if (styles.justifyContent === 'flex-end') container.primaryAxisAlignItems = 'MAX';
          else if (styles.justifyContent === 'space-between') container.primaryAxisAlignItems = 'SPACE_BETWEEN';
          else container.primaryAxisAlignItems = 'MIN';

          if (styles.alignItems === 'center') container.counterAxisAlignItems = 'CENTER';
          else if (styles.alignItems === 'flex-end') container.counterAxisAlignItems = 'MAX';
          else container.counterAxisAlignItems = 'MIN';
        }

        mainFrame.appendChild(container);
      } catch (err) {
        console.warn('Sync Error:', err);
      }
    }

    figma.viewport.scrollAndZoomIntoView([mainFrame]);
    figma.notify('Sync complete: ' + elements.length + ' UI components reconstructed.');
  }
};

function parseShadow(cssShadow) {
  // Simple parser for: "0px 4px 10px rgba(0,0,0,0.1)"
  var parts = cssShadow.split('px');
  if (parts.length < 3) return null;
  
  var x = parseFloat(parts[0]) || 0;
  var y = parseFloat(parts[1]) || 0;
  var blur = parseFloat(parts[2]) || 0;
  
  var colorMatch = cssShadow.match(/rgba?\(.*?\)|#[a-fA-F0-0]{3,6}/);
  var color = colorMatch ? parseRgb(colorMatch[0]) : {r:0, g:0, b:0, a:0.2};

  return {
    type: 'DROP_SHADOW',
    color: { r: color.r/255, g: color.g/255, b: color.b/255, a: color.a || 1 },
    offset: { x: x, y: y },
    radius: blur,
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
  if (w >= 800) return 'ExtraBold';
  if (w >= 700) return 'Bold';
  if (w >= 600) return 'SemiBold';
  if (w >= 500) return 'Medium';
  return 'Regular';
}

function parseFontFamily(cssFamily) {
  if (!cssFamily) return "Inter";
  var families = cssFamily.split(',');
  var first = families[0].replace(/['"]/g, '').trim();
  return first || "Inter";
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
