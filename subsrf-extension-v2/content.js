// Subsrf Intelligence — Content Engine v2.8 (Professional Workflow Update)
(function() {
  if (window.__subsrfRunning) {
    console.log('[Subsrf] Already running, skipping re-init to prevent duplicate listeners.');
    return;
  }
  window.__subsrfRunning = true;

  let isCapturingUI = false;
  let currentMode = 'click';
  let highlightedElements = [];
  let toolbar = null;
  let toast = null;
  let regionOverlay = null;
  let dragStart = null;
  let isDragging = false;
  let cachedTier = 'free';

  // Load tier from storage — avoids waking the service worker
  chrome.storage.local.get('subsrf_session', (data) => {
    cachedTier = data.subsrf_session?.tier || 'free';
  });

  const FREE_ELEMENT_LIMIT = 5;

  console.log('[Subsrf] Capture Engine v2.8 Online.');

  // --- Inject toolbar styles directly so they're immune to CSS caching ---
  (function injectStyles() {
    if (document.getElementById('uipb-styles')) return;
    const s = document.createElement('style');
    s.id = 'uipb-styles';
    s.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200');

      /* ── Toolbar shell ── */
      .uipb-toolbar {
        position: fixed !important; bottom: 32px !important; left: 50% !important;
        transform: translateX(-50%) translateY(16px) !important;
        display: flex !important; align-items: stretch !important; flex-wrap: nowrap !important;
        background: #111118 !important; border: 1px solid rgba(242,242,244,0.12) !important;
        border-radius: 12px !important; overflow: hidden !important;
        box-shadow: 0 24px 60px rgba(0,0,0,0.7) !important;
        z-index: 2147483647 !important; opacity: 0 !important; pointer-events: none !important;
        transition: opacity 0.22s ease, transform 0.22s ease !important;
      }
      .uipb-toolbar.show { opacity: 1 !important; transform: translateX(-50%) translateY(0) !important; pointer-events: auto !important; }

      /* ── Counter section ── */
      .uipb-counter {
        display: flex !important; flex-direction: column !important; justify-content: center !important;
        padding: 8px 32px !important; min-width: 120px !important;
        background: #0C0C12 !important; border-right: 1px solid rgba(242,242,244,0.12) !important;
      }
      .uipb-count {
        font-family: 'Azeret Mono', monospace !important; font-size: 13px !important;
        font-weight: 700 !important; line-height: 1.4 !important; color: #00FF87 !important;
        text-shadow: 0 0 8px rgba(0,255,135,0.4) !important;
      }
      .uipb-count-label {
        font-family: 'Azeret Mono', monospace !important; font-size: 10px !important;
        letter-spacing: 2px !important; text-transform: uppercase !important;
        color: rgba(242,242,244,0.55) !important; margin-top: 2px !important;
      }

      /* ── Tool buttons section ── */
      .uipb-tools {
        display: flex !important; align-items: center !important; gap: 8px !important;
        padding: 8px 16px !important; border-right: 1px solid rgba(242,242,244,0.12) !important;
      }
      .uipb-tool {
        display: flex !important; align-items: center !important; gap: 4px !important;
        padding: 8px 16px !important; border-radius: 12px !important;
        background: transparent !important; border: 1px solid transparent !important;
        color: rgba(242,242,244,0.55) !important; cursor: pointer !important;
        font-family: 'Manrope', -apple-system, sans-serif !important; font-size: 14px !important;
        font-weight: 400 !important; white-space: nowrap !important;
        transition: background 0.15s, color 0.15s !important;
      }
      .uipb-tool:hover { background: #202028 !important; color: #F2F2F4 !important; }
      .uipb-tool.active { background: #00FF87 !important; color: #050508 !important; }
      .uipb-tool.active:hover { background: #60ff98 !important; }
      .uipb-icon { font-size: 18px !important; font-variation-settings: 'FILL' 0 !important; }
      .uipb-icon-fill { font-variation-settings: 'FILL' 1 !important; }

      /* ── Actions section ── */
      .uipb-actions {
        display: flex !important; align-items: center !important; gap: 16px !important;
        padding: 8px 16px !important;
      }
      .uipb-action-btn {
        display: flex !important; align-items: center !important; gap: 4px !important;
        padding: 8px !important; background: transparent !important; border: none !important;
        cursor: pointer !important; white-space: nowrap !important;
        font-family: 'Manrope', -apple-system, sans-serif !important; font-size: 14px !important;
        transition: color 0.15s !important;
      }
      .uipb-action-btn:disabled { opacity: 0.3 !important; cursor: default !important; }
      .uipb-action-danger { color: rgba(242,242,244,0.55) !important; }
      .uipb-action-danger:hover:not(:disabled) { color: #FF4D4D !important; }
      .uipb-action-neon { color: #00FF87 !important; }
      .uipb-action-neon:hover:not(:disabled) { color: #60ff98 !important; }
      .uipb-sep { width: 1px !important; height: 24px !important; background: rgba(242,242,244,0.12) !important; flex-shrink: 0 !important; }
      .uipb-close-btn {
        display: flex !important; align-items: center !important; justify-content: center !important;
        padding: 8px !important; border-radius: 12px !important;
        background: transparent !important; border: 1px solid transparent !important;
        color: rgba(242,242,244,0.55) !important; cursor: pointer !important;
        transition: background 0.15s, color 0.15s, border-color 0.15s !important;
        margin-left: 4px !important; margin-right: 4px !important;
      }
      .uipb-close-btn:hover { background: #202028 !important; color: #F2F2F4 !important; border-color: rgba(242,242,244,0.12) !important; }

      /* ── Selection overlays ── */
      .uipb-highlight-box { position: absolute !important; border: 1px solid #00FF87 !important; background: rgba(0,255,135,0.05) !important; pointer-events: none !important; z-index: 2147483646 !important; box-sizing: border-box !important; }
      .uipb-badge { position: absolute !important; background: #111118 !important; color: #00FF87 !important; font-family: 'Azeret Mono', monospace !important; font-size: 10px !important; font-weight: 700 !important; padding: 2px 6px !important; z-index: 2147483647 !important; pointer-events: none !important; border: 1px solid rgba(0,255,135,0.35) !important; transform: translate(-50%,-50%) !important; }
      .uipb-region-overlay { position: absolute !important; border: 1px solid #00FF87 !important; background: rgba(0,255,135,0.05) !important; pointer-events: none !important; z-index: 2147483645 !important; box-sizing: border-box !important; }

      /* ── Toast ── */
      #uipb-toast { position: fixed; bottom: 24px; right: 24px; background: #111118; color: #F2F2F4; font-family: 'Azeret Mono', monospace; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; padding: 10px 16px; z-index: 2147483647; opacity: 0; transform: translateY(8px); transition: all 0.25s ease; border: 1px solid rgba(242,242,244,0.08); box-shadow: 0 12px 32px rgba(0,0,0,0.5); pointer-events: none; border-radius: 8px; }
      #uipb-toast.show { opacity: 1; transform: translateY(0); }
    `;
    document.head.appendChild(s);
  })();

  // --- Communication ---
  function isExtensionAlive() {
    try { return !!chrome.runtime?.id; } catch (e) { return false; }
  }

  function safeSendMessage(msg) {
    if (!isExtensionAlive()) return;
    try {
      chrome.runtime.sendMessage(msg, () => {
        try { if (chrome.runtime.lastError) { /* ignore */ } } catch (e) {}
      });
    } catch (e) {}
  }

  function broadcastUpdate() {
    const data = highlightedElements.map(h => h.data);
    const payload = {
      type: 'ELEMENTS_UPDATE',
      elements: data,
      context: {
        title: document.title,
        url: window.location.href,
        viewport: { w: window.innerWidth, h: window.innerHeight }
      }
    };
    // Background worker handles the Railway POST with a fresh token via getAuthState()
    safeSendMessage(payload);
  }

  // --- Style Extraction ---
  function getElementStyles(el) {
    const s = window.getComputedStyle(el);
    const styles = {};
    const props = [
      'backgroundColor', 'color', 'fontSize', 'fontFamily', 'fontWeight',
      'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
      'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
      'borderTopWidth', 'borderTopColor', 'borderTopStyle',
      'borderRightWidth', 'borderRightColor', 'borderRightStyle',
      'borderBottomWidth', 'borderBottomColor', 'borderBottomStyle',
      'borderLeftWidth', 'borderLeftColor', 'borderLeftStyle',
      'borderRadius', 'borderTopLeftRadius', 'borderTopRightRadius',
      'borderBottomRightRadius', 'borderBottomLeftRadius',
      'boxShadow', 'display', 'flexDirection', 'flexWrap', 'gap',
      'justifyContent', 'alignItems', 'flexGrow',
      'opacity', 'zIndex', 'position', 'lineHeight', 'letterSpacing',
      'textAlign', 'textDecoration', 'textTransform', 'overflow',
      'backgroundImage', 'objectFit', 'mixBlendMode',
      'backdropFilter', 'filter'
    ];
    props.forEach(p => { styles[p] = s[p]; });
    return styles;
  }

  // --- UI Elements ---

  function addHighlight(el) {
    if (!el || el === document.body || el === document.documentElement) return;
    if (el.closest('[id^="uipb-"], [class*="uipb-"], [id^="subsrf"]')) return;
    if (cachedTier === 'free' && highlightedElements.length >= FREE_ELEMENT_LIMIT) {
      showToast(`Free plan limited to ${FREE_ELEMENT_LIMIT} elements — upgrade to Starter`);
      return;
    }

    const rect = el.getBoundingClientRect();
    const box = document.createElement('div');
    box.className = 'uipb-highlight-box';
    box.style.cssText = `
      position: absolute;
      top: ${rect.top + window.scrollY}px;
      left: ${rect.left + window.scrollX}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
    `;

    const badge = document.createElement('div');
    badge.className = 'uipb-badge';
    badge.innerText = highlightedElements.length + 1;
    box.appendChild(badge);
    document.body.appendChild(box);

    highlightedElements.push({
      element: el,
      box: box,
      data: {
        tagName: el.tagName,
        cls: el.className,
        text: el.innerText ? el.innerText.substring(0, 100) : '',
        rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
        styles: getElementStyles(el),
        attributes: {
          src:  el.src  || (el.getAttribute && el.getAttribute('src'))  || '',
          alt:  el.alt  || (el.getAttribute && el.getAttribute('alt'))  || '',
          href: el.href || (el.getAttribute && el.getAttribute('href')) || '',
        }
      }
    });

    // Make box interactive for hover/click deselect
    box.style.setProperty('pointer-events', 'auto', 'important');
    box.style.cursor = 'pointer';

    box.addEventListener('mouseenter', () => {
      box.style.setProperty('border-color', 'rgba(255,80,80,0.8)', 'important');
      box.style.setProperty('background', 'rgba(255,80,80,0.08)', 'important');
      badge.innerHTML = `<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 2L8 8M8 2L2 8" stroke="#ff5555" stroke-width="1.8" stroke-linecap="round"/></svg>`;
      badge.style.borderColor = 'rgba(255,80,80,0.5)';
    });

    box.addEventListener('mouseleave', () => {
      box.style.removeProperty('border-color');
      box.style.removeProperty('background');
      const idx = highlightedElements.findIndex(h => h.element === el);
      badge.innerText = idx + 1;
      badge.style.borderColor = '';
    });

    box.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      const idx = highlightedElements.findIndex(h => h.element === el);
      if (idx > -1) {
        box.remove();
        highlightedElements.splice(idx, 1);
        highlightedElements.forEach((h, i) => {
          const b = h.box.querySelector('.uipb-badge');
          if (b) b.innerText = i + 1;
        });
        broadcastUpdate();
        updateToolbar();
      }
    });

    broadcastUpdate();
    updateToolbar();
  }

  function showToast(msg) {
    if (toast) toast.remove();
    toast = document.createElement('div');
    toast.id = 'uipb-toast';
    toast.className = 'show';
    toast.innerText = msg;
    document.body.appendChild(toast);
    setTimeout(() => { if (toast) toast.remove(); }, 3000);
  }

  function exitSelection() {
    isCapturingUI = false;
    if (toolbar) toolbar.classList.remove('show');
    if (regionOverlay) regionOverlay.remove();
    highlightedElements.forEach(h => h.box.remove());
    highlightedElements = [];
    broadcastUpdate();
    showToast('Selection Mode Deactivated');
  }

  function createToolbar() {
    let existing = document.getElementById('uipb-toolbar');
    if (existing) {
      existing.classList.add('show');
      toolbar = existing;
      updateToolbar();
      return;
    }
    toolbar = document.createElement('div');
    toolbar.id = 'uipb-toolbar';
    toolbar.className = 'uipb-toolbar show';
    document.body.appendChild(toolbar);
    updateToolbar();
  }

  function updateToolbar() {
    if (!toolbar) return;
    const count = highlightedElements.length;
    const noItems = count === 0 ? 'disabled' : '';
    toolbar.innerHTML = `
      <div class="uipb-counter">
        <span class="uipb-count">${count}</span>
        <span class="uipb-count-label">ELEMENTS</span>
      </div>
      <div class="uipb-tools">
        <button id="uipb-btn-click" class="uipb-tool ${currentMode === 'click' ? 'active' : ''}">
          <span class="material-symbols-outlined uipb-icon ${currentMode === 'click' ? 'uipb-icon-fill' : ''}">ads_click</span>
          Smart Select
        </button>
        <button id="uipb-btn-area" class="uipb-tool ${currentMode === 'region' ? 'active' : ''}">
          <span class="material-symbols-outlined uipb-icon ${currentMode === 'region' ? 'uipb-icon-fill' : ''}">crop</span>
          Region Tool
        </button>
      </div>
      <div class="uipb-actions">
        <button id="uipb-clear-all" class="uipb-action-btn uipb-action-danger" ${noItems}>
          <svg class="uipb-icon" viewBox="0 -960 960 960" xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor">
            <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/>
          </svg>
          Clear All
        </button>
        <button id="uipb-preview" class="uipb-action-btn uipb-action-neon" ${noItems}>
          <svg class="uipb-icon" viewBox="0 -960 960 960" xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor">
            <path d="M320-280v-80h400v80H320ZM226-424l-56-56 164-164-164-164 56-56 220 220-220 220Z"/>
          </svg>
          Show AI Prompt
        </button>
        <div class="uipb-sep"></div>
        <button id="uipb-exit" class="uipb-close-btn" title="Exit Inspector">
          <svg viewBox="0 -960 960 960" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor">
            <path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/>
          </svg>
        </button>
      </div>
    `;

    const btnClick = toolbar.querySelector('#uipb-btn-click');
    const btnArea  = toolbar.querySelector('#uipb-btn-area');
    const btnExit  = toolbar.querySelector('#uipb-exit');
    
    if (btnClick) btnClick.onclick = (e) => { e.stopPropagation(); currentMode = 'click'; updateToolbar(); };
    if (btnArea)  btnArea.onclick  = (e) => { e.stopPropagation(); currentMode = 'region'; updateToolbar(); };
    if (btnExit)  btnExit.onclick  = (e) => { e.stopPropagation(); exitSelection(); };

    const clearAllBtn = toolbar.querySelector('#uipb-clear-all');
    if (clearAllBtn && highlightedElements.length > 0) {
      clearAllBtn.onclick = (e) => {
        e.stopPropagation();
        highlightedElements.forEach(h => h.box.remove());
        highlightedElements = [];
        broadcastUpdate();
        updateToolbar();
      };
    }

    const prevBtn = toolbar.querySelector('#uipb-preview');
    if (prevBtn && highlightedElements.length > 0) {
      prevBtn.onclick = (e) => { e.stopPropagation(); showPreviewModal(); };
    }
  }

  function showPreviewModal() {
    try {
      // Use a port to guarantee the MV3 service worker is awake before sending
      const port = chrome.runtime.connect({ name: 'subsrf-prompt' });
      port.postMessage({ type: 'OPEN_PROMPT_PAGE' });
      port.disconnect();
    } catch (e) {}
    showToast('Opening Prompt Studio...');
  }

  // --- Selection Bounding Box ---
  function getSelectionBoundingBox() {
    if (highlightedElements.length === 0) return null;
    let minLeft = Infinity, minTop = Infinity, maxRight = -Infinity, maxBottom = -Infinity;
    highlightedElements.forEach(h => {
      const r = h.data.rect;
      minLeft   = Math.min(minLeft,   r.left);
      minTop    = Math.min(minTop,    r.top);
      maxRight  = Math.max(maxRight,  r.left + r.width);
      maxBottom = Math.max(maxBottom, r.top  + r.height);
    });
    const PAD = 24;
    return {
      x: Math.max(0, minLeft - PAD),
      y: Math.max(0, minTop  - PAD),
      w: Math.min(window.innerWidth,  maxRight  + PAD) - Math.max(0, minLeft - PAD),
      h: Math.min(window.innerHeight, maxBottom + PAD) - Math.max(0, minTop  - PAD),
    };
  }

  // --- Region / Screenshot Logic ---
  function startRegion(e) {
    if (!isCapturingUI || (currentMode !== 'region' && currentMode !== 'screenshot')) return;
    if (e.target.closest('#uipb-toolbar')) return;
    
    isDragging = true;
    dragStart = { x: e.pageX, y: e.pageY };
    regionOverlay = document.createElement('div');
    regionOverlay.className = 'uipb-region-overlay';
    document.body.appendChild(regionOverlay);
    e.preventDefault();
  }

  function moveRegion(e) {
    if (!isDragging || !regionOverlay) return;
    const x = Math.min(e.pageX, dragStart.x);
    const y = Math.min(e.pageY, dragStart.y);
    const w = Math.abs(e.pageX - dragStart.x);
    const h = Math.abs(e.pageY - dragStart.y);
    regionOverlay.style.left = x + 'px';
    regionOverlay.style.top = y + 'px';
    regionOverlay.style.width = w + 'px';
    regionOverlay.style.height = h + 'px';
  }

  function endRegion(_e) {
    if (!isDragging) return;
    isDragging = false;
    if (regionOverlay) {
      const rect = regionOverlay.getBoundingClientRect();

      if (currentMode === 'region') {
        // Select all elements within the drawn region — no screenshot
        const candidates = document.querySelectorAll('div, h1, h2, h3, h4, p, span, img, button, a');
        candidates.forEach(el => {
          if (el.closest('[id^="uipb-"], [class*="uipb-"], [id^="subsrf"]')) return;
          const r = el.getBoundingClientRect();
          if (r.top >= rect.top && r.left >= rect.left && r.bottom <= rect.bottom && r.right <= rect.right) {
            if (!highlightedElements.find(h => h.element === el)) addHighlight(el);
          }
        });
        const hitCap = cachedTier === 'free' && highlightedElements.length >= FREE_ELEMENT_LIMIT;
        showToast(hitCap
          ? `${FREE_ELEMENT_LIMIT} elements selected (Free limit — upgrade to Starter for unlimited)`
          : `${highlightedElements.length} elements selected`);

      } else if (currentMode === 'screenshot') {
        // Area screenshot — hide UI, capture region, open editor
        if (toolbar) toolbar.style.opacity = '0';
        document.querySelectorAll('.uipb-highlight-box, .uipb-badge').forEach(el => { el.style.opacity = '0'; });

        safeSendMessage({
          type: 'CAPTURE_REGION',
          rect: { x: rect.left, y: rect.top, w: rect.width, h: rect.height },
          viewportWidth: window.innerWidth
        });

        setTimeout(() => {
          if (toolbar) toolbar.style.opacity = '';
          document.querySelectorAll('.uipb-highlight-box, .uipb-badge').forEach(el => { el.style.opacity = ''; });
          showToast('Screenshot captured!');
        }, 1200);
      }

      regionOverlay.remove();
      regionOverlay = null;
    }
  }

  // --- Full Page Capture ---
  function handleFullPageAction() {
    showToast('Preparing Full Page Capture...');
    safeSendMessage({ type: 'TRIGGER_FULL_PAGE_CAPTURE' });
    // Background controls scrolling, UI hiding, and stitching from here on
  }

  // --- Event Listeners ---
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === 'PING') { sendResponse({ pong: true }); return true; }

    if (msg.type === 'SET_MODE') {
      isCapturingUI = true;
      currentMode = msg.mode;
      if (msg.mode !== 'screenshot') createToolbar();
      const modeLabel = msg.mode === 'click' ? 'Smart Select' : msg.mode === 'region' ? 'Region Tool' : 'Screenshot';
      showToast(`${modeLabel} Active — Draw an area`);
      sendResponse({ ok: true });
      return true;
    }

    if (msg.type === 'TRIGGER_FULL_PAGE') {
      handleFullPageAction();
      sendResponse({ ok: true });
      return true;
    }

    // --- Scroll-control handlers used by the full-page capture loop ---
    if (msg.type === 'GET_PAGE_DIMENSIONS') {
      sendResponse({
        totalHeight: document.documentElement.scrollHeight,
        viewportHeight: window.innerHeight,
        viewportWidth: window.innerWidth,
        dpr: window.devicePixelRatio || 1,
        originalScrollY: window.scrollY
      });
      return true;
    }

    if (msg.type === 'SCROLL_TO') {
      window.scrollTo({ top: msg.y, behavior: 'instant' });
      sendResponse({ ok: true });
      return true;
    }

    if (msg.type === 'HIDE_UI') {
      if (toolbar) toolbar.style.opacity = '0';
      if (toast) toast.style.opacity = '0';
      document.querySelectorAll('.uipb-highlight-box, .uipb-badge').forEach(el => { el.style.opacity = '0'; });
      sendResponse({ ok: true });
      return true;
    }

    if (msg.type === 'SHOW_UI') {
      if (toolbar) toolbar.style.opacity = '';
      if (toast) toast.style.opacity = '';
      document.querySelectorAll('.uipb-highlight-box, .uipb-badge').forEach(el => { el.style.opacity = ''; });
      sendResponse({ ok: true });
      return true;
    }

    if (msg.type === 'CLEAR_SELECTION') {
      highlightedElements.forEach(h => h.box.remove());
      highlightedElements = [];
      broadcastUpdate();
      updateToolbar();
      sendResponse({ ok: true });
      return true;
    }

    return false; // Don't keep port open for unhandled message types
  });

  document.addEventListener('mousedown', startRegion);
  document.addEventListener('mousemove', moveRegion, { passive: true });
  document.addEventListener('mouseup', endRegion);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isCapturingUI) {
      exitSelection();
    }
  });

  document.addEventListener('click', (e) => {
    if (!isCapturingUI) return;
    if (e.target.closest('#uipb-toolbar, .uipb-highlight-box, .uipb-badge')) return;

    const idx = highlightedElements.findIndex(h => h.element === e.target);

    if (idx > -1) {
      // Always allow deselecting an already-highlighted element regardless of mode
      e.preventDefault();
      e.stopPropagation();
      highlightedElements[idx].box.remove();
      highlightedElements.splice(idx, 1);
      highlightedElements.forEach((h, i) => {
        const b = h.box.querySelector('.uipb-badge');
        if (b) { b.innerText = i + 1; }
      });
      broadcastUpdate();
    } else if (currentMode === 'click') {
      // Only add new elements in click mode
      e.preventDefault();
      e.stopPropagation();
      addHighlight(e.target);
      broadcastUpdate();
    }
  }, true);

})();
