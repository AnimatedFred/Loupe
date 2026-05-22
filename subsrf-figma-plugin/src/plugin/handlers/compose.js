import { extractNodeFull } from '../utils/node.js';

export async function handleCompose(_msg) {
  const sel = figma.currentPage.selection;
  if (sel.length === 0) {
    figma.ui.postMessage({ type: 'SELECTION_DATA', nodes: [], empty: true });
    return;
  }

  // Unwrap transparent container nodes so AI sees the actual UI sections
  let rootNodes = sel;
  if (sel.length === 1 && isTransparentWrapper(sel[0])) {
    rootNodes = sel[0].children;
  }

  const depth = rootNodes.length > 4 ? 4 : 6;
  const nodes = Array.from(rootNodes).slice(0, 20).map(n => extractNodeFull(n, 0, depth));
  figma.ui.postMessage({ type: 'SELECTION_DATA', nodes });
}

export async function handleQuery(msg) {
  try {
    const fn = new Function('figma', 'return (async () => { ' + msg.code + ' })()');
    const result = await fn(figma);
    figma.ui.postMessage({ type: 'QUERY_RESULT', queryId: msg.queryId, result });
  } catch (err) {
    figma.ui.postMessage({ type: 'QUERY_RESULT', queryId: msg.queryId, error: err.message });
  }
}

export async function handleEval(msg) {
  try {
    const code = (msg.data && msg.data.code) || msg.code;
    const fn = new Function('figma', 'return (async () => { ' + code + ' })()');
    await fn(figma);
    figma.notify('AI Design Sync Complete');
  } catch (err) {
    figma.notify('AI Error: ' + err.message);
  }
}

function isTransparentWrapper(node) {
  if (!('children' in node) || !Array.isArray(node.children) || node.children.length === 0) return false;
  const hasVisualFill = 'fills' in node && Array.isArray(node.fills) &&
    node.fills.some(f => f.visible !== false && f.type !== 'IMAGE');
  const hasStroke = 'strokes' in node && Array.isArray(node.strokes) &&
    node.strokes.some(s => s.visible !== false);
  const hasEffect = 'effects' in node && Array.isArray(node.effects) &&
    node.effects.some(e => e.visible !== false);
  return !hasVisualFill && !hasStroke && !hasEffect;
}
