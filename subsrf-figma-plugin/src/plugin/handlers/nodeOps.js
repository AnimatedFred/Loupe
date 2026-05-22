import { cssColorToRgb, createSolidFill } from '../utils/color.js';

export async function handleNodeOps(msg) {
  switch (msg.type) {
    case 'CREATE_FRAME': {
      const f = figma.createFrame();
      f.name = msg.name || 'Frame';
      f.x = msg.x !== undefined ? msg.x : figma.viewport.center.x;
      f.y = msg.y !== undefined ? msg.y : figma.viewport.center.y;
      if (msg.width && msg.height) f.resize(msg.width, msg.height);
      figma.currentPage.appendChild(f);
      figma.viewport.scrollAndZoomIntoView([f]);
      figma.notify(`Created frame "${f.name}"`);
      break;
    }
    case 'SET_TEXT': {
      const node = msg.nodeId ? figma.getNodeById(msg.nodeId) : figma.currentPage.selection[0];
      if (!node || node.type !== 'TEXT') { figma.notify('No text node found'); break; }
      await figma.loadFontAsync(node.fontName);
      node.characters = msg.text || '';
      figma.notify('Text updated');
      break;
    }
    case 'SET_FILL': {
      const node = msg.nodeId ? figma.getNodeById(msg.nodeId) : figma.currentPage.selection[0];
      if (!node || !('fills' in node)) { figma.notify('No fillable node found'); break; }
      node.fills = [{ type: 'SOLID', color: cssColorToRgb(msg.color || '#000000') }];
      figma.notify('Fill updated');
      break;
    }
    case 'MOVE': {
      const node = msg.nodeId ? figma.getNodeById(msg.nodeId) : figma.currentPage.selection[0];
      if (!node) { figma.notify('No node found'); break; }
      if (msg.x !== undefined) node.x = msg.x;
      if (msg.y !== undefined) node.y = msg.y;
      if (msg.width && msg.height) node.resize(msg.width, msg.height);
      break;
    }
    case 'DELETE': {
      const node = msg.nodeId ? figma.getNodeById(msg.nodeId) : figma.currentPage.selection[0];
      if (!node) { figma.notify('No node found'); break; }
      node.remove();
      figma.notify('Node deleted');
      break;
    }
    case 'CLONE': {
      const node = msg.nodeId ? figma.getNodeById(msg.nodeId) : figma.currentPage.selection[0];
      if (!node) { figma.notify('No node found'); break; }
      const clone = node.clone();
      if (msg.x !== undefined) clone.x = msg.x;
      if (msg.y !== undefined) clone.y = msg.y;
      figma.viewport.scrollAndZoomIntoView([clone]);
      figma.notify('Node cloned');
      break;
    }
    case 'SWAP_COMPONENT': {
      const node = msg.nodeId ? figma.getNodeById(msg.nodeId) : figma.currentPage.selection[0];
      if (!node || node.type !== 'INSTANCE') { figma.notify('No component instance selected'); break; }
      const component = await figma.importComponentByKeyAsync(msg.componentKey);
      node.swapComponent(component);
      figma.notify('Component swapped');
      break;
    }
  }
}
