// Subsrf × Claude.ai — toolbar pill + connection modal
// Injects a small pill into Claude's composer toolbar. Clicking opens
// a full connection modal (same pattern as VidIQ).

(function () {
  'use strict';
  if (window.__subsrfClaudeInit) return;
  window.__subsrfClaudeInit = true;

  const MCP_URL = 'https://api.subsrf.dev/mcp';
  const PILL_ID = 'subsrf-toolbar-pill';
  const MODAL_ID = 'subsrf-modal-backdrop';
  const CONNECTED_KEY = 'subsrf_claude_connected';

  // Injection guard — prevents concurrent async calls from each inserting a pill
  let _injecting = false;
  // Debounce timer for MutationObserver re-injection checks
  let _mutationTimer = null;

  // ── Styles ────────────────────────────────────────────────────────────────

  function injectStyles() {
    if (document.getElementById('subsrf-claude-styles')) return;

    // Fonts
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Azeret+Mono:wght@300;400&family=Manrope:wght@500;600&display=swap';
    document.head.appendChild(link);

    const s = document.createElement('style');
    s.id = 'subsrf-claude-styles';
    s.textContent = `
      /* ── Pill ── */
      #subsrf-toolbar-pill {
        display: inline-flex; align-items: center; gap: 8px;
        padding: 6px 12px; border-radius: 9999px;
        border: 1px solid rgba(255,255,255,0.10);
        background: #18181f;
        cursor: pointer;
        font-family: 'Azeret Mono', monospace;
        font-size: 11px; font-weight: 400; color: rgba(242,242,244,1);
        transition: border-color 150ms ease-out, background 150ms ease-out;
        white-space: nowrap; user-select: none; flex-shrink: 0;
      }
      #subsrf-toolbar-pill:hover {
        border-color: rgba(255,255,255,0.18); background: #22222c;
      }
      #subsrf-toolbar-pill.src-connected {
        border-color: rgba(57,217,138,0.35); background: rgba(57,217,138,0.12);
        color: #39D98A; letter-spacing: 0.5px;
      }
      #subsrf-toolbar-pill img { width: 16px; height: 16px; border-radius: 4px; object-fit: contain; }
      #subsrf-toolbar-pill .src-caret { opacity: 0.45; margin-left: 4px; }

      /* ── Modal backdrop ── */
      #subsrf-modal-backdrop {
        position: fixed; inset: 0; z-index: 99999;
        background: rgba(5,5,8,0.85); backdrop-filter: blur(8px);
        display: flex; align-items: center; justify-content: center; padding: 16px;
        animation: srfBackdrop 200ms cubic-bezier(0,0,0.2,1);
      }
      @keyframes srfBackdrop { from { opacity:0 } to { opacity:1 } }

      /* ── Modal card ── */
      #subsrf-modal-backdrop .src-modal {
        background: #111118; border: 1px solid rgba(255,255,255,0.06);
        border-radius: 16px; padding: 32px;
        width: 100%; max-width: 540px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.35);
        animation: srfModal 200ms cubic-bezier(0,0,0.2,1);
        font-family: 'Manrope', sans-serif; box-sizing: border-box;
      }
      @keyframes srfModal {
        from { opacity:0; transform:translateY(12px) scale(0.98) }
        to   { opacity:1; transform:translateY(0)    scale(1)    }
      }
      #subsrf-modal-backdrop .src-modal-header {
        display: flex; align-items: center; gap: 12px; margin-bottom: 24px;
      }
      #subsrf-modal-backdrop .src-modal-logo {
        width: 32px; height: 32px; border-radius: 8px; object-fit: contain;
      }
      #subsrf-modal-backdrop .src-modal-name {
        font-family: 'Azeret Mono', monospace;
        font-size: 11px; font-weight: 400; color: rgba(242,242,244,0.55);
        letter-spacing: 2px; text-transform: uppercase; flex: 1;
      }
      #subsrf-modal-backdrop .src-modal-close {
        background: transparent; border: 1px solid transparent;
        font-size: 18px; color: rgba(242,242,244,0.28);
        cursor: pointer; padding: 4px 8px; border-radius: 6px; line-height: 1;
        transition: all 150ms ease-out;
      }
      #subsrf-modal-backdrop .src-modal-close:hover {
        border-color: rgba(255,255,255,0.06); color: rgba(242,242,244,0.55);
      }
      #subsrf-modal-backdrop h2 {
        font-family: 'Manrope', sans-serif;
        font-size: 22px; font-weight: 500; color: #F2F2F4;
        margin: 0 0 16px; line-height: 1.3; letter-spacing: -0.3px;
      }
      #subsrf-modal-backdrop .src-chips { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 24px; }
      #subsrf-modal-backdrop .src-chip {
        background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.06);
        border-radius: 4px; padding: 4px 10px;
        font-family: 'Azeret Mono', monospace; font-size: 10px; font-weight: 400;
        color: rgba(242,242,244,0.55); letter-spacing: 0.5px;
      }
      #subsrf-modal-backdrop .src-chip b { color: #F2F2F4; font-weight: 400; }
      #subsrf-modal-backdrop .src-prompts {
        background: #0C0C12; border: 1px solid rgba(255,255,255,0.06);
        border-radius: 8px; overflow: hidden; margin-bottom: 24px;
      }
      #subsrf-modal-backdrop .src-prompt {
        display: flex; align-items: center; justify-content: space-between;
        padding: 12px 16px; font-family: 'Azeret Mono', monospace;
        font-size: 12px; color: rgba(242,242,244,0.55);
        border-bottom: 1px solid rgba(255,255,255,0.06);
      }
      #subsrf-modal-backdrop .src-prompt:last-child { border-bottom: none; }
      #subsrf-modal-backdrop .src-lock { font-size: 11px; color: rgba(242,242,244,0.28); }
      #subsrf-modal-backdrop .src-cta {
        width: 100%; background: #00FF87; color: #050508; border: none;
        border-radius: 6px; padding: 12px 24px;
        font-family: 'Manrope', sans-serif; font-size: 13px; font-weight: 600;
        cursor: pointer; display: flex; align-items: center; justify-content: center;
        gap: 8px; transition: all 150ms ease-out; box-sizing: border-box;
      }
      #subsrf-modal-backdrop .src-cta:hover {
        transform: translateY(-1px); box-shadow: 0 0 30px rgba(0,255,135,0.20);
      }
      #subsrf-modal-backdrop .src-cta:disabled { opacity: 0.35; cursor: not-allowed; box-shadow: none; transform: none; }
      #subsrf-modal-backdrop .src-cta-secondary {
        background: rgba(255,255,255,0.05); color: rgba(242,242,244,0.55);
        border: 1px solid rgba(255,255,255,0.06);
      }
      #subsrf-modal-backdrop .src-cta-secondary:hover {
        background: rgba(255,255,255,0.08); transform: none; box-shadow: none;
      }
      #subsrf-modal-backdrop .src-caption {
        text-align: center; font-family: 'Azeret Mono', monospace;
        font-size: 9px; color: rgba(242,242,244,0.28); margin-top: 16px;
        text-transform: uppercase; letter-spacing: 2px;
      }
      /* ── Success state ── */
      #subsrf-modal-backdrop .src-success { text-align: left; padding: 16px 0; }
      #subsrf-modal-backdrop .src-success-check {
        display: inline-flex; align-items: center; gap: 6px;
        padding: 4px 10px; border-radius: 4px;
        background: rgba(57,217,138,0.1); border: 1px solid rgba(57,217,138,0.2);
        color: #39D98A; font-family: 'Azeret Mono', monospace;
        font-size: 10px; letter-spacing: 0.5px; margin-bottom: 16px;
      }
      #subsrf-modal-backdrop .src-success-check::before {
        content: ''; display: block; width: 5px; height: 5px; border-radius: 50%; background: currentColor;
      }
      #subsrf-modal-backdrop .src-success-title {
        font-family: 'Manrope', sans-serif; font-size: 22px; font-weight: 500; color: #F2F2F4;
      }
      #subsrf-modal-backdrop .src-success-sub {
        font-family: 'Azeret Mono', monospace; font-size: 12px;
        color: rgba(242,242,244,0.55); margin-top: 8px; line-height: 1.8;
      }
    `;
    document.head.appendChild(s);
  }

  // ── Modal ─────────────────────────────────────────────────────────────────

  function closeModal() {
    document.getElementById(MODAL_ID)?.remove();
  }

  // Get the Claude org UUID from any available source.
  async function getOrgUuid() {
    // 1. Try Next.js page data embedded in DOM (no network request)
    try {
      const el = document.getElementById('__NEXT_DATA__');
      if (el) {
        const nd = JSON.parse(el.textContent);
        const uuid =
          nd?.props?.pageProps?.account?.memberships?.[0]?.organization?.uuid ||
          nd?.props?.pageProps?.currentOrg?.uuid ||
          nd?.props?.pageProps?.organization?.uuid;
        if (uuid) { console.log('[Subsrf] orgUuid from __NEXT_DATA__'); return uuid; }
      }
    } catch (_) {}

    // 2. Try several API paths — /api/auth/account is now 404
    for (const path of [
      '/api/auth/account', '/api/user', '/api/me', '/api/auth/me',
      '/api/profile', '/api/account',
    ]) {
      try {
        const r = await fetch(`https://claude.ai${path}`, { credentials: 'include' });
        console.log('[Subsrf] account probe', path, '→', r.status);
        if (!r.ok) continue;
        const d = await r.json();
        const uuid =
          d?.account?.memberships?.[0]?.organization?.uuid ||
          d?.memberships?.[0]?.organization?.uuid ||
          d?.organization?.uuid ||
          d?.org_uuid ||
          d?.uuid;
        if (uuid) { console.log('[Subsrf] orgUuid from', path); return uuid; }
        console.log('[Subsrf] response keys from', path, ':', Object.keys(d));
      } catch (_) {}
    }
    return null;
  }

  // Checks if Subsrf MCP is registered with Claude.
  // Returns true/false, or null if completely indeterminate.
  async function checkConnected() {
    try {
      const orgUuid = await getOrgUuid();
      if (!orgUuid) { console.warn('[Subsrf] could not get orgUuid'); return null; }

      // Try GET on every plausible endpoint
      let gotValidList = false;
      for (const path of ['mcp_servers', 'integrations', 'connectors', 'remote_mcp_servers']) {
        try {
          const res = await fetch(`https://claude.ai/api/organizations/${orgUuid}/${path}`, { credentials: 'include' });
          console.log('[Subsrf] GET', path, '→', res.status);
          if (!res.ok) continue;
          const data = await res.json();
          console.log('[Subsrf] GET', path, 'body:', JSON.stringify(data).slice(0, 300));

          let list = Array.isArray(data) ? data : null;
          if (!list) {
            for (const key of ['mcp_servers', 'integrations', 'connectors', 'data', 'results', 'items']) {
              if (Array.isArray(data[key])) { list = data[key]; break; }
            }
          }
          if (!list) continue;
          gotValidList = true;
          if (list.some(item => (item.url || item.mcp_url || item.remote_url || item.uri || '').includes('subsrf'))) {
            console.log('[Subsrf] Found via GET', path);
            return true;
          }
        } catch (e) { console.warn('[Subsrf] GET', path, 'err:', e.message); }
      }

      // POST probe: 409 = already registered, 201 = just registered
      for (const path of ['mcp_servers', 'integrations', 'remote_mcp_servers']) {
        const res = await fetch(`https://claude.ai/api/organizations/${orgUuid}/${path}`, {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: MCP_URL, name: 'Subsrf Intelligence' }),
        });
        console.log('[Subsrf] POST', path, '→', res.status);
        if (res.ok || res.status === 409) return true;
      }

      return gotValidList ? false : null;
    } catch (e) {
      console.error('[Subsrf] checkConnected threw:', e);
      return null;
    }
  }

  function syncPillState(connected) {
    const pill = document.getElementById(PILL_ID);
    if (!pill) return;
    connected ? pill.classList.add('src-connected') : pill.classList.remove('src-connected');
  }

  async function openModal() {
    if (document.getElementById(MODAL_ID)) { closeModal(); return; }
    injectStyles();

    const logoSrc = chrome.runtime?.getURL('icons/icon48.png') ?? '';

    // Show backdrop immediately with loading state
    const backdrop = document.createElement('div');
    backdrop.id = MODAL_ID;
    backdrop.innerHTML = `<div class="src-modal" style="display:flex;align-items:center;justify-content:center;min-height:220px"><span style="font-family:'Azeret Mono',monospace;font-size:11px;color:rgba(242,242,244,0.28);letter-spacing:1px">checking…</span></div>`;
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeModal(); });

    // Real API check — don't trust storage alone
    let connected = await checkConnected();
    if (connected === null) {
      // Indeterminate: fall back to cached storage value
      connected = !!(await new Promise(r => chrome.storage.local.get(CONNECTED_KEY, d => r(d[CONNECTED_KEY]))));
    } else {
      // Sync storage and pill to match reality
      chrome.storage.local.set({ [CONNECTED_KEY]: connected });
      syncPillState(connected);
    }

    // User may have closed the modal while we were checking
    if (!document.getElementById(MODAL_ID)) return;

    const modal = backdrop.querySelector('.src-modal');
    if (!modal) return;
    modal.removeAttribute('style');

    if (connected) {
      modal.innerHTML = `
        <div class="src-modal-header">
          <img class="src-modal-logo" src="${logoSrc}" alt="">
          <span class="src-modal-name">Subsrf Intelligence</span>
          <button class="src-modal-close" type="button">×</button>
        </div>
        <h2>Subsrf is connected</h2>
        <div class="src-chips">
          <div class="src-chip"><b>Live</b> element capture</div>
          <div class="src-chip"><b>Real-time</b> Figma sync</div>
          <div class="src-chip"><b>AI</b> implementation briefs</div>
        </div>
        <div class="src-prompts">
          <div class="src-prompt">Analyze my captured UI and generate an implementation brief</div>
          <div class="src-prompt">Sync the selected components to Figma</div>
          <div class="src-prompt">What design tokens is this page using?</div>
        </div>
        <button class="src-cta src-cta-secondary" id="subsrf-manage-btn" type="button">Manage connection</button>
        <p class="src-caption">One-click setup · Secure OAuth · Turn it off anytime</p>`;
    } else {
      modal.innerHTML = `
        <div class="src-modal-header">
          <img class="src-modal-logo" src="${logoSrc}" alt="">
          <span class="src-modal-name">Subsrf Intelligence</span>
          <button class="src-modal-close" type="button">×</button>
        </div>
        <h2>Unlock Figma design intelligence in Claude</h2>
        <div class="src-chips">
          <div class="src-chip"><b>Live</b> element capture</div>
          <div class="src-chip"><b>Real-time</b> Figma sync</div>
          <div class="src-chip"><b>AI</b> implementation briefs</div>
        </div>
        <div class="src-prompts">
          <div class="src-prompt">Analyze my captured UI and generate an implementation brief<span class="src-lock">🔒</span></div>
          <div class="src-prompt">Sync the selected components to Figma<span class="src-lock">🔒</span></div>
          <div class="src-prompt">What design tokens is this page using?<span class="src-lock">🔒</span></div>
        </div>
        <button class="src-cta" id="subsrf-connect-btn" type="button">
          Connect Figma Intelligence
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>
        <p class="src-caption">One-click setup · Secure OAuth · Turn it off anytime</p>`;
    }

    modal.querySelector('.src-modal-close').addEventListener('click', closeModal);
    modal.querySelector('#subsrf-connect-btn')?.addEventListener('click', handleConnect);
    modal.querySelector('#subsrf-manage-btn')?.addEventListener('click', () => {
      closeModal();
      window.location.href = 'https://claude.ai/customize/connectors';
    });
  }

  // ── Connect logic ─────────────────────────────────────────────────────────

  async function tryDirectAPI() {
    const r = await fetch('https://claude.ai/api/auth/account', { credentials: 'include' });
    if (!r.ok) throw new Error(`account ${r.status}`);
    const account = await r.json();
    const orgUuid =
      account?.account?.memberships?.[0]?.organization?.uuid ||
      account?.memberships?.[0]?.organization?.uuid;
    if (!orgUuid) throw new Error('no orgUuid');

    const endpoints = [
      `https://claude.ai/api/organizations/${orgUuid}/mcp_servers`,
      `https://claude.ai/api/organizations/${orgUuid}/integrations`,
      `https://claude.ai/api/organizations/${orgUuid}/remote_mcp_servers`,
      `https://claude.ai/api/organizations/${orgUuid}/connectors`,
    ];
    const payloads = [
      { url: MCP_URL, name: 'Subsrf Intelligence' },
      { url: MCP_URL, display_name: 'Subsrf Intelligence', type: 'remote' },
      { remote_server_url: MCP_URL, name: 'Subsrf Intelligence' },
    ];

    for (const endpoint of endpoints) {
      for (const body of payloads) {
        const res = await fetch(endpoint, {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (res.ok || res.status === 409) return true;
      }
    }
    throw new Error('all endpoints failed');
  }

  async function handleConnect() {
    const btn = document.getElementById('subsrf-connect-btn');
    if (!btn) return;
    btn.disabled = true;
    btn.innerHTML = '<span style="opacity:.6">Connecting…</span>';

    try {
      await tryDirectAPI();
      chrome.storage.local.set({ [CONNECTED_KEY]: true });
      syncPillState(true);
      const modal = document.querySelector('#subsrf-modal-backdrop .src-modal');
      if (modal) {
        modal.innerHTML = `
          <div class="src-success">
            <div class="src-success-check">CONNECTED</div>
            <div class="src-success-title">Subsrf connected!</div>
            <div class="src-success-sub">Figma Intelligence is ready in this conversation.</div>
          </div>`;
        setTimeout(closeModal, 2800);
      }
    } catch (e) {
      console.warn('[Subsrf] Direct API failed:', e.message, '— redirecting to connectors page');
      closeModal();
      // Copy URL to clipboard so user can paste it if automation fails
      navigator.clipboard?.writeText(MCP_URL).catch(() => {});
      chrome.storage.local.set({ subsrf_pending_mcp_url: MCP_URL });
      window.location.href = 'https://claude.ai/customize/connectors';
    }
  }

  // ── Pill injection ────────────────────────────────────────────────────────

  function buildPill(connected) {
    const logoSrc = chrome.runtime?.getURL('icons/icon48.png') ?? '';
    const pill = document.createElement('button');
    pill.id = PILL_ID;
    pill.type = 'button';
    if (connected) pill.classList.add('src-connected');
    pill.innerHTML = `
      ${logoSrc ? `<img src="${logoSrc}" alt="">` : ''}
      <span>Subsrf</span>
      <svg class="src-caret" width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M1 3l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
    pill.addEventListener('click', (e) => { e.stopPropagation(); openModal(); });
    return pill;
  }

  function findToolbar() {
    // Primary: find the flex row that contains Claude's model selector
    const modelSelector =
      document.querySelector('[data-testid="model-selector-dropdown"]') ||
      document.querySelector('[data-value*="claude"]') ||
      document.querySelector('button[id*="model"]');
    if (modelSelector) {
      const row = modelSelector.closest('div[class*="flex"]') || modelSelector.parentElement;
      if (row) return row;
    }
    // Fallback: the widest short flex row in the bottom quarter of the page
    const rows = [...document.querySelectorAll('div')].filter(el => {
      if (el.children.length < 2) return false;
      const rect = el.getBoundingClientRect();
      return rect.bottom > window.innerHeight * 0.8
        && rect.height > 28 && rect.height < 64
        && rect.width > 300;
    });
    return rows[0] ?? null;
  }

  async function tryInjectPill() {
    // Hard guards — prevent duplicate injections
    if (_injecting) return;
    if (document.getElementById(PILL_ID)) return;
    if (location.pathname.startsWith('/customize') || location.pathname.startsWith('/settings')) return;

    _injecting = true;
    try {
      // Check tier
      const data = await new Promise(r => chrome.storage.local.get(['subsrf_session', CONNECTED_KEY], r));
      const tier = data.subsrf_session?.tier?.toLowerCase();
      if (!['pro', 'starter'].includes(tier)) return;

      const toolbar = findToolbar();
      if (!toolbar) return;

      // Final check inside the lock (DOM may have changed during the await)
      if (document.getElementById(PILL_ID)) return;

      injectStyles();
      const pill = buildPill(!!data[CONNECTED_KEY]);
      // Insert after the first child (usually the + button)
      const anchor = toolbar.firstElementChild;
      anchor ? toolbar.insertBefore(pill, anchor.nextSibling) : toolbar.prepend(pill);

      // Async: verify real connection state and update pill + storage
      checkConnected().then(connected => {
        if (connected === null) return;
        chrome.storage.local.set({ [CONNECTED_KEY]: connected });
        syncPillState(connected);
      });
    } finally {
      _injecting = false;
    }
  }

  // ── Auto-fill on /customize/connectors ───────────────────────────────────

  function showConnectorBanner(url) {
    if (document.getElementById('subsrf-connector-banner')) return;
    const el = document.createElement('div');
    el.id = 'subsrf-connector-banner';
    el.style.cssText = [
      'position:fixed;top:20px;right:20px;z-index:99998',
      'background:#111118;border:1px solid rgba(57,217,138,0.3)',
      'border-radius:12px;padding:16px 20px;max-width:300px',
      'font-family:Azeret Mono,monospace;font-size:11px',
      'color:rgba(242,242,244,0.7);box-shadow:0 8px 32px rgba(0,0,0,0.5)',
    ].join(';');
    el.innerHTML = `
      <button onclick="document.getElementById('subsrf-connector-banner').remove()"
        style="position:absolute;top:8px;right:8px;background:none;border:none;
               color:rgba(242,242,244,0.3);cursor:pointer;font-size:18px;line-height:1;padding:4px">×</button>
      <div style="color:#39D98A;font-size:10px;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px">Subsrf — ready to add</div>
      <div style="line-height:1.7;margin-bottom:12px">
        Click <b style="color:#F2F2F4">Add connector</b>, then paste —
        the URL is already copied to your clipboard.
      </div>
      <div style="background:#0C0C12;border:1px solid rgba(255,255,255,0.06);
                  border-radius:4px;padding:6px 10px;font-size:10px;
                  color:rgba(242,242,244,0.45);word-break:break-all">${url}</div>`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 60000);
  }

  function tryAutoFill() {
    if (!location.pathname.startsWith('/customize/connectors')) return;

    chrome.storage.local.get('subsrf_pending_mcp_url', ({ subsrf_pending_mcp_url: pending }) => {
      if (!pending) return;

      let filled = false;
      let clickedAdd = false;

      function findInput() {
        return (
          document.querySelector('input[placeholder*="url" i]') ||
          document.querySelector('input[placeholder*="mcp" i]') ||
          document.querySelector('input[placeholder*="server" i]') ||
          document.querySelector('input[placeholder*="endpoint" i]') ||
          document.querySelector('input[type="url"]')
        );
      }

      function tryFill() {
        if (filled) return false;
        const input = findInput();
        if (!input) return false;

        filled = true;
        observer.disconnect();
        console.log('[Subsrf] Found URL input, filling…', input);
        input.focus();
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        setter.call(input, pending);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        chrome.storage.local.remove('subsrf_pending_mcp_url');

        // Also fill name field if present
        const nameInput = input.closest('form, [role="dialog"]')
          ?.querySelector('input:not([type="url"]):not([placeholder*="url" i])');
        if (nameInput) {
          const nameSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
          nameSetter.call(nameInput, 'Subsrf Intelligence');
          nameInput.dispatchEvent(new Event('input', { bubbles: true }));
        }

        setTimeout(() => {
          const container = input.closest('[role="dialog"]') || input.closest('form');
          if (!container) return;
          const btns = [...container.querySelectorAll('button')];
          console.log('[Subsrf] Buttons in dialog:', btns.map(b => b.textContent.trim()));
          const submit = btns.find(b =>
            /^(add|save|connect|done|confirm|continue|submit|create)/i.test(b.textContent.trim()) &&
            !b.disabled
          );
          if (submit) {
            console.log('[Subsrf] Clicking submit:', submit.textContent.trim());
            submit.click();
          }
        }, 400);
        return true;
      }

      function tryOpenAddDialog() {
        if (clickedAdd) return false;
        // Only target page-level buttons (not inside an already-open dialog)
        const btns = [...document.querySelectorAll('button')].filter(b =>
          !b.closest('[role="dialog"]') && !b.disabled
        );
        console.log('[Subsrf] Page buttons:', btns.map(b => b.textContent.trim()).filter(Boolean));
        // Match buttons that START with Add/New/+ — avoids "Not connected", "Disconnect" etc.
        const addBtn = btns.find(b =>
          /^(add|new|\+|create)\b/i.test(b.textContent.trim())
        );
        if (addBtn) {
          console.log('[Subsrf] Clicking Add button:', addBtn.textContent.trim());
          clickedAdd = true;
          addBtn.click();
          return true;
        }
        return false;
      }

      const observer = new MutationObserver(() => {
        if (!tryFill()) tryOpenAddDialog();
      });
      observer.observe(document.body, { childList: true, subtree: true });

      setTimeout(() => {
        if (!tryFill()) {
          const opened = tryOpenAddDialog();
          // Show banner as fallback regardless — clipboard was already copied
          if (!opened) showConnectorBanner(pending);
        }
      }, 900);

      // Show banner after 3s if still not filled (automation may have failed)
      setTimeout(() => {
        if (!filled) showConnectorBanner(pending);
      }, 3000);
    });
  }

  // ── Init & SPA navigation ─────────────────────────────────────────────────

  let lastHref = location.href;

  function schedulePillInject(delay = 400) {
    clearTimeout(_mutationTimer);
    _mutationTimer = setTimeout(tryInjectPill, delay);
  }

  new MutationObserver(() => {
    if (location.href !== lastHref) {
      lastHref = location.href;
      closeModal();
      tryAutoFill();
      schedulePillInject(900);
    } else if (!document.getElementById(PILL_ID)) {
      // Re-inject only if pill is gone — debounced to avoid firing on every keystroke
      schedulePillInject(500);
    }
  }).observe(document.documentElement, { childList: true, subtree: true });

  // Initial injection
  setTimeout(() => { tryAutoFill(); tryInjectPill(); }, 1200);
})();
