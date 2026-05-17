// Subsrf × Claude.ai — connector card
// Runs only on claude.ai. When the user has a Pro/Starter Subsrf account and
// hasn't connected yet, injects a VidIQ-style card offering one-click setup.

(function () {
  'use strict';
  if (window.__subsrfClaudeInit) return;
  window.__subsrfClaudeInit = true;

  const MCP_URL       = 'https://api.subsrf.dev/mcp';
  const CARD_ID       = 'subsrf-claude-card';
  const CONNECTED_KEY = 'subsrf_claude_connected';
  const DISMISSED_KEY = 'subsrf_claude_dismissed';
  const DISMISS_TTL   = 7 * 24 * 60 * 60 * 1000; // re-show after 7 days

  // ── Styles ────────────────────────────────────────────────────────────────

  function injectStyles() {
    if (document.getElementById('subsrf-claude-styles')) return;
    const s = document.createElement('style');
    s.id = 'subsrf-claude-styles';
    s.textContent = `
      #subsrf-claude-card {
        background: #fff;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 20px 20px 16px;
        width: 100%;
        max-width: 620px;
        margin: 0 auto 20px;
        box-shadow: 0 1px 4px rgba(0,0,0,0.07);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        position: relative;
        box-sizing: border-box;
        animation: subsrf-fade-in 0.25s ease;
      }
      @keyframes subsrf-fade-in {
        from { opacity: 0; transform: translateY(6px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      #subsrf-claude-card .src-header {
        display: flex; align-items: center; gap: 10px; margin-bottom: 14px;
      }
      #subsrf-claude-card .src-logo {
        width: 28px; height: 28px; border-radius: 6px; object-fit: contain;
      }
      #subsrf-claude-card .src-name {
        font-size: 13px; font-weight: 600; color: #111827; flex: 1;
      }
      #subsrf-claude-card .src-dismiss {
        background: none; border: none; color: #9ca3af; cursor: pointer;
        font-size: 20px; line-height: 1; padding: 2px 5px; border-radius: 4px;
      }
      #subsrf-claude-card .src-dismiss:hover { color: #374151; background: #f3f4f6; }
      #subsrf-claude-card h2 {
        font-size: 17px; font-weight: 700; color: #111827; margin: 0 0 12px; line-height: 1.35;
      }
      #subsrf-claude-card .src-chips {
        display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px;
      }
      #subsrf-claude-card .src-chip {
        background: #f3f4f6; border-radius: 999px; padding: 4px 12px;
        font-size: 12px; color: #374151; font-weight: 500;
      }
      #subsrf-claude-card .src-chip b { color: #059669; }
      #subsrf-claude-card .src-prompts {
        border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-bottom: 16px;
      }
      #subsrf-claude-card .src-prompt {
        display: flex; align-items: center; justify-content: space-between;
        padding: 11px 14px; font-size: 13px; color: #374151;
        border-bottom: 1px solid #f3f4f6;
      }
      #subsrf-claude-card .src-prompt:last-child { border-bottom: none; }
      #subsrf-claude-card .src-lock { font-size: 12px; color: #d1d5db; }
      #subsrf-claude-card .src-cta {
        width: 100%; background: #111827; color: #fff; border: none;
        border-radius: 8px; padding: 13px 20px; font-size: 14px; font-weight: 600;
        cursor: pointer; display: flex; align-items: center; justify-content: center;
        gap: 8px; transition: background .15s; box-sizing: border-box;
      }
      #subsrf-claude-card .src-cta:hover { background: #1f2937; }
      #subsrf-claude-card .src-cta:disabled { opacity: 0.6; cursor: default; }
      #subsrf-claude-card .src-caption {
        text-align: center; font-size: 11px; color: #9ca3af; margin-top: 10px;
      }
      #subsrf-claude-card .src-success {
        text-align: center; padding: 16px 0;
      }
      #subsrf-claude-card .src-success-icon {
        width: 36px; height: 36px; border-radius: 50%; background: #d1fae5;
        display: flex; align-items: center; justify-content: center;
        margin: 0 auto 10px; font-size: 18px;
      }
      #subsrf-claude-card .src-success-title { font-size: 15px; font-weight: 700; color: #111827; }
      #subsrf-claude-card .src-success-sub   { font-size: 13px; color: #6b7280; margin-top: 4px; }
    `;
    document.head.appendChild(s);
  }

  // ── Card DOM ──────────────────────────────────────────────────────────────

  function buildCard() {
    const card = document.createElement('div');
    card.id = CARD_ID;
    const logoSrc = (typeof chrome !== 'undefined' && chrome.runtime)
      ? chrome.runtime.getURL('icons/icon48.png') : '';
    card.innerHTML = `
      <div class="src-header">
        ${logoSrc ? `<img class="src-logo" src="${logoSrc}" alt="">` : ''}
        <span class="src-name">Subsrf Intelligence</span>
        <button class="src-dismiss" id="subsrf-dismiss" title="Dismiss">×</button>
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
      <button class="src-cta" id="subsrf-connect-btn">
        Connect Figma Intelligence
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </button>
      <p class="src-caption">One-click setup · Secure OAuth · Turn it off anytime</p>
    `;
    return card;
  }

  // ── Connect logic ─────────────────────────────────────────────────────────

  // Attempt to add the MCP server via Claude.ai's internal API.
  // Returns true on success, throws on failure.
  async function tryDirectAPI() {
    // Discover the user's org UUID from Claude.ai's account endpoint
    const accountRes = await fetch('https://claude.ai/api/auth/account', { credentials: 'include' });
    if (!accountRes.ok) throw new Error(`account ${accountRes.status}`);
    const account = await accountRes.json();

    const orgUuid =
      account?.account?.memberships?.[0]?.organization?.uuid ||
      account?.memberships?.[0]?.organization?.uuid ||
      account?.organization?.uuid;
    if (!orgUuid) throw new Error('no orgUuid');

    // Try the known MCP/integrations endpoint patterns
    const endpoints = [
      `https://claude.ai/api/organizations/${orgUuid}/integrations`,
      `https://claude.ai/api/organizations/${orgUuid}/mcp_servers`,
    ];

    for (const url of endpoints) {
      const res = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: MCP_URL, name: 'Subsrf Intelligence' }),
      });
      if (res.ok || res.status === 409 /* already exists */) return true;
    }
    throw new Error('all endpoints failed');
  }

  // Fallback: navigate to the connectors settings page.
  // A second observer on that page auto-fills the URL input.
  function redirectToConnectors() {
    chrome.storage.local.set({ subsrf_pending_mcp_url: MCP_URL });
    window.location.href = 'https://claude.ai/customize/connectors';
  }

  async function handleConnect() {
    const btn = document.getElementById('subsrf-connect-btn');
    if (!btn) return;
    btn.disabled = true;
    btn.innerHTML = '<span style="opacity:.6">Connecting…</span>';

    try {
      await tryDirectAPI();
      chrome.storage.local.set({ [CONNECTED_KEY]: true });
      showSuccess();
    } catch (e) {
      console.log('[Subsrf] Direct API unavailable, redirecting to connectors settings:', e.message);
      redirectToConnectors();
    }
  }

  function handleDismiss() {
    chrome.storage.local.set({ [DISMISSED_KEY]: Date.now() });
    document.getElementById(CARD_ID)?.remove();
  }

  function showSuccess() {
    const card = document.getElementById(CARD_ID);
    if (!card) return;
    card.innerHTML = `
      <div class="src-success">
        <div class="src-success-icon">✓</div>
        <div class="src-success-title">Subsrf connected!</div>
        <div class="src-success-sub">Figma Intelligence is ready in this conversation.</div>
      </div>
    `;
    setTimeout(() => card.remove(), 3000);
  }

  // ── Injection ─────────────────────────────────────────────────────────────

  async function shouldShow() {
    return new Promise(resolve => {
      chrome.storage.local.get(['subsrf_session', CONNECTED_KEY, DISMISSED_KEY], data => {
        const tier = data.subsrf_session?.tier?.toLowerCase();
        if (!['pro', 'starter'].includes(tier)) return resolve(false);
        if (data[CONNECTED_KEY]) return resolve(false);
        if (data[DISMISSED_KEY] && Date.now() - data[DISMISSED_KEY] < DISMISS_TTL) return resolve(false);
        resolve(true);
      });
    });
  }

  function findInjectionTarget() {
    // Try progressively broader selectors to find a stable anchor above the input
    const selectors = [
      '[data-testid="empty-conversation-container"]',
      '[data-testid="conversation"]',
      '.flex-col.items-center .w-full',
      'main .mx-auto',
      'main',
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  async function tryInject() {
    if (document.getElementById(CARD_ID)) return;

    // Only show on conversation pages, not settings/customize
    const path = location.pathname;
    if (path.startsWith('/customize') || path.startsWith('/settings')) return;

    if (!(await shouldShow())) return;

    injectStyles();
    const card = buildCard();
    card.querySelector('#subsrf-dismiss').addEventListener('click', handleDismiss);
    card.querySelector('#subsrf-connect-btn').addEventListener('click', handleConnect);

    const target = findInjectionTarget();
    if (target) {
      target.prepend(card);
    } else {
      // Last resort: fixed overlay above the input bar
      Object.assign(card.style, {
        position: 'fixed', bottom: '96px', left: '50%',
        transform: 'translateX(-50%)', zIndex: '9998',
        maxWidth: '580px', width: 'calc(100% - 32px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
      });
      document.body.appendChild(card);
    }
  }

  // ── Auto-fill on /customize/connectors ───────────────────────────────────
  // If the user was redirected here by the card, find the URL input and fill it in.

  function tryAutoFill() {
    if (!location.pathname.startsWith('/customize/connectors')) return;

    chrome.storage.local.get('subsrf_pending_mcp_url', ({ subsrf_pending_mcp_url }) => {
      if (!subsrf_pending_mcp_url) return;

      // Watch for the input to appear (page may still be rendering)
      const observer = new MutationObserver(() => {
        const input =
          document.querySelector('input[placeholder*="url" i]') ||
          document.querySelector('input[placeholder*="mcp" i]') ||
          document.querySelector('input[type="url"]');
        if (!input) return;

        observer.disconnect();
        input.focus();
        // Use native input value setter so React's onChange fires
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeInputValueSetter.call(input, subsrf_pending_mcp_url);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));

        chrome.storage.local.remove('subsrf_pending_mcp_url');
      });
      observer.observe(document.body, { childList: true, subtree: true });

      // Run once immediately in case the input is already there
      observer.takeRecords();
    });
  }

  // ── Init & SPA navigation ─────────────────────────────────────────────────

  let lastHref = location.href;

  function onUrlChange() {
    if (location.href === lastHref) return;
    lastHref = location.href;
    tryAutoFill();
    setTimeout(tryInject, 1400);
  }

  // Initial run
  setTimeout(() => { tryAutoFill(); tryInject(); }, 1400);

  // Watch for SPA navigations
  new MutationObserver(onUrlChange).observe(document.documentElement, {
    childList: true, subtree: true,
  });
})();
