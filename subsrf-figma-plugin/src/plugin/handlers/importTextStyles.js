export async function handleImportTextStyles(msg) {
  try {
    const styles = msg.styles;
    let created = 0, skipped = 0;
    const resolvedFonts = {}; // originalKey → { family, style } (cached after fallback)

    for (const s of styles) {
      const fontKey = `${s.fontFamily}::${s.fontStyle || 'Regular'}`;
      try {
        let resolved = resolvedFonts[fontKey];
        if (!resolved) {
          try {
            await figma.loadFontAsync({ family: s.fontFamily, style: s.fontStyle || 'Regular' });
            resolved = { family: s.fontFamily, style: s.fontStyle || 'Regular' };
          } catch (_) {
            // Font not in Figma's library — fall back to Inter so the style still gets created
            await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
            resolved = { family: 'Inter', style: 'Regular' };
          }
          resolvedFonts[fontKey] = resolved;
        }
        const existing = figma.getLocalTextStyles().find(ts => ts.name === s.name);
        const textStyle = existing || figma.createTextStyle();
        textStyle.name     = s.name;
        textStyle.fontName = resolved;
        textStyle.fontSize = s.fontSize;
        created++;
      } catch (_) { skipped++; }
    }

    figma.ui.postMessage({ type: 'IMPORT_TEXT_STYLES_RESULT', created, skipped });
    figma.notify(`Text styles: ${created} created${skipped ? `, ${skipped} skipped` : ''}`);
  } catch (err) {
    figma.ui.postMessage({ type: 'IMPORT_TEXT_STYLES_RESULT', error: err.message });
  }
}
