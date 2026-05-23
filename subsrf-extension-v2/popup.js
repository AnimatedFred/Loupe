// Subsrf Dashboard Logic v1.2 (Background Injection Protocol)
const SUPABASE_URL      = 'https://yzrtbovsxnlaivkofvul.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6cnRib3ZzeG5sYWl2a29mdnVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMTc1MTksImV4cCI6MjA5MzU5MzUxOX0.pvke4PggpSZXIWR1CdJkL7Q-0008k8b03qNYA0L4HDk';

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
  const countText = document.getElementById('countText');
  let currentSession = null;

  btnClick.onclick = () => ensureAndExecute((id) => setMode(id, 'click'));
  btnArea.onclick = () => ensureAndExecute((id) => setMode(id, 'region'));

btnFullPage.onclick = () => {
    ensureAndExecute((id) => {
      chrome.tabs.sendMessage(id, { type: 'TRIGGER_FULL_PAGE' });
      setTimeout(() => window.close(), 100);
    });
  };

  btnScreenshot.onclick = () => {
    ensureAndExecute((id) => {
      setMode(id, 'screenshot');
      setTimeout(() => window.close(), 100);
    });
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

  function buildMcpConfig(pat) {
    const base = { command: 'npx', args: ['-y', 'subsrf-intelligence', '--endpoint', 'https://api.subsrf.dev'] };
    if (pat) base.env = { FIGMA_PAT: pat };
    return { mcpServers: { subsrf: base } };
  }

  let mcpConfig = buildMcpConfig(null);
  const mcpConfigBlock = document.getElementById('mcp-config-block');
  if (mcpConfigBlock) mcpConfigBlock.textContent = JSON.stringify(mcpConfig, null, 2);

  function renderMcpTab(isPro) {
    document.getElementById('mcp-loading').style.display = 'none';
    document.getElementById('mcp-pro').style.display    = isPro ? '' : 'none';
    document.getElementById('mcp-locked').style.display = isPro ? 'none' : '';
  }

  function renderAuthState(session) {
    currentSession = session;
    if (!session) {
      authSignedOut.style.display = '';
      authSignedIn.style.display  = 'none';
      renderMcpTab(false);
      document.getElementById('popup-drop-zone')?.classList.add('locked');
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

    const tier   = (session.tier || 'free').toLowerCase();
    const isPro  = tier === 'pro';
    const isPaid = tier === 'starter' || tier === 'pro';
    authTierBadge.textContent = isPro ? '⚡ PRO' : tier === 'starter' ? '✦ STARTER' : 'FREE';
    authTierBadge.className   = 'tier-badge ' + (isPaid ? 'tier-pro' : 'tier-free');

    const creditsEl = document.getElementById('acct-credits');
    const headerCreditsEl = document.getElementById('header-credits');
    const creditsStrip = document.getElementById('credits-strip');
    if (creditsEl) {
      const credits = session.credits ?? 0;
      const limit   = isPro ? 300 : tier === 'starter' ? 75 : 0;
      if (!isPaid) {
        creditsEl.textContent = '0 — Free tier';
        creditsEl.style.color = 'var(--t3)';
        if (creditsStrip) creditsStrip.style.display = 'none';
      } else {
        creditsEl.textContent = `${credits} / ${limit}`;
        creditsEl.style.color = credits === 0 ? 'var(--danger)' : credits <= 10 ? 'var(--warn)' : 'var(--success)';
        if (headerCreditsEl) {
          headerCreditsEl.textContent = `${credits} / ${limit}`;
          headerCreditsEl.style.color = credits === 0 ? 'var(--err)' : credits <= 10 ? 'var(--warn)' : 'var(--acid)';
        }
        if (creditsStrip) creditsStrip.style.display = 'flex';
      }
    }

    // Update REST token button label and rebuild MCP config with stored PAT (if any)
    chrome.storage.local.get([`figma_pat_${user.id}`], (stored) => {
      const pat = stored[`figma_pat_${user.id}`] || null;
      const btnShowRest = document.getElementById('btn-show-rest-input');
      if (btnShowRest) btnShowRest.innerText = pat ? 'Update Token' : 'Configure Token';
      mcpConfig = buildMcpConfig(pat);
      const block = document.getElementById('mcp-config-block');
      if (block) block.textContent = JSON.stringify(mcpConfig, null, 2);
    });

    // Account tab feature rows
    const mcpStatus = document.getElementById('acct-mcp-status');
    if (mcpStatus) {
      mcpStatus.textContent   = isPro ? 'Active' : 'Locked';
      mcpStatus.style.color   = isPro ? 'var(--success)' : 'var(--danger)';
    }
    const upgradeCta = document.getElementById('acct-upgrade-cta');
    if (upgradeCta) upgradeCta.style.display = isPaid ? 'none' : '';

    document.getElementById('popup-drop-zone')?.classList.toggle('locked', !isPaid);

    const figmaSyncEl = document.getElementById('acct-figma-sync');
    if (figmaSyncEl) {
      figmaSyncEl.textContent = isPaid ? 'Unlimited' : '5 elements (Free)';
      figmaSyncEl.style.color = isPaid ? 'var(--success)' : 'var(--t3)';
    }

    renderMcpTab(isPro);
  }

  async function loadAuthState() {
    const { subsrf_session } = await chrome.storage.local.get('subsrf_session');
    renderAuthState(subsrf_session || null);
    if (!subsrf_session?.accessToken) return;

    // Fetch live tier + credits via Railway (service key bypasses RLS)
    try {
      const res = await fetch('https://api.subsrf.dev/api/credits/balance', {
        headers: { 'Authorization': `Bearer ${subsrf_session.accessToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        const liveTier    = data.tier    || 'free';
        const liveCredits = data.balance ?? 0;
        // Always update — credits change after every AI operation
        const updated = { ...subsrf_session, tier: liveTier, credits: liveCredits, tierCheckedAt: Date.now() };
        await chrome.storage.local.set({ subsrf_session: updated });
        renderAuthState(updated);
        // Tell the bridge about the current tier so the Figma plugin stays in sync
        chrome.runtime.sendMessage({ type: 'NOTIFY_BRIDGE' }, () => void chrome.runtime.lastError);
      }
    } catch (_) { /* fail silently — use cached tier */ }
  }

  // React to session changes written by background.js (sign-in / token refresh)
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;

    if ('subsrf_session' in changes) {
      const session = changes.subsrf_session.newValue || null;
      renderAuthState(session);
      if (!session) {
        btnSignIn.textContent = 'Sign in with Google';
        btnSignIn.disabled = false;
      }
    }

    if ('subsrf_auth_error' in changes) {
      const msg = changes.subsrf_auth_error.newValue;
      if (msg) {
        btnSignIn.textContent = 'Sign in with Google';
        btnSignIn.disabled = false;
        const errEl = document.getElementById('auth-error');
        if (errEl) { errEl.textContent = msg; errEl.style.display = ''; }
        console.error('[Subsrf Auth]', msg);
      }
    }
  });

  loadAuthState();

  // ── Scan FAB toggle ───────────────────────────────────────────────────────
  function applyFabToggle(enabled) {
    const checkbox = document.getElementById('fab-toggle');
    const track = document.getElementById('fab-toggle-track');
    const thumb = document.getElementById('fab-toggle-thumb');
    if (!checkbox) return;
    checkbox.checked = enabled;
    track.style.background = enabled ? 'rgba(0,255,135,0.18)' : 'var(--lift)';
    track.style.borderColor = enabled ? 'rgba(0,255,135,0.35)' : 'var(--border)';
    thumb.style.background = enabled ? 'var(--neon)' : 'var(--t3)';
    thumb.style.transform = enabled ? 'translateX(14px)' : 'translateX(0)';
  }

  chrome.storage.local.get('subsrf_scan_fab_enabled', (data) => {
    const enabled = data.subsrf_scan_fab_enabled !== false; // default on
    applyFabToggle(enabled);
  });

  document.getElementById('fab-toggle')?.addEventListener('change', (e) => {
    const enabled = e.target.checked;
    applyFabToggle(enabled);
    chrome.storage.local.set({ subsrf_scan_fab_enabled: enabled });
    // Tell content scripts on all tabs to show/hide the fab
    chrome.tabs.query({}, (tabs) => {
      for (const tab of tabs) {
        chrome.tabs.sendMessage(tab.id, { type: 'SET_SCAN_FAB', enabled }).catch(() => {});
      }
    });
  });

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
      chrome.tabs.create({ url: 'https://www.subsrf.dev/#pricing' });
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
    await chrome.storage.local.remove('subsrf_session');
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
      console.log('[Subsrf] Connection failed, attempting background injection...');
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
        console.error('[Subsrf] Script injection blocked by browser policy:', err);
        // If we can't inject, show a non-intrusive warning in the UI
        document.getElementById('connWarning')?.remove();
        const warning = document.createElement('div');
        warning.id = 'connWarning';
        warning.style.cssText = 'background: #fef2f2; color: #991b1b; padding: 10px; font-size: 11px; text-align: center; border-radius: 8px; margin-top: 10px;';
        warning.innerText = 'Cannot inject Subsrf on this page (Browser Restriction).';
        document.getElementById('view-capture').prepend(warning);
      }
    }
  }

  function setMode(tabId, mode) {
    chrome.tabs.sendMessage(tabId, { type: 'SET_MODE', mode: mode }, (_response) => {
      if (chrome.runtime.lastError) {
        console.warn('[Subsrf] Message delivery failed:', chrome.runtime.lastError.message);
      } else {
        btnClick.classList.toggle('active', mode === 'click');
        btnArea.classList.toggle('active', mode === 'region');
      }
    });
  }

  // --- Bridge Status ---
  async function checkBridge() {
    try {
      const { subsrf_session } = await chrome.storage.local.get('subsrf_session');
      const headers = {};
      if (subsrf_session?.accessToken) {
        headers['Authorization'] = `Bearer ${subsrf_session.accessToken}`;
      }
      const res = await fetch('https://api.subsrf.dev/api/state', { headers });
      if (res.ok) {
        const data = await res.json();
        const bridgeStatusText = document.getElementById('bridge-status-text');
        const bridgeDot = document.getElementById('bridge-dot');
        const bridgeBadge = document.getElementById('bridge-status-badge');
        const figmaStatusText = document.getElementById('figma-status-text');
        const figmaDot = document.getElementById('figma-dot');
        const restStatusText = document.getElementById('rest-status-text');
        const restDot = document.getElementById('rest-dot');

        if (bridgeStatusText) {
          bridgeStatusText.innerText = 'ONLINE';
          bridgeStatusText.style.color = '#39D98A';
          bridgeDot.classList.add('on');
          bridgeBadge.style.background = 'rgba(57,217,138,0.08)';
          bridgeBadge.style.borderColor = 'rgba(57,217,138,0.25)';
          bridgeBadge.style.color = '#39D98A';
          document.getElementById('bridge-badge-dot').style.background = '#39D98A';
          document.getElementById('bridge-badge-label').textContent = 'MCP Connected';
          
          if (data.figmaConnected) {
            figmaStatusText.innerText = 'CONNECTED';
            figmaStatusText.style.color = '#39D98A';
            figmaDot.classList.add('on');
          } else {
            figmaStatusText.innerText = 'WAITING';
            figmaStatusText.style.color = 'rgba(242,242,244,0.28)';
            figmaDot.classList.remove('on');
          }

          if (data.restApiAvailable) {
            restStatusText.innerText = 'ACTIVE';
            restStatusText.style.color = '#39D98A';
            restDot.classList.add('on');
            document.getElementById('btn-show-rest-input').innerText = 'Update Token';
          } else {
            restStatusText.innerText = 'NOT CONFIGURED';
            restStatusText.style.color = 'rgba(242,242,244,0.28)';
            restDot.classList.remove('on');
            document.getElementById('btn-show-rest-input').innerText = 'Configure Token';
          }

          // Live credit sync from bridge (updates display without a Supabase round-trip)
          if (data.credits != null) {
            const { subsrf_session: s } = await chrome.storage.local.get('subsrf_session');
            if (s && s.credits !== data.credits) {
              const updated = { ...s, credits: data.credits };
              await chrome.storage.local.set({ subsrf_session: updated });
              renderAuthState(updated);
            }
          }
        }
      }
    } catch (e) {
      const bridgeStatusText = document.getElementById('bridge-status-text');
      if (bridgeStatusText) {
        bridgeStatusText.innerText = 'OFFLINE';
        bridgeStatusText.style.color = 'rgba(242,242,244,0.28)';
        document.getElementById('bridge-dot').classList.remove('on');
        const badge = document.getElementById('bridge-status-badge');
        badge.style.background = 'rgba(242,242,244,0.04)';
        badge.style.borderColor = 'rgba(255,255,255,0.08)';
        badge.style.color = 'rgba(242,242,244,0.28)';
        document.getElementById('bridge-badge-dot').style.background = 'rgba(242,242,244,0.28)';
        document.getElementById('bridge-badge-label').textContent = 'Offline';
        
        document.getElementById('rest-status-text').innerText = 'OFFLINE';
        document.getElementById('rest-dot').classList.remove('on');
      }
    }
  }

  // --- REST API UI Setup ---
  const btnShowRestInput = document.getElementById('btn-show-rest-input');
  const restSetupUi = document.getElementById('rest-setup-ui');
  const restInputUi = document.getElementById('rest-input-ui');
  const btnCancelRest = document.getElementById('btn-cancel-figma-token');
  const btnSaveRest = document.getElementById('btn-save-figma-token');
  const figmaTokenInput = document.getElementById('figma-token-input');

  btnShowRestInput.onclick = () => {
    restSetupUi.style.display = 'none';
    restInputUi.style.display = 'block';
    figmaTokenInput.focus();
  };

  btnCancelRest.onclick = () => {
    restSetupUi.style.display = 'block';
    restInputUi.style.display = 'none';
    figmaTokenInput.value = '';
  };

  btnSaveRest.onclick = async () => {
    const token = figmaTokenInput.value.trim();
    if (!token) return;

    // Get a fresh session from the background worker (triggers token refresh if expired)
    const freshSession = await new Promise(resolve => {
      chrome.runtime.sendMessage({ type: 'GET_AUTH_STATE' }, res => {
        void chrome.runtime.lastError;
        resolve(res?.session || null);
      });
    });

    const userId = freshSession?.user?.id;
    if (userId) {
      await chrome.storage.local.set({ [`figma_pat_${userId}`]: token });
    }

    // Persist directly to Supabase profiles.figma_pat (same pattern as tier lookup)
    let serverSaveOk = false;
    if (freshSession?.accessToken && userId) {
      try {
        const patchRes = await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`,
          {
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${freshSession.accessToken}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({ figma_pat: token })
          }
        );
        serverSaveOk = patchRes.ok;
        if (!patchRes.ok) {
          console.error('[Subsrf] Supabase PATCH failed:', patchRes.status, await patchRes.text().catch(() => ''));
        }
      } catch (e) {
        console.error('[Subsrf] Supabase PATCH error:', e.message);
      }

      // Also update Railway in-memory cache (best-effort — ok if it fails)
      fetch('https://api.subsrf.dev/api/user/figma-pat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${freshSession.accessToken}` },
        body: JSON.stringify({ pat: token })
      }).catch(() => {});
    }

    const mcpWithFigma = {
      mcpServers: {
        subsrf: {
          command: 'npx',
          args: ['-y', 'subsrf-intelligence', '--endpoint', 'https://api.subsrf.dev'],
          env: { FIGMA_PAT: token }
        }
      }
    };

    // Replace the input UI with a copy-able config snippet
    restInputUi.innerHTML = `
      <div style="font-size:11px; margin-bottom:8px; color:${serverSaveOk ? 'var(--success)' : '#f59e0b'};">
        ${serverSaveOk ? '✓ Token saved to your account.' : '⚠ Saved locally only — sign in to persist across devices.'}
      </div>
      <div style="font-size:11px; color:var(--text-dim); margin-bottom:8px;">
        Add this to your MCP client config (Claude Desktop / Cursor):
      </div>
      <pre id="figma-mcp-snippet" style="font-size:10px; background:var(--bg2); border:1px solid var(--border); border-radius:6px; padding:10px; overflow:auto; white-space:pre; cursor:pointer; user-select:all;">${JSON.stringify(mcpWithFigma, null, 2)}</pre>
      <div style="display:flex; gap:8px; margin-top:8px;">
        <button id="btn-copy-figma-mcp" class="btn btn-primary" style="flex:1; font-size:11px; padding:6px;">Copy Config</button>
        <button id="btn-done-figma" class="btn" style="flex:1; font-size:11px; padding:6px;">Done</button>
      </div>`;

    document.getElementById('btn-copy-figma-mcp').onclick = () => {
      navigator.clipboard.writeText(JSON.stringify(mcpWithFigma, null, 2)).then(() => {
        document.getElementById('btn-copy-figma-mcp').textContent = '✓ Copied!';
        setTimeout(() => { document.getElementById('btn-copy-figma-mcp').textContent = 'Copy Config'; }, 2000);
      });
    };
    document.getElementById('btn-done-figma').onclick = () => {
      restSetupUi.style.display = 'block';
      restInputUi.style.display = 'none';
      figmaTokenInput.value = '';
      // Restore original input UI for next time
      restInputUi.innerHTML = `
        <input id="figma-token-input" type="password" placeholder="figd_xxxx..." style="width:100%; padding:8px; border:1px solid var(--border); border-radius:6px; background:var(--bg2); color:var(--text); font-size:12px; margin-bottom:8px;">
        <div style="display:flex; gap:8px;">
          <button id="btn-save-figma-token" class="btn btn-primary" style="flex:1; font-size:11px; padding:6px;">Save Token</button>
          <button id="btn-cancel-figma-token" class="btn" style="flex:1; font-size:11px; padding:6px;">Cancel</button>
        </div>`;
      // Re-bind buttons
      document.getElementById('btn-cancel-figma-token').onclick = () => {
        restSetupUi.style.display = 'block';
        restInputUi.style.display = 'none';
      };
      document.getElementById('btn-save-figma-token').onclick = btnSaveRest.onclick;
    };
  };

  // ── Image drop zone → open in Studio for AI analysis ──────────────────────
  const popupDropZone  = document.getElementById('popup-drop-zone');
  const popupImgInput  = document.getElementById('popup-image-input');

  function showUpgradeHint(msg) {
    let hint = document.getElementById('upgrade-hint');
    if (!hint) {
      hint = document.createElement('div');
      hint.id = 'upgrade-hint';
      hint.style.cssText = 'background:rgba(255,171,0,0.08); border:1px solid rgba(255,171,0,0.2); border-radius:8px; padding:10px 12px; font-size:11px; color:var(--warn); line-height:1.5; margin-bottom:10px; text-align:center;';
      const captureView = document.getElementById('view-capture');
      captureView.insertBefore(hint, captureView.firstChild);
    }
    hint.innerHTML = `${msg} <a href="https://www.subsrf.dev/#pricing" target="_blank" style="color:var(--acid); font-weight:700; text-decoration:none;">Upgrade ↗</a>`;
    clearTimeout(hint._timer);
    hint._timer = setTimeout(() => hint.remove(), 5000);
  }

  async function openImageInStudio(file) {
    const tier = (currentSession?.tier || 'free').toLowerCase();
    if (tier !== 'starter' && tier !== 'pro') {
      showUpgradeHint('Image Studio requires Starter or Pro.');
      return;
    }
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      await chrome.storage.local.set({
        lastCapture:   e.target.result,
        lastCaptureTime: Date.now(),
        openAnalysisTab: {},
      });
      chrome.storage.local.remove(['lastCaptureRect', 'lastCaptureViewportWidth']);
      chrome.tabs.create({ url: chrome.runtime.getURL('editor.html') });
      window.close();
    };
    reader.readAsDataURL(file);
  }

  popupDropZone.addEventListener('dragover', e => {
    e.preventDefault();
    popupDropZone.style.borderColor = 'rgba(0,255,135,0.55)';
    popupDropZone.style.background  = 'rgba(0,255,135,0.06)';
  });
  popupDropZone.addEventListener('dragleave', () => {
    popupDropZone.style.borderColor = '';
    popupDropZone.style.background  = '';
  });
  popupDropZone.addEventListener('drop', e => {
    e.preventDefault();
    popupDropZone.style.borderColor = '';
    popupDropZone.style.background  = '';
    openImageInStudio(e.dataTransfer?.files?.[0]);
  });
  popupImgInput.addEventListener('change', () => openImageInStudio(popupImgInput.files?.[0]));

  document.getElementById('btn-clear-all').onclick = async () => {
    // Clear highlight boxes on the page
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) chrome.tabs.sendMessage(tab.id, { type: 'CLEAR_SELECTION' }, () => void chrome.runtime.lastError);

    // Clear local state and notify bridge
    chrome.storage.local.remove('selectedElements');
    chrome.runtime.sendMessage({ type: 'ELEMENTS_UPDATE', elements: [] }, () => void chrome.runtime.lastError);
    updateInventory([]);
    if (countText) countText.innerText = '0';
  };

  // --- UI Sync ---
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'ELEMENTS_UPDATE') {
      updateInventory(msg.elements);
      chrome.storage.local.set({ selectedElements: msg.elements });
    }
  });

  function updateInventory(elements) {
    if (countText) countText.innerText = `${elements.length}`;
    const list = document.getElementById('elements-list');
    if (!list) return;
    
    if (elements.length === 0) {
      list.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--text-dim); font-size: 12px;">No elements selected</div>`;
      return;
    }

    list.innerHTML = elements.map((el, i) => `
      <div style="padding: 10px 16px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 10px;">
           <span style="font-family: 'Azeret Mono', monospace; font-size: 10px; background: rgba(0,255,135,0.1); color: #00FF87; border: 1px solid rgba(0,255,135,0.3); padding: 2px 6px; border-radius: 4px; font-weight: 500;">${i + 1}</span>
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
