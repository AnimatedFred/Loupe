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

  console.log('[Subsrf] Capture Engine v2.8 Online.');

  // --- Inject toolbar styles directly so they're immune to CSS caching ---
  (function injectStyles() {
    if (document.getElementById('uipb-styles')) return;
    const s = document.createElement('style');
    s.id = 'uipb-styles';
    s.textContent = `
      .uipb-toolbar {
        position: fixed !important;
        bottom: 32px; left: 50%;
        transform: translateX(-50%) translateY(20px);
        background: #0C0C12 !important;
        backdrop-filter: blur(12px) !important;
        -webkit-backdrop-filter: blur(12px) !important;
        border: 1px solid rgba(255,255,255,0.08) !important;
        border-radius: 16px !important;
        padding: 8px !important;
        display: flex !important; align-items: center !important; gap: 8px !important;
        z-index: 2147483647 !important;
        box-shadow: 0 20px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,255,135,0.08) !important;
        opacity: 0; pointer-events: none;
        transition: all 0.4s cubic-bezier(0.16,1,0.3,1) !important;
      }
      .uipb-toolbar.show { opacity: 1 !important; transform: translateX(-50%) translateY(0) !important; pointer-events: auto !important; }
      .uipb-toolbar-btn {
        background: transparent !important; color: rgba(242,242,244,0.55) !important;
        border: none !important; padding: 10px 16px !important; border-radius: 10px !important;
        font-family: 'Manrope', -apple-system, sans-serif !important; font-size: 13px !important;
        font-weight: 600 !important; cursor: pointer !important;
        display: flex !important; align-items: center !important; gap: 8px !important;
        transition: all 0.2s ease !important; white-space: nowrap !important;
      }
      .uipb-toolbar-btn:hover { background: rgba(242,242,244,0.06) !important; color: #F2F2F4 !important; }
      .uipb-toolbar-btn.primary { background: #00FF87 !important; color: #050508 !important; }
      .uipb-toolbar-btn.primary:hover { background: #00e87a !important; box-shadow: 0 4px 12px rgba(0,255,135,0.25) !important; }
      .uipb-toolbar-btn.secondary { background: transparent !important; color: #00FF87 !important; border: 1px solid rgba(0,255,135,0.35) !important; }
      .uipb-toolbar-btn.secondary:hover { background: rgba(0,255,135,0.08) !important; border-color: rgba(0,255,135,0.6) !important; }
      .uipb-toolbar-btn.secondary:disabled { color: rgba(0,255,135,0.3) !important; border-color: rgba(0,255,135,0.12) !important; }
      .uipb-toolbar-divider { width: 1px !important; height: 20px !important; background: rgba(242,242,244,0.08) !important; margin: 0 4px !important; }
      .uipb-toolbar-info { color: rgba(242,242,244,0.55) !important; font-family: 'Azeret Mono', monospace !important; font-size: 12px !important; margin-left: 8px !important; margin-right: 12px !important; }
      .uipb-highlight-box { position: absolute !important; border: 2px solid #00FF87 !important; background: rgba(0,255,135,0.06) !important; pointer-events: none !important; z-index: 2147483646 !important; box-sizing: border-box !important; border-radius: 4px !important; }
      .uipb-badge { position: absolute !important; background: #0C0C12 !important; color: #00FF87 !important; font-family: 'Azeret Mono', monospace !important; font-size: 10px !important; font-weight: 700 !important; padding: 2px 6px !important; border-radius: 4px !important; z-index: 2147483647 !important; pointer-events: none !important; border: 1px solid rgba(0,255,135,0.35) !important; box-shadow: 0 4px 12px rgba(0,255,135,0.15) !important; transform: translate(-50%,-50%) !important; }
      .uipb-region-overlay { position: absolute !important; border: 1px solid #00FF87 !important; background: rgba(0,255,135,0.06) !important; pointer-events: none !important; z-index: 2147483645 !important; box-sizing: border-box !important; }
      #uipb-toast { position: fixed; bottom: 24px; right: 24px; background: #0C0C12; color: #F2F2F4; font-family: 'Manrope', -apple-system, sans-serif; font-size: 13px; font-weight: 700; padding: 12px 20px; border-radius: 12px; z-index: 2147483647; opacity: 0; transform: translateY(8px); transition: all 0.3s cubic-bezier(0.16,1,0.3,1); border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 12px 32px rgba(0,0,0,0.5); pointer-events: none; }
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
      'borderTopWidth', 'borderTopColor', 'borderTopStyle', 'borderRadius', 'boxShadow',
      'display', 'flexDirection', 'gap', 'justifyContent', 'alignItems', 'flexGrow',
      'opacity', 'zIndex', 'position', 'lineHeight', 'textAlign', 'overflow'
    ];
    props.forEach(p => { styles[p] = s[p]; });
    return styles;
  }

  // --- UI Elements ---
  function addHighlight(el) {
    if (!el || el === document.body || el === document.documentElement) return;
    if (el.closest('#uipb-toolbar, .uipb-highlight-box')) return;

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
    toolbar.innerHTML = `
      <div class="uipb-toolbar-info">
        <span style="color: #00FF87; font-weight: 600;">${highlightedElements.length}</span> ELEMENTS
      </div>
      <div class="uipb-toolbar-divider"></div>
      <button class="uipb-toolbar-btn ${currentMode === 'click' ? 'primary' : ''}" id="uipb-btn-click">Smart Select</button>
      <button class="uipb-toolbar-btn ${currentMode === 'region' ? 'primary' : ''}" id="uipb-btn-area">Region Tool</button>
      <button class="uipb-toolbar-btn ${currentMode === 'screenshot' ? 'primary' : ''}" id="uipb-btn-screenshot">Screenshot</button>
      <div class="uipb-toolbar-divider"></div>
      <button class="uipb-toolbar-btn secondary" id="uipb-preview" ${highlightedElements.length === 0 ? 'disabled' : ''}>Show AI Prompt</button>
      <button class="uipb-toolbar-btn" id="uipb-exit" style="color: rgba(242,242,244,0.28);">Exit</button>
    `;

    document.getElementById('uipb-btn-click').onclick = (e) => { e.stopPropagation(); currentMode = 'click'; updateToolbar(); };
    document.getElementById('uipb-btn-area').onclick = (e) => { e.stopPropagation(); currentMode = 'region'; updateToolbar(); };
    document.getElementById('uipb-btn-screenshot').onclick = (e) => { e.stopPropagation(); currentMode = 'screenshot'; updateToolbar(); };
    document.getElementById('uipb-exit').onclick = (e) => { e.stopPropagation(); exitSelection(); };

    const prevBtn = document.getElementById('uipb-preview');
    if (prevBtn && highlightedElements.length > 0) {
      prevBtn.onclick = (e) => { e.stopPropagation(); showPreviewModal(); };
    }
  }

  function showPreviewModal() {
    safeSendMessage({ type: 'OPEN_PROMPT_PAGE' });
    showToast('Opening Prompt Studio...');
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
          const r = el.getBoundingClientRect();
          if (r.top >= rect.top && r.left >= rect.left && r.bottom <= rect.bottom && r.right <= rect.right) {
            if (!highlightedElements.find(h => h.element === el)) addHighlight(el);
          }
        });
        showToast(`${highlightedElements.length} elements selected`);

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
    if (!isCapturingUI || currentMode !== 'click') return;
    if (e.target.closest('#uipb-toolbar, .uipb-highlight-box, .uipb-badge')) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const idx = highlightedElements.findIndex(h => h.element === e.target);
    if (idx > -1) {
      highlightedElements[idx].box.remove();
      highlightedElements.splice(idx, 1);
      highlightedElements.forEach((h, i) => {
        const b = h.box.querySelector('.uipb-badge');
        if (b) { b.innerText = i + 1; }
      });
    } else {
      addHighlight(e.target);
    }
    broadcastUpdate();
  }, true);

})();
