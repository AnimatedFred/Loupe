function parseCssColor(css) {
  const rgb = css.match(/^rgb\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)$/);
  if (rgb) return { r: parseInt(rgb[1])/255, g: parseInt(rgb[2])/255, b: parseInt(rgb[3])/255, a: 1 };
  const rgba = css.match(/^rgba\(\s*(\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\s*\)$/);
  if (rgba) return { r: parseInt(rgba[1])/255, g: parseInt(rgba[2])/255, b: parseInt(rgba[3])/255, a: parseFloat(rgba[4]) };
  const hex = css.match(/^#([0-9a-fA-F]{3,8})$/);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
    if (h.length === 6) h += 'ff';
    return {
      r: parseInt(h.slice(0,2),16)/255, g: parseInt(h.slice(2,4),16)/255,
      b: parseInt(h.slice(4,6),16)/255, a: parseInt(h.slice(6,8),16)/255,
    };
  }
  return null;
}

function parsePx(val) {
  if (typeof val === 'number') return val;
  const m = String(val).match(/^([\d.]+)(?:px)?$/);
  return m ? parseFloat(m[1]) : null;
}

export async function handleImportTokenVars(msg) {
  const { category, tokens, collectionName } = msg;
  try {
    const existing = await figma.variables.getLocalVariableCollectionsAsync();
    let col = existing.find(c => c.name === collectionName);
    if (!col) col = figma.variables.createVariableCollection(collectionName);
    const modeId = col.modes[0].modeId;

    let created = 0;
    if (category === 'colors') {
      const localVars = await figma.variables.getLocalVariablesAsync('COLOR');
      for (const t of tokens) {
        const color = parseCssColor(t.value);
        if (!color) continue;
        const varName = t.name.replace(/^color\//, '');
        let variable = localVars.find(v => v.name === varName && v.variableCollectionId === col.id);
        if (!variable) variable = figma.variables.createVariable(varName, col, 'COLOR');
        variable.setValueForMode(modeId, color);
        created++;
      }
    } else {
      const localVars = await figma.variables.getLocalVariablesAsync('FLOAT');
      for (const t of tokens) {
        const num = parsePx(t.value);
        if (num === null) continue;
        const prefix = category === 'spacing' ? 'spacing/' : 'radius/';
        const varName = t.name.replace(new RegExp('^' + prefix), '');
        let variable = localVars.find(v => v.name === varName && v.variableCollectionId === col.id);
        if (!variable) variable = figma.variables.createVariable(varName, col, 'FLOAT');
        variable.setValueForMode(modeId, num);
        created++;
      }
    }
    figma.ui.postMessage({ type: 'IMPORT_TOKEN_VARS_DONE', category, count: created });
  } catch (e) {
    figma.ui.postMessage({ type: 'IMPORT_TOKEN_VARS_DONE', category, count: 0, error: e.message });
  }
}
