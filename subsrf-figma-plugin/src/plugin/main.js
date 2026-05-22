import { handleStorage, handleResize } from './handlers/storage.js';
import { handleNodeOps } from './handlers/nodeOps.js';
import { handleImportElements } from './handlers/importElements.js';
import { handleCompose, handleQuery, handleEval } from './handlers/compose.js';

figma.showUI(__html__, { width: 360, height: 720, themeColors: true });

const NODE_OPS = new Set(['CREATE_FRAME', 'SET_TEXT', 'SET_FILL', 'MOVE', 'DELETE', 'CLONE', 'SWAP_COMPONENT']);

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'GET_STORAGE' || msg.type === 'SET_STORAGE' || msg.type === 'DEL_STORAGE') return handleStorage(msg);
  if (msg.type === 'RESIZE')          return handleResize(msg);
  if (msg.type === 'FIGMA_QUERY')     return handleQuery(msg);
  if (msg.type === 'EVAL')            return handleEval(msg);
  if (NODE_OPS.has(msg.type))         return handleNodeOps(msg);
  if (msg.type === 'IMPORT_ELEMENTS') return handleImportElements(msg);
  if (msg.type === 'READ_SELECTION')  return handleCompose(msg);
};

figma.on('selectionchange', () => {
  const sel = figma.currentPage.selection;
  figma.ui.postMessage({
    type: 'SELECTION_CHANGED',
    count: sel.length,
    nodes: sel.slice(0, 20).map(n => ({
      id: n.id, name: n.name, type: n.type,
      width:  'width'  in n ? Math.round(n.width)  : null,
      height: 'height' in n ? Math.round(n.height) : null,
    })),
  });
});
