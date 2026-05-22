export async function handleStorage(msg) {
  if (msg.type === 'GET_STORAGE') {
    try {
      const value = await figma.clientStorage.getAsync(msg.key);
      figma.ui.postMessage({ type: 'STORAGE_VALUE', key: msg.key, value });
    } catch (err) {
      figma.ui.postMessage({ type: 'STORAGE_VALUE', key: msg.key, value: null, error: err.message });
    }
  } else if (msg.type === 'SET_STORAGE') {
    try { await figma.clientStorage.setAsync(msg.key, msg.value); } catch (_) {}
  } else if (msg.type === 'DEL_STORAGE') {
    try { await figma.clientStorage.deleteAsync(msg.key); } catch (_) {}
  }
}

export function handleResize(msg) {
  figma.ui.resize(msg.width, msg.height);
}
