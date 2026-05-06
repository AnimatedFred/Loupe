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

  let currentTier = 'free';

  function renderSyncButton(isPro) {
    if (isPro) {
      btnSync.textContent = 'Sync with Figma';
      btnSync.className   = 'btn btn-primary';
      btnSync.style.cssText = '';
    } else {
      btnSync.textContent = '🔒 Sync with Figma — Pro';
      btnSync.className   = 'btn';
      btnSync.style.cssText = 'background: var(--bg2); color: var(--text-dim); border: 1px solid var(--border); cursor: pointer;';
    }
  }

  btnSync.onclick = async () => {
    if (currentTier !== 'pro') {
      // Switch to Account tab so user can upgrade
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      document.querySelector('[data-view="account"]').classList.add('active');
      document.getElementById('view-account').classList.add('active');
      return;
    }

    const stored = await chrome.storage.local.get(['selectedElements', 'loupe_session']);
    if (!stored.selectedElements || stored.selectedElements.length === 0) return;

    btnSync.innerText = 'Syncing...';
    btnSync.disabled = true;

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (stored.loupe_session?.accessToken) {
        headers['Authorization'] = `Bearer ${stored.loupe_session.accessToken}`;
      }
      await fetch('https://web-production-9cce.up.railway.app/api/update', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          type: 'ELEMENTS_UPDATE',
          elements: stored.selectedElements
        })
      });
      btnSync.innerText = 'Success!';
      setTimeout(() => {
        btnSync.innerText = 'Sync with Figma';
        btnSync.disabled = false;
      }, 2000);
    } catch (e) {
      btnSync.innerText = 'Bridge Error';
      btnSync.disabled = false;
    }
  };

  // ── Auth ──────────────────────────────────────────────────────────────────

  const authSignedOut  = document.getElementById('auth-signed-out');
  const authSignedIn   = document.getElementById('auth-signed-in');
  const authName       = document.getElementById('auth-name');
  const authEmail      = document.getElementById('auth-email');
  const authAvatar     = document.getElementById('auth-avatar');
  const authTierBadge  = document.getElementById('auth-tier-badge');
  const btnSignIn      = document.getElementById('btn-sign-in');
  const btnSignOut     = document.getElementById('btn-sign-out');

  const mcpConfig = {
    mcpServers: {
      loupe: {
        command: 'npx',
        args: ['-y', 'loupe-intelligence', '--endpoint', 'https://web-production-9cce.up.railway.app']
      }
    }
  };
  const mcpConfigBlock = document.getElementById('mcp-config-block');
  if (mcpConfigBlock) mcpConfigBlock.textContent = JSON.stringify(mcpConfig, null, 2);

  function renderMcpTab(isPro) {
    document.getElementById('mcp-loading').style.display = 'none';
    document.getElementById('mcp-pro').style.display    = isPro ? '' : 'none';
    document.getElementById('mcp-locked').style.display = isPro ? 'none' : '';
  }

  function renderAuthState(session) {
    if (!session) {
      authSignedOut.style.display = '';
      authSignedIn.style.display  = 'none';
      currentTier = 'free';
      renderSyncButton(false);
      renderMcpTab(false);
      return;
    }
    authSignedOut.style.display = 'none';
    authSignedIn.style.display  = '';

    const user = session.user || {};
    const meta = user.user_metadata || {};
    authName.textContent  = meta.full_name || meta.name || user.email || '—';
    authEmail.textContent = user.email || '—';

    if (meta.avatar_url || meta.picture) {
      authAvatar.src = meta.avatar_url || meta.picture;
      authAvatar.style.display = '';
    }

    const isPro = (session.tier || 'free').toLowerCase() === 'pro';
    currentTier = isPro ? 'pro' : 'free';
    authTierBadge.textContent = isPro ? '⚡ PRO' : 'FREE';
    authTierBadge.className   = 'tier-badge ' + (isPro ? 'tier-pro' : 'tier-free');
    renderSyncButton(isPro);

    // Account tab feature rows
    const mcpStatus = document.getElementById('acct-mcp-status');
    if (mcpStatus) {
      mcpStatus.textContent   = isPro ? 'Active' : 'Locked';
      mcpStatus.style.color   = isPro ? 'var(--success)' : 'var(--danger)';
    }
    const upgradeCta = document.getElementById('acct-upgrade-cta');
    if (upgradeCta) upgradeCta.style.display = isPro ? 'none' : '';

    renderMcpTab(isPro);
  }

  async function loadAuthState() {
    const { loupe_session } = await chrome.storage.local.get('loupe_session');
    renderAuthState(loupe_session || null);
    if (!loupe_session?.accessToken) return;

    // Fetch live tier directly from Supabase so stale cached tier is always corrected
    try {
      await LOUPE_CONFIG.refresh();
      const res = await fetch(
        `${LOUPE_CONFIG.SUPABASE_URL}/rest/v1/profiles?select=tier&id=eq.${loupe_session.user.id}`,
        {
          headers: {
            'apikey': LOUPE_CONFIG.SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${loupe_session.accessToken}`,
            'Accept': 'application/json'
          }
        }
      );
      if (res.ok) {
        const profiles = await res.json();
        const liveTier = profiles[0]?.tier || 'free';
        if (liveTier !== loupe_session.tier) {
          const updated = { ...loupe_session, tier: liveTier, tierCheckedAt: Date.now() };
          await chrome.storage.local.set({ loupe_session: updated });
          renderAuthState(updated);
        }
        // Tell the bridge about the current tier so the Figma plugin stays in sync
        chrome.runtime.sendMessage({ type: 'NOTIFY_BRIDGE' }, () => void chrome.runtime.lastError);
      }
    } catch (_) { /* fail silently — use cached tier */ }
  }

  // React to session changes written by background.js (sign-in / token refresh)
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;

    if ('loupe_session' in changes) {
      const session = changes.loupe_session.newValue || null;
      renderAuthState(session);
      if (!session) {
        btnSignIn.textContent = 'Sign in with Google';
        btnSignIn.disabled = false;
      }
    }

    if ('loupe_auth_error' in changes) {
      const msg = changes.loupe_auth_error.newValue;
      if (msg) {
        btnSignIn.textContent = 'Sign in with Google';
        btnSignIn.disabled = false;
        const errEl = document.getElementById('auth-error');
        if (errEl) { errEl.textContent = msg; errEl.style.display = ''; }
        console.error('[Loupe Auth]', msg);
      }
    }
  });

  loadAuthState();

  // MCP copy button
  document.getElementById('btn-copy-mcp')?.addEventListener('click', () => {
    const btn = document.getElementById('btn-copy-mcp');
    navigator.clipboard.writeText(JSON.stringify(mcpConfig, null, 2)).then(() => {
      btn.textContent = '✓ Copied!';
      setTimeout(() => { btn.textContent = 'Copy Config'; }, 2000);
    });
  });

  // Upgrade buttons → open web dashboard
  ['btn-upgrade-mcp', 'btn-upgrade-account'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://web-production-9cce.up.railway.app/#pricing' });
    });
  });

  btnSignIn.onclick = () => {
    btnSignIn.textContent = 'Signing in…';
    btnSignIn.disabled = true;
    // Fire-and-forget — result arrives via storage.onChanged above
    chrome.runtime.sendMessage({ type: 'SIGN_IN' }, () => {
      void chrome.runtime.lastError; // suppress unchecked-error warning
    });
  };

  btnSignOut.onclick = async () => {
    // Clear locally first so UI is instant
    await chrome.storage.local.remove('loupe_session');
    renderAuthState(null);
    chrome.runtime.sendMessage({ type: 'SIGN_OUT' }, () => {
      void chrome.runtime.lastError;
    });
  };

  /**
   * Robust Connection Logic
   * Ensures the content script is alive before sending messages.
   */
  async function ensureAndExecute(callback) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) return;
    const restricted = ['chrome://', 'chrome-extension://', 'about:', 'data:', 'file://'];
    if (restricted.some(p => tab.url.startsWith(p))) return;

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

  // Attempt initial injection silently — skip restricted/error pages
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const restricted = ['chrome://', 'chrome-extension://', 'about:', 'data:', 'file://'];
  if (tab?.url && !restricted.some(p => tab.url.startsWith(p))) {
    chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['config.js', 'content.js'] }).catch(() => {});
  }
});
