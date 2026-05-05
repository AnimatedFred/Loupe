// Loupe Dashboard Logic v1.2 (Background Injection Protocol)
document.addEventListener('DOMContentLoaded', async () => {
  const tabs = document.querySelectorAll('.tab');
  const views = document.querySelectorAll('.view');

  // --- Tab Logic ---
  tabs.forEach(tab => {
    tab.onclick = () => {
      tabs.forEach(t => t.classList.remove('active'));
      views.forEach(v => v.classList.remove('active'));
      tab.classList.add('active');
      const targetView = document.getElementById('view-' + tab.dataset.view);
      if (targetView) targetView.classList.add('active');
    };
  });

  // --- Core Actions ---
  const btnClick = document.getElementById('btn-click');
  const btnArea = document.getElementById('btn-area');
  const btnFullPage = document.getElementById('btn-full-page');
  const btnScreenshot = document.getElementById('btn-screenshot');
  const btnSync = document.getElementById('btn-sync');
  const countText = document.getElementById('countText');

  btnClick.onclick = () => ensureAndExecute((id) => setMode(id, 'click'));
  btnArea.onclick = () => ensureAndExecute((id) => setMode(id, 'region'));
  
  btnFullPage.onclick = () => ensureAndExecute((id) => {
    chrome.tabs.sendMessage(id, { type: 'TRIGGER_FULL_PAGE' });
    setTimeout(() => window.close(), 100);
  });

  btnScreenshot.onclick = () => ensureAndExecute((id) => {
    setMode(id, 'screenshot');
    setTimeout(() => window.close(), 100);
  });

  btnSync.onclick = async () => {
    const stored = await chrome.storage.local.get(['selectedElements']);
    if (!stored.selectedElements || stored.selectedElements.length === 0) return;
    
    btnSync.innerText = 'Syncing...';
    btnSync.disabled = true;

    try {
      await fetch('https://web-production-9cce.up.railway.app/api/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'ELEMENTS_UPDATE',
          elements: stored.selectedElements
        })
      });
      btnSync.innerText = 'Success!';
      setTimeout(() => {
        btnSync.innerText = 'Push to Canvas';
        btnSync.disabled = false;
      }, 2000);
    } catch (e) {
      btnSync.innerText = 'Bridge Error';
      btnSync.disabled = false;
    }
  };

  /**
   * Robust Connection Logic
   * Ensures the content script is alive before sending messages.
   */
  async function ensureAndExecute(callback) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url || tab.url.startsWith('chrome://')) return;

    try {
      // Ping with a short timeout
      await Promise.race([
        chrome.tabs.sendMessage(tab.id, { type: 'PING' }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 250))
      ]);
      callback(tab.id);
    } catch (e) {
      console.log('[Loupe] Connection failed, attempting background injection...');
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['config.js', 'content.js']
        });
        await chrome.scripting.insertCSS({
          target: { tabId: tab.id },
          files: ['content.css']
        });
        // Success injection, give it a tiny breath then execute
        setTimeout(() => callback(tab.id), 150);
      } catch (err) {
        console.error('[Loupe] Script injection blocked by browser policy:', err);
        // If we can't inject, show a non-intrusive warning in the UI
        document.getElementById('connWarning')?.remove();
        const warning = document.createElement('div');
        warning.id = 'connWarning';
        warning.style.cssText = 'background: #fef2f2; color: #991b1b; padding: 10px; font-size: 11px; text-align: center; border-radius: 8px; margin-top: 10px;';
        warning.innerText = 'Cannot inject Loupe on this page (Browser Restriction).';
        document.getElementById('view-capture').prepend(warning);
      }
    }
  }

  function setMode(tabId, mode) {
    chrome.tabs.sendMessage(tabId, { type: 'SET_MODE', mode: mode }, (_response) => {
      if (chrome.runtime.lastError) {
        console.warn('[Loupe] Message delivery failed:', chrome.runtime.lastError.message);
      } else {
        btnClick.classList.toggle('active', mode === 'click');
        btnArea.classList.toggle('active', mode === 'region');
      }
    });
  }

  // --- Bridge Status ---
  async function checkBridge() {
    try {
      const res = await fetch('https://web-production-9cce.up.railway.app/api/state');
      if (res.ok) {
        const data = await res.json();
        const bridgeStatusText = document.getElementById('bridge-status-text');
        const bridgeDot = document.getElementById('bridge-dot');
        const bridgeBadge = document.getElementById('bridge-status-badge');
        const figmaStatusText = document.getElementById('figma-status-text');
        const figmaDot = document.getElementById('figma-dot');

        if (bridgeStatusText) {
          bridgeStatusText.innerText = 'ONLINE';
          bridgeStatusText.style.color = '#10B981';
          bridgeDot.classList.add('on');
          bridgeBadge.innerText = 'BRIDGE ONLINE';
          bridgeBadge.style.background = '#eef2ff';
          bridgeBadge.style.color = '#6366f1';
          
          if (data.figmaConnected) {
            figmaStatusText.innerText = 'CONNECTED';
            figmaStatusText.style.color = '#10B981';
            figmaDot.classList.add('on');
          } else {
            figmaStatusText.innerText = 'WAITING';
            figmaStatusText.style.color = '#64748B';
            figmaDot.classList.remove('on');
          }
        }
      }
    } catch (e) {
      const bridgeStatusText = document.getElementById('bridge-status-text');
      if (bridgeStatusText) {
        bridgeStatusText.innerText = 'OFFLINE';
        bridgeStatusText.style.color = '#64748B';
        document.getElementById('bridge-dot').classList.remove('on');
        document.getElementById('bridge-status-badge').innerText = 'BRIDGE OFFLINE';
        document.getElementById('bridge-status-badge').style.background = '#f1f5f9';
      }
    }
  }

  // --- UI Sync ---
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'ELEMENTS_UPDATE') {
      updateInventory(msg.elements);
      chrome.storage.local.set({ selectedElements: msg.elements });
    }
  });

  function updateInventory(elements) {
    if (countText) countText.innerText = `${elements.length} Elements`;
    const list = document.getElementById('elements-list');
    if (!list) return;
    
    if (elements.length === 0) {
      list.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--text-dim); font-size: 12px;">No elements selected</div>`;
      return;
    }

    list.innerHTML = elements.map((el, i) => `
      <div style="padding: 10px 16px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 10px;">
           <span style="font-family: 'IBM Plex Mono', monospace; font-size: 10px; background: #eef2ff; color: #6366f1; padding: 2px 6px; border-radius: 4px;">${i + 1}</span>
           <span style="font-weight: 700; font-size: 12px;">${el.tagName}</span>
        </div>
        <span style="font-size: 10px; color: var(--text-dim); max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${el.cls || 'No Class'}</span>
      </div>
    `).join('');
  }

  // Load existing state
  const stored = await chrome.storage.local.get(['selectedElements']);
  if (stored.selectedElements) {
    updateInventory(stored.selectedElements);
  }

  checkBridge();
  setInterval(checkBridge, 3000);

  // Attempt initial injection silently
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.url && !tab.url.startsWith('chrome://')) {
    chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['config.js', 'content.js'] }).catch(() => {});
  }
});
