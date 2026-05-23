export async function handleListTextStyles() {
  try {
    const styles = await figma.getLocalTextStylesAsync();
    figma.ui.postMessage({
      type: 'TEXT_STYLES_LIST',
      styles: styles.map(s => ({
        id: s.id,
        name: s.name,
        fontFamily: s.fontName?.family || '',
        fontStyle: s.fontName?.style || '',
        fontSize: s.fontSize,
        lineHeight: s.lineHeight,
      })),
    });
  } catch (e) {
    figma.ui.postMessage({ type: 'TEXT_STYLES_LIST', styles: [], error: e.message });
  }
}

export async function handleImportTextStyles(msg) {
  try {
    const { styles } = msg;
    const existing = await figma.getLocalTextStylesAsync();
    let created = 0;
    for (const s of (styles || [])) {
      let style = existing.find(e => e.name === s.name);
      if (!style) { style = figma.createTextStyle(); style.name = s.name; }
      await figma.loadFontAsync({ family: s.fontFamily, style: s.fontStyle || 'Regular' });
      style.fontName = { family: s.fontFamily, style: s.fontStyle || 'Regular' };
      if (s.fontSize) style.fontSize = s.fontSize;
      if (s.lineHeight) style.lineHeight = s.lineHeight;
      created++;
    }
    figma.ui.postMessage({ type: 'IMPORT_TEXT_STYLES_DONE', count: created });
  } catch (e) {
    figma.ui.postMessage({ type: 'IMPORT_TEXT_STYLES_DONE', error: e.message });
  }
}
