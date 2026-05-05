// Loupe — Sidebar Script
// Focuses on providing a live preview of the generated AI prompt

(function () {
  'use strict';

  // ── State ──────────────────────────────────────────────────────────────────
  let elementCount = 0;
  let currentPrompt = "";

  // ── Elements ───────────────────────────────────────────────────────────────
  const copyBtn        = document.getElementById('copyBtn');
  const elemCount      = document.getElementById('elemCount');
  const pageTitle      = document.getElementById('pageTitle');
  const emptyState     = document.getElementById('emptyState');
  const promptContent  = document.getElementById('promptContent');
  const headerSub      = document.getElementById('headerSub');

  // ── Init ───────────────────────────────────────────────────────────────────
  async function init() {
    if (!copyBtn || !elemCount || !pageTitle || !emptyState || !promptContent) return;

    syncFromContentScript();

    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.type === 'ELEMENTS_UPDATE') {
        elementCount = msg.elements?.length || 0;
        currentPrompt = msg.prompt || "";
        updateUI();
      }
    });

    copyBtn.onclick = copyToClipboard;
    
  }

  async function syncFromContentScript() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;
      pageTitle.textContent = tab.title || '';
      
      chrome.tabs.sendMessage(tab.id, { type: 'GET_PROMPT' }, (res) => {
        if (chrome.runtime.lastError) return;
        if (res) {
          elementCount = res.elements?.length || 0;
          currentPrompt = res.prompt || "";
          updateUI();
        }
      });
    } catch (_) {}
  }

  function updateUI() {
    if (elemCount) elemCount.textContent = elementCount;
    if (copyBtn) copyBtn.disabled = elementCount === 0;
    
    if (elementCount > 0) {
      if (emptyState) emptyState.style.display = 'none';
      if (promptContent) {
        promptContent.style.display = 'block';
        promptContent.textContent = currentPrompt;
      }
      if (headerSub) headerSub.textContent = `${elementCount} elements synced`;
    } else {
      if (emptyState) emptyState.style.display = 'flex';
      if (promptContent) promptContent.style.display = 'none';
      if (headerSub) headerSub.textContent = 'BYOAI Bridge';
    }
  }

  async function copyToClipboard() {
    if (!currentPrompt) return;
    try {
      await navigator.clipboard.writeText(currentPrompt);
      const originalHTML = copyBtn.innerHTML;
      copyBtn.innerHTML = '<span>✅</span> Copied!';
      setTimeout(() => { if (copyBtn) copyBtn.innerHTML = originalHTML; }, 2000);
    } catch (err) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
