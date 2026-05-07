// Subsrf — Offscreen Capture Script
// Handles high-resolution canvas stitching and cropping incrementally

let stitchCanvas = null;
let stitchCtx = null;

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // Use a wrapper to allow async/await without breaking the port
  (async () => {
    try {
      if (msg.type === 'OFFSCREEN_READY') {
        sendResponse({ ok: true });
      } else if (msg.type === 'START_STITCH') {
        const { width, height, dpr } = msg;
        const actualDpr = dpr || window.devicePixelRatio || 1;
        stitchCanvas = document.getElementById('canvas');
        stitchCtx = stitchCanvas.getContext('2d', { willReadFrequently: true });
        
        stitchCanvas.width = width * actualDpr;
        stitchCanvas.height = height * actualDpr;
        stitchCtx.clearRect(0, 0, stitchCanvas.width, stitchCanvas.height);
        stitchCanvas._dpr = actualDpr;
        sendResponse({ ok: true });
      } else if (msg.type === 'ADD_SEGMENT') {
        const { dataUrl, x, y, w, h, sourceY } = msg;
        const dpr = stitchCanvas._dpr || 1;
        const img = await loadImage(dataUrl);
        stitchCtx.drawImage(
          img, 
          0, (sourceY || 0) * dpr, w * dpr, h * dpr, 
          x * dpr, y * dpr, w * dpr, h * dpr
        );
        sendResponse({ ok: true });
      } else if (msg.type === 'FINISH_STITCH') {
        const dataUrl = stitchCanvas.toDataURL('image/jpeg', 0.9);
        sendResponse({ dataUrl });
      } else if (msg.type === 'CROP_IMAGE') {
        const { dataUrl, rect, devicePixelRatio } = msg;
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        const img = await loadImage(dataUrl);
        const dpr = devicePixelRatio || window.devicePixelRatio || 1;
        
        tempCanvas.width = Math.round(rect.width * dpr);
        tempCanvas.height = Math.round(rect.height * dpr);
        
        tempCtx.drawImage(
          img,
          Math.round(rect.left * dpr), Math.round(rect.top * dpr), 
          Math.round(rect.width * dpr), Math.round(rect.height * dpr),
          0, 0, tempCanvas.width, tempCanvas.height
        );
        sendResponse({ dataUrl: tempCanvas.toDataURL('image/jpeg', 0.9) });
      }
    } catch (e) {
      console.error('[Offscreen] Error:', e);
      sendResponse({ error: e.message });
    }
  })();
  return true; // Keep port open
});

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(new Error('Failed to load image segment'));
    img.src = src;
  });
}
