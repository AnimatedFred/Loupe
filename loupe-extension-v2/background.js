// Loupe — Background Service Worker v2
importScripts('config.js');
// Handles: Side panel, badge updates, and the local MCP bridge via HTTP

let lastElements = [];
let lastContext = null;
let lastPrompt = "";


function safeSend(sendResponse, data) {
  try {
    sendResponse(data);
  } catch (e) {
    console.warn('[Loupe] sendResponse failed (channel probably closed):', e.message);
  }
}


let lastScreenshot = null;
let lastCaptureTime = 0;
const CAPTURE_COOLDOWN = 800; // ms
let isCapturing = false;
const captureQueue = [];

// --- Helpers ---

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// Promisified tab message — resolves null on error instead of rejecting
function sendTabMessage(tabId, msg) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, msg, (response) => {
      if (chrome.runtime.lastError) resolve(null);
      else resolve(response);
    });
  });
}

// Direct capture (bypasses throttle queue, used inside the scroll loop)
function captureTabDirect() {
  return new Promise((resolve, reject) => {
    chrome.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 90 }, (dataUrl) => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve(dataUrl);
    });
  });
}

// Send a message to the offscreen document (and any other extension contexts)
function sendOffscreenMessage(msg) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, (response) => {
      if (chrome.runtime.lastError) resolve(null);
      else resolve(response);
    });
  });
}

// Create the offscreen document if it doesn't already exist
async function ensureOffscreen() {
  if (chrome.runtime.getContexts) {
    const contexts = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] }).catch(() => []);
    if (contexts.length > 0) return;
  }
  await chrome.offscreen.createDocument({
    url: chrome.runtime.getURL('offscreen/offscreen.html'),
    reasons: ['BLOBS'],
    justification: 'Canvas stitching for full-page screenshots'
  }).catch(() => {}); // Ignore "already exists" error
}

// Full-page scroll-and-stitch capture
async function captureFullPage(tabId) {
  const dims = await sendTabMessage(tabId, { type: 'GET_PAGE_DIMENSIONS' });
  if (!dims) { console.error('[Loupe] Could not get page dimensions'); return; }

  const { totalHeight, viewportHeight, viewportWidth, dpr, originalScrollY } = dims;

  // Hide Loupe UI before starting
  await sendTabMessage(tabId, { type: 'HIDE_UI' });
  await sleep(200);

  try {
    await ensureOffscreen();
    await sleep(200); // Let offscreen document scripts finish initializing
    await sendOffscreenMessage({ type: 'START_STITCH', width: viewportWidth, height: totalHeight, dpr });

    let scrollY = 0;
    while (scrollY < totalHeight) {
      await sendTabMessage(tabId, { type: 'SCROLL_TO', y: scrollY });
      await sleep(600); // Chrome allows ~2 captureVisibleTab calls/sec; 600ms keeps us safely under

      let dataUrl = await captureTabDirect().catch(() => null);
      if (!dataUrl) {
        // One retry after a short pause in case of a transient rate-limit
        await sleep(800);
        dataUrl = await captureTabDirect().catch(() => null);
      }
      if (!dataUrl) break;

      const segH = Math.min(viewportHeight, totalHeight - scrollY);
      await sendOffscreenMessage({ type: 'ADD_SEGMENT', dataUrl, x: 0, y: scrollY, w: viewportWidth, h: segH, sourceY: 0 });

      scrollY += viewportHeight;
    }

    const result = await sendOffscreenMessage({ type: 'FINISH_STITCH' });

    // Restore original scroll position and UI
    await sendTabMessage(tabId, { type: 'SCROLL_TO', y: originalScrollY });
    await sendTabMessage(tabId, { type: 'SHOW_UI' });

    if (result?.dataUrl) {
      chrome.storage.local.set({ lastCapture: result.dataUrl, lastCaptureTime: Date.now() }, () => {
        chrome.tabs.create({ url: chrome.runtime.getURL('editor.html') });
      });
    }
  } catch (e) {
    console.error('[Loupe] Full page capture failed:', e);
    await sendTabMessage(tabId, { type: 'SCROLL_TO', y: originalScrollY });
    await sendTabMessage(tabId, { type: 'SHOW_UI' });
  }
}

function throttleCapture(callback) {
  captureQueue.push(callback);
  processQueue();
}

async function processQueue() {
  if (isCapturing || captureQueue.length === 0) return;
  
  isCapturing = true;
  const callback = captureQueue.shift();

  const now = Date.now();
  const wait = Math.max(0, CAPTURE_COOLDOWN - (now - lastCaptureTime));
  
  if (wait > 0) {
    await new Promise(r => setTimeout(r, wait));
  }

  chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
    lastCaptureTime = Date.now();
    isCapturing = false;
    
    if (chrome.runtime.lastError) {
      console.error('[Loupe Background] Capture Error:', chrome.runtime.lastError.message);
      callback(null);
    } else {
      callback(dataUrl);
    }
    
    // Process next in line
    setTimeout(processQueue, 100);
  });
}

async function notifyBridge() {
  try {
    await LOUPE_CONFIG.refresh();
    const headers = { 'Content-Type': 'application/json' };
    if (LOUPE_CONFIG.MCP_TOKEN) {
      headers['Authorization'] = `Bearer ${LOUPE_CONFIG.MCP_TOKEN}`;
    }

    await fetch(LOUPE_CONFIG.MCP_ENDPOINT, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        type: 'ELEMENTS_UPDATE',
        elements: lastElements,
        context: lastContext,
        prompt: lastPrompt,
        screenshot: lastScreenshot,
        version: LOUPE_CONFIG.VERSION
      })
    });
    console.log('[Loupe Background] Synced with MCP bridge at:', LOUPE_CONFIG.MCP_ENDPOINT);
  } catch (e) {
    // Fail silently if bridge is down
    console.warn('[Loupe Background] Bridge sync failed:', e.message);
  }
}

// --- Message Handlers ---
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  switch (msg.type) {
    case 'SELECTION_UPDATED': {
      const count = msg.count;
      chrome.action.setBadgeText({
        text: count > 0 ? String(count) : '',
        tabId: sender.tab?.id
      });
      chrome.action.setBadgeBackgroundColor({ color: '#ff6b35' });
      break;
    }

    case 'ELEMENTS_UPDATE': {
      lastElements = msg.elements || [];
      lastPrompt = msg.prompt || "";
      lastScreenshot = msg.screenshot || lastScreenshot;
      lastContext = {
        url: sender.tab?.url,
        title: sender.tab?.title,
        viewport: msg.context?.viewport || {}
      };

      // Update extension badge so the count is always visible
      chrome.action.setBadgeText({
        text: lastElements.length > 0 ? String(lastElements.length) : '',
        tabId: sender.tab?.id
      });
      chrome.action.setBadgeBackgroundColor({ color: '#6366f1' });

      // Persist so the popup and prompt page can read current state when they open
      chrome.storage.local.set({ selectedElements: lastElements, lastPageContext: lastContext });

      notifyBridge();

      // Broadcast to sidebar/popup
      chrome.runtime.sendMessage(msg).catch(() => {});
      break;
    }

    case 'OPEN_EDITOR': {
      chrome.tabs.create({ url: chrome.runtime.getURL('editor.html') });
      break;
    }

    case 'OPEN_PROMPT_PAGE': {
      chrome.tabs.create({ url: chrome.runtime.getURL('prompt.html') });
      break;
    }

    case 'OPEN_SIDEBAR': {
      if (sender.tab?.id) {
        chrome.sidePanel.open({ tabId: sender.tab.id });
      }
      break;
    }

    case 'LICENSE_UPDATED': {
      chrome.runtime.sendMessage(msg).catch(() => {});
      break;
    }

    case 'CAPTURE_ANNOTATED_VIEW': {
      console.log('[Loupe Background] Request: CAPTURE_ANNOTATED_VIEW');
      throttleCapture((dataUrl) => {
        if (!dataUrl) {
          sendResponse({ error: 'Capture failed or throttled' });
        } else {
          chrome.storage.local.set({ 
            lastCapture: dataUrl,
            lastCaptureTime: Date.now()
          }, () => {
            sendResponse({ success: true, url: dataUrl });
          });
        }
      });
      return true; // Asynchronous response
    }

    case 'CAPTURE_REGION': {
      console.log('[Loupe Background] Initializing Region Capture...', msg.rect);
      throttleCapture((dataUrl) => {
        if (dataUrl) {
          chrome.storage.local.set({
            lastCapture: dataUrl,
            lastCaptureRect: msg.rect,
            lastCaptureViewportWidth: msg.viewportWidth,
            lastCaptureTime: Date.now()
          }, () => {
             chrome.tabs.create({ url: chrome.runtime.getURL('editor.html') });
          });
        }
      });
      break;
    }

    case 'TRIGGER_FULL_PAGE_CAPTURE': {
      console.log('[Loupe Background] Initializing Full Page Scroll Capture...');
      const tabId = sender.tab?.id;
      if (tabId) captureFullPage(tabId).catch(e => console.error('[Loupe] captureFullPage error:', e));
      break;
    }
  }
  return false; // Synchronous response (or no response)
});


// Clear badge and stored selection when the user navigates to an external page
// Exclude chrome-extension:// URLs so opening editor.html doesn't wipe the selection
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading' && tab.url && !tab.url.startsWith('chrome-extension://')) {
    chrome.action.setBadgeText({ text: '', tabId });
    chrome.storage.local.remove(['selectedElements']);
  }
});

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});
