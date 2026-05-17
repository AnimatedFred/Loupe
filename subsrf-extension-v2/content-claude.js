// Subsrf × Claude.ai — toolbar pill + connection modal
// Injects a small pill into Claude's composer toolbar. Clicking opens
// a full connection modal (same pattern as VidIQ).

(function () {
  'use strict';
  if (window.__subsrfClaudeInit) return;
  window.__subsrfClaudeInit = true;

  const MCP_URL       = 'https://api.subsrf.dev/mcp';
  const PILL_ID       = 'subsrf-toolbar-pill';
  const MODAL_ID      = 'subsrf-modal-backdrop';
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
        font-size: 11px; font-weight: 400; color: rgba(242,242,244,0.55);
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

  function openModal() {
    if (document.getElementById(MODAL_ID)) { closeModal(); return; }
    injectStyles();

    chrome.storage.local.get(CONNECTED_KEY, (data) => {
      const connected = !!data[CONNECTED_KEY];
      const logoSrc = chrome.runtime?.getURL('icons/icon48.png') ?? '';

      const backdrop = document.createElement('div');
      backdrop.id = MODAL_ID;

      if (connected) {
        backdrop.innerHTML = `
          <div class="src-modal">
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
            <p class="src-caption">One-click setup · Secure OAuth · Turn it off anytime</p>
          </div>`;
      } else {
        backdrop.innerHTML = `
          <div class="src-modal">
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
            <p class="src-caption">One-click setup · Secure OAuth · Turn it off anytime</p>
          </div>`;
      }

      // Append FIRST so all getElementById calls below find the elements
      document.body.appendChild(backdrop);

      // Wire up all event listeners after the element is in the DOM
      backdrop.querySelector('.src-modal-close').addEventListener('click', closeModal);
      backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeModal(); });
      backdrop.querySelector('#subsrf-connect-btn')?.addEventListener('click', handleConnect);
      backdrop.querySelector('#subsrf-manage-btn')?.addEventListener('click', () => {
        closeModal();
        window.location.href = 'https://claude.ai/customize/connectors';
      });
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

    for (const url of [
      `https://claude.ai/api/organizations/${orgUuid}/integrations`,
      `https://claude.ai/api/organizations/${orgUuid}/mcp_servers`,
    ]) {
      const res = await fetch(url, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: MCP_URL, name: 'Subsrf Intelligence' }),
      });
      if (res.ok || res.status === 409) return true;
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
      document.getElementById(PILL_ID)?.classList.add('src-connected');
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
      console.log('[Subsrf] Direct API unavailable, falling back:', e.message);
      closeModal();
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
    } finally {
      _injecting = false;
    }
  }

  // ── Auto-fill on /customize/connectors ───────────────────────────────────

  function tryAutoFill() {
    if (!location.pathname.startsWith('/customize/connectors')) return;
    chrome.storage.local.get('subsrf_pending_mcp_url', ({ subsrf_pending_mcp_url: pending }) => {
      if (!pending) return;
      const observer = new MutationObserver(() => {
        const input =
          document.querySelector('input[placeholder*="url" i]') ||
          document.querySelector('input[placeholder*="mcp" i]') ||
          document.querySelector('input[type="url"]');
        if (!input) return;
        observer.disconnect();
        input.focus();
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        setter.call(input, pending);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        chrome.storage.local.remove('subsrf_pending_mcp_url');
      });
      observer.observe(document.body, { childList: true, subtree: true });
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
