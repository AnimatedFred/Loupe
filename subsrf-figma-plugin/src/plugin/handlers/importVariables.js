export async function handleImportVariables(msg) {
  try {
    const data = msg.data; // { name, modes, variables }

    if (!figma.variables) {
      figma.ui.postMessage({ type: 'IMPORT_VARIABLES_RESULT', error: 'Variables API not available in this Figma plan.' });
      return;
    }

    const colorModes = data.modes || ['Default'];
    let created = 0, skipped = 0;

    const colorVars   = data.variables.filter(v => v.type === 'COLOR');
    const floatVars   = data.variables.filter(v => v.type === 'FLOAT');
    const stringVars  = data.variables.filter(v => v.type === 'STRING');
    const spacingVars = floatVars.filter(v => v.name.startsWith('space/'));
    const radiusVars  = floatVars.filter(v => v.name.startsWith('radius/'));
    const otherFloats = floatVars.filter(v => !v.name.startsWith('space/') && !v.name.startsWith('radius/'));

    function getOrCreateCollection(name, modes) {
      const existing = figma.variables.getLocalVariableCollections().find(c => c.name === name);
      if (existing) return existing;
      const col = figma.variables.createVariableCollection(name);
      col.renameMode(col.modes[0].modeId, modes[0]);
      for (let i = 1; i < modes.length; i++) {
        try { col.addMode(modes[i]); } catch (_) {}
      }
      return col;
    }

    function importVarsIntoCollection(vars, collection) {
      for (const v of vars) {
        try {
          const existing = figma.variables.getLocalVariables()
            .find(lv => lv.name === v.name && lv.variableCollectionId === collection.id);
          const figmaVar = existing || figma.variables.createVariable(v.name, collection, v.type);
          for (const [modeName, modeValue] of Object.entries(v.values)) {
            let mode = collection.modes.find(m => m.name === modeName);
            if (!mode) mode = collection.modes[0]; // fallback for free plan (1-mode limit)
            if (!mode) continue;
            figmaVar.setValueForMode(mode.modeId, modeValue);
          }
          created++;
        } catch (_) { skipped++; }
      }
    }

    if (colorVars.length > 0)  importVarsIntoCollection(colorVars,  getOrCreateCollection('Colors',  colorModes));
    if (spacingVars.length > 0) importVarsIntoCollection(spacingVars, getOrCreateCollection('Spacing', ['Default']));
    if (radiusVars.length > 0)  importVarsIntoCollection(radiusVars,  getOrCreateCollection('Radius',  ['Default']));
    if (otherFloats.length > 0 || stringVars.length > 0) {
      importVarsIntoCollection([...otherFloats, ...stringVars], getOrCreateCollection('Other', ['Default']));
    }

    figma.ui.postMessage({ type: 'IMPORT_VARIABLES_RESULT', created, skipped });
    figma.notify(`Variables imported: ${created} created${skipped ? `, ${skipped} skipped` : ''}`);
  } catch (err) {
    figma.ui.postMessage({ type: 'IMPORT_VARIABLES_RESULT', error: err.message });
  }
}
