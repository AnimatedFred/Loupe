// Subsrf — Background Service Worker v2
importScripts('config.js');
// Handles: Side panel, badge updates, and the local MCP bridge via HTTP

// One-time migration: carry forward any session stored under the old key
chrome.storage.local.get(['subsrf_session', 'loupe_session'], (data) => {
  if (!data.subsrf_session && data.loupe_session) {
    chrome.storage.local.set({ subsrf_session: data.loupe_session });
    chrome.storage.local.remove('loupe_session');
  }
});

let lastElements = [];
let lastContext = null;
let lastPrompt = "";


function safeSend(sendResponse, data) {
  try {
    sendResponse(data);
  } catch (e) {
    console.warn('[Subsrf] sendResponse failed (channel probably closed):', e.message);
  }
}

// ── Auth ──────────────────────────────────────────────────────────────────────

async function supabaseFetch(path, options = {}) {
  await SUBSRF_CONFIG.refresh();
  const url = `${SUBSRF_CONFIG.SUPABASE_URL}${path}`;
  const headers = {
    'apikey': SUBSRF_CONFIG.SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
    ...options.headers
  };
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) throw new Error(`Supabase ${path} → ${res.status}`);
  return res.json();
}

async function signIn() {
  await SUBSRF_CONFIG.refresh();
  const redirectUrl = `https://${chrome.runtime.id}.chromiumapp.org/`;
  const authUrl =
    `${SUBSRF_CONFIG.SUPABASE_URL}/auth/v1/authorize` +
    `?provider=google` +
    `&redirect_to=${encodeURIComponent(redirectUrl)}`;

  console.log('[Subsrf Auth] Extension ID:', chrome.runtime.id);
  console.log('[Subsrf Auth] Supabase URL:', SUBSRF_CONFIG.SUPABASE_URL);
  console.log('[Subsrf Auth] Full auth URL:', authUrl);

  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, async (redirected) => {
      if (chrome.runtime.lastError || !redirected) {
        const raw = chrome.runtime.lastError?.message || 'Auth cancelled';
        const isPageError = raw.toLowerCase().includes('authorization page');
        const msg = isPageError
          ? `OAuth redirect not registered in Supabase. Add this URL to Authentication → URL Configuration:\n${redirectUrl}`
          : raw;
        return reject(new Error(msg));
      }
      try {
        const params = new URLSearchParams(new URL(redirected).hash.slice(1));
        const accessToken  = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        if (!accessToken) return reject(new Error('No access token in redirect'));

        const user = await supabaseFetch('/auth/v1/user', {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        // Fetch tier + credits via Railway (service key bypasses RLS)
        let tier = 'free';
        let credits = 0;
        try {
          const balRes = await fetch('https://api.subsrf.dev/api/credits/balance', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          });
          if (balRes.ok) {
            const balData = await balRes.json();
            tier = balData.tier || 'free';
            credits = balData.balance ?? 0;
          }
        } catch (_) { /* profile may not exist yet — default to free/0 */ }

        const session = { accessToken, refreshToken, user, tier, credits, signedInAt: Date.now(), tierCheckedAt: Date.now() };
        await chrome.storage.local.set({ subsrf_session: session });
        console.log(`[Subsrf Auth] Signed in as ${user.email} (${tier})`);
        // Push tier to Railway so the Figma plugin sees it immediately
        notifyBridge();
        resolve(session);
      } catch (e) {
        reject(e);
      }
    });
  });
}

async function refreshSession() {
  const { subsrf_session } = await chrome.storage.local.get('subsrf_session');
  if (!subsrf_session?.refreshToken) return null;

  try {
    const data = await supabaseFetch('/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: subsrf_session.refreshToken })
    });
    const updated = {
      ...subsrf_session,
      accessToken:  data.access_token,
      refreshToken: data.refresh_token,
      signedInAt:   Date.now()
    };
    await chrome.storage.local.set({ subsrf_session: updated });
    return updated;
  } catch (e) {
    console.warn('[Subsrf Auth] Token refresh failed:', e.message);
    return null;
  }
}

async function fetchLiveProfile(session) {
  try {
    const res = await fetch('https://api.subsrf.dev/api/credits/balance', {
      headers: { 'Authorization': `Bearer ${session.accessToken}` }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return { tier: data.tier || 'free', credits: data.balance ?? 0 };
  } catch (e) {
    console.warn('[Subsrf Auth] Profile fetch failed:', e.message);
    return null;
  }
}

async function signOut() {
  const { subsrf_session } = await chrome.storage.local.get('subsrf_session');
  if (subsrf_session?.accessToken) {
    // Best-effort server-side revocation
    supabaseFetch('/auth/v1/logout', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${subsrf_session.accessToken}` }
    }).catch(() => {});
  }
  await chrome.storage.local.remove('subsrf_session');
  console.log('[Subsrf Auth] Signed out');
}

function jwtMsUntilExpiry(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return (payload.exp || 0) * 1000 - Date.now();
  } catch { return -1; }
}

async function getAuthState() {
  let { subsrf_session } = await chrome.storage.local.get('subsrf_session');
  if (!subsrf_session) return null;

  // Use the actual JWT exp claim — more reliable than signedInAt
  const msLeft = jwtMsUntilExpiry(subsrf_session.accessToken);
  if (msLeft < 5 * 60 * 1000) {
    const refreshed = await refreshSession();
    if (refreshed) {
      subsrf_session = refreshed;
    } else if (msLeft <= 0) {
      // Token is definitely expired and refresh failed — force re-login
      await chrome.storage.local.remove('subsrf_session');
      return null;
    }
    // Token is within 5 min of expiry but refresh failed — continue and hope
  }

  // Re-fetch profile (tier + credits) from Supabase if last checked more than 2 minutes ago
  const profileAge = Date.now() - (subsrf_session.tierCheckedAt || 0);
  if (profileAge > 2 * 60 * 1000 && subsrf_session.accessToken) {
    const liveProfile = await fetchLiveProfile(subsrf_session);
    if (liveProfile !== null) {
      const tierChanged = liveProfile.tier !== subsrf_session.tier;
      subsrf_session = {
        ...subsrf_session,
        tier: liveProfile.tier || 'free',
        credits: liveProfile.credits ?? 0,
        tierCheckedAt: Date.now()
      };
      await chrome.storage.local.set({ subsrf_session });
      console.log(`[Subsrf Auth] Profile refreshed: tier=${subsrf_session.tier} credits=${subsrf_session.credits}`);
      if (tierChanged) notifyBridge();
    }
  }

  return subsrf_session;
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
async function captureFullPage(tabId, watermark = false) {
  const dims = await sendTabMessage(tabId, { type: 'GET_PAGE_DIMENSIONS' });
  if (!dims) { console.error('[Subsrf] Could not get page dimensions'); return; }

  const { totalHeight, viewportHeight, viewportWidth, dpr, originalScrollY } = dims;

  // Hide Subsrf UI before starting
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
      chrome.storage.local.set({ lastCapture: result.dataUrl, lastCaptureTime: Date.now(), captureWatermark: watermark }, () => {
        chrome.tabs.create({ url: chrome.runtime.getURL('editor.html') });
      });
    }
  } catch (e) {
    console.error('[Subsrf] Full page capture failed:', e);
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

  chrome.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 80 }, (dataUrl) => {
    lastCaptureTime = Date.now();
    isCapturing = false;

    if (chrome.runtime.lastError) {
      console.error('[Subsrf Background] Capture Error:', chrome.runtime.lastError.message);
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
    await SUBSRF_CONFIG.refresh();
    // getAuthState() refreshes the JWT if it's near expiry — stale tokens cause
    // verifyToken on Railway to return null, which wipes elements and resets tier to 'free'
    const subsrf_session = await getAuthState();
    const headers = { 'Content-Type': 'application/json' };
    if (subsrf_session?.accessToken) {
      headers['Authorization'] = `Bearer ${subsrf_session.accessToken}`;
    }

    await fetch(SUBSRF_CONFIG.MCP_ENDPOINT, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        type: 'ELEMENTS_UPDATE',
        elements: lastElements,
        context: lastContext,
        prompt: lastPrompt,
        screenshot: lastScreenshot,
        version: SUBSRF_CONFIG.VERSION
      })
    });
    console.log('[Subsrf Background] Synced with MCP bridge at:', SUBSRF_CONFIG.MCP_ENDPOINT);
  } catch (e) {
    // Fail silently if bridge is down
    console.warn('[Subsrf Background] Bridge sync failed:', e.message);
  }
}

// --- Message Handlers ---
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  switch (msg.type) {

    case 'SIGN_IN': {
      chrome.storage.local.remove('subsrf_auth_error');
      signIn()
        .then(session => {
          console.log('[Subsrf Auth] Sign-in success:', session?.user?.email);
          safeSend(sendResponse, { ok: true, session });
        })
        .catch(err => {
          console.error('[Subsrf Auth] Sign-in error:', err.message);
          chrome.storage.local.set({ subsrf_auth_error: err.message });
          safeSend(sendResponse, { ok: false, error: err.message });
        });
      return true;
    }

    case 'SIGN_OUT': {
      signOut().then(() => safeSend(sendResponse, { ok: true }));
      return true;
    }

    case 'GET_AUTH_STATE': {
      getAuthState().then(session => safeSend(sendResponse, { ok: true, session }));
      return true;
    }

    case 'NOTIFY_BRIDGE': {
      // Fire-and-forget: pushes current session token to bridge so Railway's lastTier updates
      notifyBridge();
      break;
    }

    case 'PUSH_TO_FIGMA': {
      // Explicit push from Prompt Studio — reads elements from message, uses correct endpoint + auth
      (async () => {
        try {
          await SUBSRF_CONFIG.refresh();
          const subsrf_session = await getAuthState();
          const headers = { 'Content-Type': 'application/json' };
          if (subsrf_session?.accessToken) headers['Authorization'] = `Bearer ${subsrf_session.accessToken}`;

          const res = await fetch(SUBSRF_CONFIG.MCP_ENDPOINT, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              type: 'ELEMENTS_UPDATE',
              elements: msg.elements || [],
              context: msg.context || {},
              version: SUBSRF_CONFIG.VERSION
            })
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          safeSend(sendResponse, { ok: true });
        } catch (e) {
          console.error('[Subsrf] PUSH_TO_FIGMA failed:', e.message);
          safeSend(sendResponse, { ok: false, error: e.message });
        }
      })();
      return true;
    }
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

      if (msg.screenshot) {
        // Explicit screenshot provided (Screenshot/Full Page Capture) — use it directly
        lastScreenshot = msg.screenshot;
        notifyBridge();
      } else {
        // Auto-capture the visible viewport so AI Import works without a separate
        // screenshot step — selecting elements is the only action required
        throttleCapture((dataUrl) => {
          if (dataUrl) lastScreenshot = dataUrl;
          notifyBridge();
        });
      }

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
      safeSend(sendResponse, { ok: true });
      return true;
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
      console.log('[Subsrf Background] Request: CAPTURE_ANNOTATED_VIEW');
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
      console.log('[Subsrf Background] Initializing Region Capture...', msg.rect);
      (async () => {
        const session = await getAuthState();
        const watermark = !session?.tier || session.tier === 'free';
        throttleCapture((dataUrl) => {
          if (dataUrl) {
            chrome.storage.local.set({
              lastCapture: dataUrl,
              lastCaptureRect: msg.rect,
              lastCaptureViewportWidth: msg.viewportWidth,
              lastCaptureTime: Date.now(),
              captureWatermark: watermark
            }, () => {
               chrome.tabs.create({ url: chrome.runtime.getURL('editor.html') });
            });
          }
        });
      })();
      break;
    }

    case 'CAPTURE_ACCESSIBILITY_AUDIT': {
      console.log('[Subsrf Background] Initializing Accessibility Audit Capture...', msg.rect);
      (async () => {
        const session = await getAuthState();
        if (!session?.tier || session.tier === 'free') return;
        throttleCapture((dataUrl) => {
          if (dataUrl) {
            chrome.storage.local.set({
              lastCapture: dataUrl,
              lastCaptureRect: msg.rect,
              lastCaptureViewportWidth: msg.viewportWidth,
              lastCaptureTime: Date.now(),
              openAnalysisTab: { mode: 'accessibility', autoRun: true }
            }, () => {
              chrome.tabs.create({ url: chrome.runtime.getURL('editor.html') });
            });
          }
        });
      })();
      break;
    }

    case 'TRIGGER_FULL_PAGE_CAPTURE': {
      console.log('[Subsrf Background] Initializing Full Page Scroll Capture...');
      const tabId = sender.tab?.id;
      if (!tabId) break;
      (async () => {
        const session = await getAuthState();
        const watermark = !session?.tier || session.tier === 'free';
        captureFullPage(tabId, watermark).catch(e => console.error('[Subsrf] captureFullPage error:', e));
      })();
      break;
    }
  }
  return false; // Synchronous response (or no response)
});


// Keep service worker alive while a content script holds a port open
chrome.runtime.onConnect.addListener((port) => {
  port.onMessage.addListener((msg) => {
    if (msg.type === 'OPEN_PROMPT_PAGE') {
      chrome.tabs.create({ url: chrome.runtime.getURL('prompt.html') });
    }
  });
});

// ── Tier heartbeat ────────────────────────────────────────────────────────────
// Pushes the auth token to /api/auth/sync every minute so the Figma plugin
// always sees the correct tier even after a Railway restart.
async function syncTierToBridge() {
  try {
    const subsrf_session = await getAuthState();
    if (!subsrf_session?.accessToken) return;
    await fetch('https://api.subsrf.dev/api/auth/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${subsrf_session.accessToken}`
      }
    });
  } catch (e) { /* fail silently */ }
}

chrome.alarms.create('bridgeHeartbeat', { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'bridgeHeartbeat') syncTierToBridge();
});


// Sync immediately whenever the service worker activates
syncTierToBridge();

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
