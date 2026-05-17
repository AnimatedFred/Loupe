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
    const s = document.createElement('style');
    s.id = 'subsrf-claude-styles';
    s.textContent = `
      #subsrf-toolbar-pill {
        display: inline-flex; align-items: center; gap: 6px;
        padding: 5px 10px 5px 7px; border-radius: 999px;
        border: 1.5px solid #d1d5db; background: #fff;
        cursor: pointer;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 12.5px; font-weight: 500; color: #374151;
        transition: border-color .15s, background .15s;
        white-space: nowrap; user-select: none; flex-shrink: 0;
      }
      #subsrf-toolbar-pill:hover { border-color: #9ca3af; background: #f9fafb; }
      #subsrf-toolbar-pill.src-connected { border-color: #00c96b; background: #f0fdf4; color: #065f46; }
      #subsrf-toolbar-pill img { width: 16px; height: 16px; border-radius: 4px; object-fit: contain; }
      #subsrf-toolbar-pill .src-caret { opacity: .45; margin-left: 1px; }

      #subsrf-modal-backdrop {
        position: fixed; inset: 0; z-index: 99999;
        background: rgba(0,0,0,0.45);
        display: flex; align-items: center; justify-content: center; padding: 16px;
        animation: srfBackdrop .18s ease;
      }
      @keyframes srfBackdrop { from { opacity:0 } to { opacity:1 } }

      #subsrf-modal-backdrop .src-modal {
        background: #fff; border-radius: 14px; padding: 22px 22px 18px;
        width: 100%; max-width: 540px;
        box-shadow: 0 24px 64px rgba(0,0,0,0.22);
        animation: srfModal .2s cubic-bezier(0.34,1.2,0.64,1);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        box-sizing: border-box;
      }
      @keyframes srfModal {
        from { opacity:0; transform:translateY(10px) scale(0.97) }
        to   { opacity:1; transform:translateY(0)   scale(1)    }
      }
      #subsrf-modal-backdrop .src-header {
        display: flex; align-items: center; gap: 10px; margin-bottom: 14px;
      }
      #subsrf-modal-backdrop .src-logo {
        width: 30px; height: 30px; border-radius: 7px; object-fit: contain;
      }
      #subsrf-modal-backdrop .src-name { font-size: 13px; font-weight: 600; color: #111827; flex: 1; }
      #subsrf-modal-backdrop .src-close {
        background: none; border: none; font-size: 20px; color: #9ca3af;
        cursor: pointer; padding: 2px 6px; border-radius: 5px; line-height: 1;
      }
      #subsrf-modal-backdrop .src-close:hover { background: #f3f4f6; color: #374151; }
      #subsrf-modal-backdrop h2 { font-size: 17px; font-weight: 700; color: #111827; margin: 0 0 12px; line-height: 1.35; }
      #subsrf-modal-backdrop .src-chips { display: flex; gap: 7px; flex-wrap: wrap; margin-bottom: 16px; }
      #subsrf-modal-backdrop .src-chip {
        background: #f3f4f6; border-radius: 999px; padding: 4px 12px;
        font-size: 12px; font-weight: 500; color: #374151;
      }
      #subsrf-modal-backdrop .src-chip b { color: #059669; }
      #subsrf-modal-backdrop .src-prompts {
        border: 1px solid #e5e7eb; border-radius: 9px; overflow: hidden; margin-bottom: 16px;
      }
      #subsrf-modal-backdrop .src-prompt {
        display: flex; align-items: center; justify-content: space-between;
        padding: 11px 14px; font-size: 13px; color: #374151;
        border-bottom: 1px solid #f3f4f6;
      }
      #subsrf-modal-backdrop .src-prompt:last-child { border-bottom: none; }
      #subsrf-modal-backdrop .src-lock { font-size: 12px; color: #d1d5db; }
      #subsrf-modal-backdrop .src-cta {
        width: 100%; background: #111827; color: #fff; border: none;
        border-radius: 8px; padding: 13px 20px; font-size: 14px; font-weight: 600;
        cursor: pointer; display: flex; align-items: center; justify-content: center;
        gap: 8px; transition: background .15s; box-sizing: border-box;
      }
      #subsrf-modal-backdrop .src-cta:hover { background: #1f2937; }
      #subsrf-modal-backdrop .src-cta:disabled { opacity: .6; cursor: default; }
      #subsrf-modal-backdrop .src-cta-muted { background: #f3f4f6; color: #374151; }
      #subsrf-modal-backdrop .src-cta-muted:hover { background: #e5e7eb; }
      #subsrf-modal-backdrop .src-caption { text-align: center; font-size: 11px; color: #9ca3af; margin-top: 10px; }
      #subsrf-modal-backdrop .src-success { text-align: center; padding: 20px 0; }
      #subsrf-modal-backdrop .src-success-check {
        width: 44px; height: 44px; border-radius: 50%; background: #d1fae5;
        display: flex; align-items: center; justify-content: center;
        margin: 0 auto 12px; font-size: 22px;
      }
      #subsrf-modal-backdrop .src-success-title { font-size: 15px; font-weight: 700; color: #111827; }
      #subsrf-modal-backdrop .src-success-sub { font-size: 13px; color: #6b7280; margin-top: 5px; }
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
            <div class="src-header">
              <img class="src-logo" src="${logoSrc}" alt="">
              <span class="src-name">Subsrf Intelligence</span>
              <button class="src-close" type="button">×</button>
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
            <button class="src-cta src-cta-muted" id="subsrf-manage-btn" type="button">Manage connection</button>
            <p class="src-caption">One-click setup · Secure OAuth · Turn it off anytime</p>
          </div>`;
      } else {
        backdrop.innerHTML = `
          <div class="src-modal">
            <div class="src-header">
              <img class="src-logo" src="${logoSrc}" alt="">
              <span class="src-name">Subsrf Intelligence</span>
              <button class="src-close" type="button">×</button>
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
      backdrop.querySelector('.src-close').addEventListener('click', closeModal);
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
            <div class="src-success-check">✓</div>
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
