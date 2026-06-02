const BRIDGE = 'https://api.subsrf.dev';
let session = null;
let lastData = null;
let lastProcessedAiId = 0;
let lastProcessedSyncId = '';
let lastProcessedQueryId = 0;
let pollInterval = null;
let oauthPollInterval = null;

let currentSelNodes = [];
let currentNodeCount = 0;
let isComposing = false;

function calculateCost(nodeCount) {
  if (nodeCount <= 50)  return 1;
  if (nodeCount <= 150) return 2;
  if (nodeCount <= 400) return 3;
  return 4;
}

const ICO = {
  copy: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>`,
  check: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  open: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`
};

// ── Storage bridge ────────────────────────────────────────────────────────────
const storageCbs = {};
function storageGet(key) {
  return new Promise(r => { storageCbs[key] = r; parent.postMessage({ pluginMessage: { type: 'GET_STORAGE', key } }, '*'); });
}
function storageSet(key, value) { parent.postMessage({ pluginMessage: { type: 'SET_STORAGE', key, value } }, '*'); }
function storageDel(key) { parent.postMessage({ pluginMessage: { type: 'DEL_STORAGE', key } }, '*'); }

// ── View helpers ──────────────────────────────────────────────────────────────
function showView(name) {
  document.getElementById('view-loading').style.display = name === 'loading' ? 'flex' : 'none';
  document.getElementById('view-signin').style.display = name === 'signin' ? 'flex' : 'none';
  document.getElementById('view-main').style.display = name === 'main' ? 'flex' : 'none';
  if (name === 'signin') {
    const v = document.querySelector('#view-signin video');
    if (v) v.play().catch(() => {});
  }
}

// ── Tab nav ───────────────────────────────────────────────────────────────────
let patLoaded = false;
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    if (btn.dataset.tab === 'settings' && !patLoaded) {
      patLoaded = true;
      loadFigmaPat();
    }
    if (btn.dataset.tab === 'vars') {
      loadVarsProjects();
    }
  });
});

// ── Settings / tier ───────────────────────────────────────────────────────────
function applyTier(tier) {
  const badge = document.getElementById('tierBadge');
  if (tier === 'pro') {
    badge.textContent = 'PRO';
    badge.style.cssText = 'background:rgba(0,255,135,0.10);color:#00FF87;border:1px solid rgba(0,255,135,0.2);border-radius:2px;';
    document.getElementById('settingsTier').textContent = 'Pro';
    document.getElementById('settingsTier').style.color = 'var(--neon)';
  } else if (tier === 'starter') {
    badge.textContent = 'STARTER';
    badge.style.cssText = 'background:rgba(255,171,0,0.08);color:#FFAB00;border:1px solid rgba(255,171,0,0.25);border-radius:2px;';
    document.getElementById('settingsTier').textContent = 'Starter';
    document.getElementById('settingsTier').style.color = 'var(--warn)';
  } else {
    badge.textContent = 'FREE';
    badge.style.cssText = 'background:rgba(255,255,255,0.05);color:rgba(242,242,244,0.28);border:1px solid rgba(242,242,244,0.08);border-radius:2px;';
    document.getElementById('settingsTier').textContent = 'Free';
    document.getElementById('settingsTier').style.color = 'var(--t1)';
  }
  updateComposeBtn();
}

function getTier() {
  const t = document.getElementById('tierBadge').textContent.toLowerCase();
  if (t === 'pro') return 'pro';
  if (t === 'starter') return 'starter';
  return 'free';
}

function getCredits() {
  return parseInt(document.getElementById('settingsCredits').textContent) || 0;
}

function updateCredits(balance, tier) {
  const bal = balance ?? 0;
  document.getElementById('settingsCredits').textContent = bal;
  document.getElementById('creditBalText').textContent = bal + ' credit' + (bal !== 1 ? 's' : '');
  const max = tier === 'pro' ? 300 : tier === 'starter' ? 75 : 0;
  document.getElementById('creditsFill').style.width = max > 0 ? Math.min(100, bal / max * 100) + '%' : '0%';
  updateComposeBtn();
}

// ── Activity feed ─────────────────────────────────────────────────────────────
function addLog(msg, type) {
  const list = document.getElementById('feedList');
  const empty = list.querySelector('.feed-empty');
  if (empty) empty.remove();
  const row = document.createElement('div');
  row.className = 'feed-row';
  const now = new Date();
  const t = '[' +
    now.getHours().toString().padStart(2, '0') + ':' +
    now.getMinutes().toString().padStart(2, '0') + ':' +
    now.getSeconds().toString().padStart(2, '0') + ']';
  const color = (type === 'ai' || type === 'ok') ? 'var(--neon)' : type === 'err' ? 'var(--err)' : 'var(--t2)';
  row.innerHTML = '<span class="feed-time">' + t + '</span><span class="feed-msg" style="color:' + color + '">' + msg + '</span>';
  list.appendChild(row);
  list.scrollTop = list.scrollHeight;
  while (list.children.length > 50) list.removeChild(list.firstChild);
}

// ── Sync tab ──────────────────────────────────────────────────────────────────
function updateSyncTab(data) {
  if (!data) return;
  const tier = data.tier || 'free';
  const isPaid = tier === 'starter' || tier === 'pro';
  const elements = data.elements || [];
  const syncBtn = document.getElementById('syncBtn');

  if (isPaid && elements.length > 0) {
    document.getElementById('extDot').className = 'dot on';
    document.getElementById('extStatus').className = 'card-status ok';
    document.getElementById('extStatus').textContent = elements.length + ' elements ready';
    document.getElementById('extCard').classList.add('active');

    syncBtn.disabled = false;
    syncBtn.textContent = 'Sync to Figma (' + elements.length + ')';
    syncBtn.classList.remove('locked');
    syncBtn.onclick = function () {
      parent.postMessage({
        pluginMessage: { type: 'IMPORT_ELEMENTS', elements: elements, context: data.page || {}, tier: tier }
      }, '*');
      addLog('Synced ' + elements.length + ' elements', 'ok');
      syncBtn.disabled = true;
    };

    const syncId = (elements[0]?.rect?.top || 0) + '-' + elements.length;
    if (syncId !== lastProcessedSyncId) {
      lastProcessedSyncId = syncId;
      addLog('Received ' + elements.length + ' elements from selection', 'ok');
    }
  } else if (!isPaid) {
    document.getElementById('extDot').className = 'dot';
    document.getElementById('extStatus').className = 'card-status warn';
    document.getElementById('extStatus').textContent = 'Upgrade to sync elements';
    document.getElementById('extCard').classList.remove('active');

    syncBtn.disabled = false;
    syncBtn.textContent = '⚡ Upgrade to Sync';
    syncBtn.classList.add('locked');
    syncBtn.onclick = function () { window.open(BRIDGE + '/#pricing', '_blank'); };
  } else {
    document.getElementById('extDot').className = 'dot warn';
    document.getElementById('extStatus').className = 'card-status warn';
    document.getElementById('extStatus').textContent = 'Waiting for selection...';
    document.getElementById('extCard').classList.remove('active');

    syncBtn.disabled = true;
    syncBtn.textContent = 'Sync to Figma';
    syncBtn.classList.remove('locked');
    syncBtn.onclick = null;
  }

}

// ── Vars tab ──────────────────────────────────────────────────────────────────
const SCAN = 'https://scan.subsrf.dev';
let varsTokens = null;

async function loadVarsProjects() {
  if (!session?.accessToken) return;
  const el = document.getElementById('varsProjectsList');
  el.innerHTML = '<div style="font-size:10px;color:var(--t3);font-family:\'Azeret Mono\',monospace;padding:6px 0;">Loading…</div>';
  try {
    const res = await fetch(BRIDGE + '/api/scan/projects', {
      headers: { 'Authorization': 'Bearer ' + session.accessToken }
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.error || 'HTTP ' + res.status);
    }
    const data = await res.json();
    renderVarsProjects(data.projects || []);
  } catch (e) {
    el.innerHTML = '<div style="font-size:10px;color:var(--err);font-family:\'Azeret Mono\',monospace;padding:6px 0;">Failed: ' + e.message + '</div>';
  }
}

function renderVarsProjects(projects) {
  const el = document.getElementById('varsProjectsList');
  if (!projects.length) {
    el.innerHTML = '<div style="font-size:10px;color:var(--t3);font-family:\'Azeret Mono\',monospace;padding:6px 0;">No projects yet — scan a site to get started.</div>';
    return;
  }
  el.innerHTML = projects.map(p => {
    const host = p.source_url ? p.source_url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0] : p.slug;
    const ago = relativeTime(p.updated_at);
    return `<div class="card" style="margin-bottom:4px;padding:8px 10px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;" onclick="selectVarsProject('${p.slug}', this)">
      <div style="min-width:0;">
        <div style="font-size:10px;color:var(--t1);font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${host}</div>
        <div style="font-size:9px;color:var(--t3);font-family:'Azeret Mono',monospace;margin-top:2px;">${ago}</div>
      </div>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;color:var(--t3)"><polyline points="9 18 15 12 9 6"/></svg>
    </div>`;
  }).join('');
}

async function selectVarsProject(slug, el) {
  document.querySelectorAll('#varsProjectsList .card').forEach(c => c.style.borderColor = '');
  if (el) el.style.borderColor = 'var(--neon)';
  document.getElementById('varsImportPanel').style.display = 'none';
  try {
    const res = await fetch(BRIDGE + '/api/scan/project/' + slug, {
      headers: { 'Authorization': 'Bearer ' + session.accessToken }
    });
    if (!res.ok) throw new Error('Not found');
    const data = await res.json();
    varsTokens = data.curated_tokens || data.tokens || null;
    if (!varsTokens) throw new Error('No tokens');
    const mode = varsTokens.dark || varsTokens.light;
    const host = (data.source_url || slug).replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
    document.getElementById('varsSelectedUrl').textContent = host;
    document.getElementById('colorsCount').textContent = (mode?.colors?.length || 0) + ' values';
    document.getElementById('spacingCount').textContent = (mode?.spacing?.length || 0) + ' values';
    document.getElementById('roundingCount').textContent = (mode?.radius?.length || 0) + ' values';
    document.getElementById('varsImportPanel').style.display = '';
    document.getElementById('varsImportStatus').textContent = '';
  } catch (e) {
    document.getElementById('varsImportPanel').style.display = 'none';
    addLog('Failed to load project tokens', 'err');
  }
}

function relativeTime(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 2) return 'just now';
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ago';
  return Math.floor(h / 24) + 'd ago';
}

function setVarsStatus(msg, color) {
  const el = document.getElementById('varsImportStatus');
  el.textContent = msg;
  el.style.color = color || 'var(--t3)';
}

document.getElementById('btnImportColors').addEventListener('click', () => {
  if (!varsTokens) return;
  const mode = varsTokens.dark || varsTokens.light;
  const colors = mode?.colors || [];
  if (!colors.length) { setVarsStatus('No colors in this project', 'var(--warn)'); return; }
  parent.postMessage({ pluginMessage: { type: 'IMPORT_TOKEN_VARS', category: 'colors', tokens: colors, collectionName: document.getElementById('varsSelectedUrl').textContent + '/Colors' } }, '*');
  setVarsStatus('Importing colors…', 'var(--t3)');
});

document.getElementById('btnImportSpacing').addEventListener('click', () => {
  if (!varsTokens) return;
  const mode = varsTokens.dark || varsTokens.light;
  const spacing = mode?.spacing || [];
  if (!spacing.length) { setVarsStatus('No spacing values in this project', 'var(--warn)'); return; }
  parent.postMessage({ pluginMessage: { type: 'IMPORT_TOKEN_VARS', category: 'spacing', tokens: spacing, collectionName: document.getElementById('varsSelectedUrl').textContent + '/Spacing' } }, '*');
  setVarsStatus('Importing spacing…', 'var(--t3)');
});

document.getElementById('btnImportRounding').addEventListener('click', () => {
  if (!varsTokens) return;
  const mode = varsTokens.dark || varsTokens.light;
  const radius = mode?.radius || [];
  if (!radius.length) { setVarsStatus('No radius values in this project', 'var(--warn)'); return; }
  parent.postMessage({ pluginMessage: { type: 'IMPORT_TOKEN_VARS', category: 'radius', tokens: radius, collectionName: document.getElementById('varsSelectedUrl').textContent + '/Rounding' } }, '*');
  setVarsStatus('Importing rounding…', 'var(--t3)');
});

document.getElementById('btnImportJson').addEventListener('click', () => {
  const raw = document.getElementById('varsJsonInput').value.trim();
  if (!raw) return;
  let parsed;
  try { parsed = JSON.parse(raw); } catch (_) {
    setVarsStatus('Invalid JSON', 'var(--err)');
    return;
  }
  // Accept either raw token set {dark:{colors,spacing,radius}} or flat {colors,spacing,radius}
  const mode = parsed.dark || parsed.light || parsed;
  const categories = [];
  if (mode.colors?.length) categories.push({ category: 'colors', tokens: mode.colors, collectionName: 'JSON/Colors' });
  if (mode.spacing?.length) categories.push({ category: 'spacing', tokens: mode.spacing, collectionName: 'JSON/Spacing' });
  if (mode.radius?.length) categories.push({ category: 'radius', tokens: mode.radius, collectionName: 'JSON/Rounding' });
  if (!categories.length) { setVarsStatus('No colors, spacing or radius found in JSON', 'var(--warn)'); return; }
  for (const c of categories) {
    parent.postMessage({ pluginMessage: { type: 'IMPORT_TOKEN_VARS', ...c } }, '*');
  }
  setVarsStatus('Importing ' + categories.map(c => c.category).join(', ') + '…', 'var(--t3)');
});

// ── Compose tab ───────────────────────────────────────────────────────────────
function updateComposeBtn() {
  const btn = document.getElementById('btnCompose');
  const label = document.getElementById('btnComposeLabel');
  const tier = getTier();
  const isPaid = tier === 'starter' || tier === 'pro';
  const credits = getCredits();
  const hasSel = currentSelNodes.length > 0;
  const cost = calculateCost(currentNodeCount);

  btn.classList.remove('locked', 'loading');

  if (!isPaid) {
    btn.disabled = false;
    btn.classList.add('locked');
    label.textContent = '⚡ Upgrade to Compose';
  } else if (!hasSel) {
    btn.disabled = true;
    label.textContent = 'Select something in Figma';
  } else if (isComposing) {
    btn.disabled = true;
    btn.classList.add('loading');
    label.textContent = 'Composing…';
  } else if (credits < cost) {
    btn.disabled = true;
    label.textContent = `Not enough credits (need ${cost})`;
  } else {
    btn.disabled = false;
    label.textContent = `Generate Brief · ${cost} credit${cost !== 1 ? 's' : ''}`;
  }
}

function updateSelChips(nodes, nodeCount) {
  currentSelNodes = nodes || [];
  currentNodeCount = nodeCount || 0;
  const el = document.getElementById('selChips');
  if (!nodes || nodes.length === 0) {
    el.innerHTML = '<span class="sel-chip empty">Nothing selected in Figma</span>';
  } else {
    const max = 4;
    let html = nodes.slice(0, max).map(n =>
      '<span class="sel-chip">' + (n.name || n.type || 'Node').slice(0, 22) + '</span>'
    ).join('');
    if (nodes.length > max) html += '<span class="sel-chip">+' + (nodes.length - max) + ' more</span>';
    el.innerHTML = html;
  }
  updateComposeBtn();
}

document.getElementById('btnCompose').addEventListener('click', async () => {
  const tier = getTier();
  if (!(tier === 'starter' || tier === 'pro')) {
    window.open(BRIDGE + '/#pricing', '_blank');
    return;
  }
  if (isComposing) return;
  isComposing = true;
  updateComposeBtn();
  document.getElementById('resultPanel').classList.remove('visible');
  parent.postMessage({ pluginMessage: { type: 'READ_SELECTION' } }, '*');
});

async function runCompose(nodes) {
  if (!nodes || nodes.length === 0) { isComposing = false; updateComposeBtn(); return; }
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (session?.accessToken) headers['Authorization'] = 'Bearer ' + session.accessToken;
    const res = await fetch(BRIDGE + '/api/ai/compose', {
      method: 'POST', headers,
      body: JSON.stringify({ nodes, nodeCount: currentNodeCount })
    });
    if (res.status === 402) { updateCredits(0, getTier()); throw new Error('No credits remaining'); }
    if (res.status === 403) { throw new Error('Upgrade required'); }
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Compose failed'); }
    const data = await res.json();
    if (typeof data.balance === 'number') { updateCredits(data.balance, getTier()); if (session) { session.credits = data.balance; storageSet('subsrf_session', session); } }
    showResult(data.prompt || '');
    const spent = data.cost || 1;
    addLog(`Brief generated — ${spent} credit${spent !== 1 ? 's' : ''} used`, 'ai');
  } catch (e) {
    const row = document.getElementById('creditRow');
    const orig = row.innerHTML;
    row.innerHTML = '<span style="color:var(--err);font-family:\'Azeret Mono\',monospace;font-size:10px;">Error: ' + e.message + '</span>';
    setTimeout(() => { row.innerHTML = orig; }, 4000);
  } finally { isComposing = false; updateComposeBtn(); }
}

function showResult(prompt) {
  document.getElementById('resultText').textContent = prompt;
  document.getElementById('resultPanel').classList.add('visible');
  setTimeout(() => { document.getElementById('resultPanel').scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 80);
}

document.getElementById('btnCopyResult').addEventListener('click', () => {
  const text = document.getElementById('resultText').textContent;
  const btn = document.getElementById('btnCopyResult');
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none;';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    const orig = btn.innerHTML;
    btn.innerHTML = ICO.check + ' Copied!';
    setTimeout(() => { btn.innerHTML = orig; }, 2000);
  } catch (_e) {}
});

// ── Polling / state sync ──────────────────────────────────────────────────────
async function checkState() {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (session?.accessToken) headers['Authorization'] = 'Bearer ' + session.accessToken;
    const res = await fetch(BRIDGE + '/api/state?source=figma', { headers });
    if (!res.ok) throw new Error('offline');
    const data = await res.json();
    lastData = data;

    const tier = data.tier || 'free';
    applyTier(tier);
    if (typeof data.credits === 'number') {
      updateCredits(data.credits, tier);
      if (session && session.credits !== data.credits) {
        session.credits = data.credits;
        storageSet('subsrf_session', session);
      }
    }

    updateSyncTab(data);

    if (data.aiMessage) {
      document.getElementById('aiDot').className = 'dot pulse';
      document.getElementById('aiStatus').className = 'card-status neon';
      document.getElementById('aiStatus').textContent = 'Command Ready';
      document.getElementById('aiCard').classList.add('active');
      if (data.aiMessage.id > lastProcessedAiId) {
        lastProcessedAiId = data.aiMessage.id;
        addLog('AI: ' + data.aiMessage.type, 'ai');
        parent.postMessage({ pluginMessage: data.aiMessage }, '*');
      }
    } else {
      const isPaid = tier === 'starter' || tier === 'pro';
      document.getElementById('aiDot').className = isPaid ? 'dot on' : 'dot';
      document.getElementById('aiStatus').className = isPaid ? 'card-status ok' : 'card-status';
      document.getElementById('aiStatus').textContent = isPaid ? 'Connected' : 'Paid plan required';
      document.getElementById('aiCard').classList.remove('active');
    }

    if (data.pendingQuery && data.pendingQuery.id > lastProcessedQueryId) {
      lastProcessedQueryId = data.pendingQuery.id;
      addLog('AI query #' + data.pendingQuery.id, 'ai');
      parent.postMessage({ pluginMessage: { type: 'FIGMA_QUERY', queryId: data.pendingQuery.id, code: data.pendingQuery.code } }, '*');
    }

    if (isMinimized) syncToolbar(data);

  } catch (_) {
    document.getElementById('extStatus').className = 'card-status err';
    document.getElementById('extStatus').textContent = 'Bridge offline';
    document.getElementById('extDot').className = 'dot err';
  }
}

function syncToolbar(data) {
  const elements = data?.elements || [];
  const hasEl = elements.length > 0;
  const extLabel = document.getElementById('tcExtLabel');
  const extDot = document.getElementById('tcExtDot');
  extDot.className = hasEl ? 'dot on' : 'dot warn';
  extLabel.className = 'chip-status' + (hasEl ? ' ok' : ' warn');
  extLabel.textContent = hasEl ? elements.length + ' elements' : document.getElementById('extStatus').textContent;
  document.getElementById('tcExtChip').classList.toggle('active', hasEl);

  const aiLabel = document.getElementById('tcAiLabel');
  const aiDot = document.getElementById('tcAiDot');
  const srcLabel = document.getElementById('aiStatus');
  const srcDot = document.getElementById('aiDot');
  aiDot.className = srcDot.className;
  aiLabel.className = 'chip-status' + (srcLabel.className.includes('ok') ? ' ok' : srcLabel.className.includes('neon') ? ' ok' : '');
  aiLabel.textContent = isComposing ? 'Composing…' : srcLabel.textContent;
}

async function fetchCredits() {
  if (!session?.accessToken) return;
  try {
    const res = await fetch(BRIDGE + '/api/credits/balance', {
      headers: { 'Authorization': 'Bearer ' + session.accessToken }
    });
    if (res.ok) {
      const d = await res.json();
      updateCredits(d.balance ?? 0, d.tier || getTier());
      applyTier(d.tier || getTier());
      if (session) { session.credits = d.balance ?? 0; storageSet('subsrf_session', session); }
    }
  } catch (_) {}
}

function startPolling() {
  if (pollInterval) clearInterval(pollInterval);
  addLog('System initialized.');
  fetchCredits().then(() => {
    addLog('Connected to AI.', 'ok');
    addLog('Waiting for Chrome extension payload...');
  });
  checkState();
  pollInterval = setInterval(checkState, 2000);
}

// ── Auth ──────────────────────────────────────────────────────────────────────
async function refreshSession() {
  if (!session?.refreshToken) return false;
  try {
    const res = await fetch(BRIDGE + '/api/auth/refresh', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: session.refreshToken })
    });
    if (!res.ok) { session = null; storageDel('subsrf_session'); showView('signin'); return false; }
    const data = await res.json();
    session.accessToken = data.accessToken;
    if (data.refreshToken) session.refreshToken = data.refreshToken;
    session.expiresAt = Date.now() + (data.expiresIn || 3600) * 1000;
    if (data.tier) session.tier = data.tier;
    if (data.email) session.email = data.email;
    storageSet('subsrf_session', session);
    return true;
  } catch (_) { return false; }
}

function startOAuth() {
  const state = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  document.getElementById('btnSignIn').disabled = true;
  document.getElementById('btnSignInCancel').style.display = '';
  document.getElementById('signin-status').textContent = 'Opening browser…';
  window.open(BRIDGE + '/auth/figma/start?state=' + state, '_blank');
  document.getElementById('signin-status').textContent = 'Waiting for sign-in…';
  let attempts = 0;
  oauthPollInterval = setInterval(async () => {
    if (++attempts > 90) {
      clearInterval(oauthPollInterval);
      document.getElementById('signin-status').textContent = 'Timed out. Try again.';
      document.getElementById('btnSignIn').disabled = false;
      document.getElementById('btnSignInCancel').style.display = 'none';
      return;
    }
    try {
      const res = await fetch(BRIDGE + '/api/auth/figma/session?state=' + state);
      if (res.status === 404) return;
      if (!res.ok) {
        clearInterval(oauthPollInterval);
        document.getElementById('signin-status').textContent = 'Sign-in failed. Try again.';
        document.getElementById('btnSignIn').disabled = false;
        document.getElementById('btnSignInCancel').style.display = 'none';
        return;
      }
      const data = await res.json();
      clearInterval(oauthPollInterval);
      session = {
        accessToken: data.accessToken, refreshToken: data.refreshToken || null,
        expiresAt: data.expiresAt || (Date.now() + 3600000), tier: data.tier,
        email: data.email, credits: data.credits || 0
      };
      storageSet('subsrf_session', session);
      document.getElementById('settingsEmail').textContent = session.email || '—';
      showView('main');
      applyTier(session.tier || 'free');
      updateCredits(session.credits || 0, session.tier || 'free');
      startPolling();
      addLog('Signed in as ' + session.email);
    } catch (_) {}
  }, 2000);
}

function cancelOAuth() {
  if (oauthPollInterval) clearInterval(oauthPollInterval);
  document.getElementById('btnSignIn').disabled = false;
  document.getElementById('btnSignInCancel').style.display = 'none';
  document.getElementById('signin-status').textContent = '';
}

function signOut() {
  if (pollInterval) clearInterval(pollInterval);
  session = null;
  currentFigmaPat = null;
  patLoaded = false;
  renderPatState();
  storageDel('subsrf_session');
  showView('signin');
}

// ── Minimize ──────────────────────────────────────────────────────────────────
let isMinimized = false;
const FULL_H = 720, MINI_H = 68;

function setMinimized(min) {
  isMinimized = min;
  document.getElementById('minimizeIcon').textContent = min ? '+' : '—';
  document.getElementById('toolbar').style.display = min ? 'flex' : 'none';
  document.querySelector('.tab-nav').style.display = min ? 'none' : '';
  document.querySelectorAll('.tab-panel').forEach(p => { p.style.display = min ? 'none' : ''; });
  document.body.classList.toggle('compact', min);
  parent.postMessage({ pluginMessage: { type: 'RESIZE', width: 360, height: min ? MINI_H : FULL_H } }, '*');
}

// ── Figma PAT & MCP config ────────────────────────────────────────────────────
let currentFigmaPat = null;

function buildMcpConfig(pat) {
  const base = `npx -y subsrf-intelligence setup --endpoint ${BRIDGE}`;
  return pat ? `FIGMA_PAT="${pat}" ${base}` : base;
}

function renderPatState() {
  const label = document.getElementById('figmaPatLabel');
  if (currentFigmaPat) {
    label.textContent = 'figd_' + '•'.repeat(8);
    label.style.color = 'var(--ok)';
    document.getElementById('btnEditPat').textContent = 'Update Token';
  } else {
    label.textContent = 'Not set';
    label.style.color = 'var(--t3)';
    document.getElementById('btnEditPat').textContent = 'Set Token';
  }
  document.getElementById('mcpConfigText').textContent = buildMcpConfig(currentFigmaPat);
}

async function loadFigmaPat() {
  if (!session?.accessToken) return;
  try {
    const res = await fetch(BRIDGE + '/api/user/figma-pat', {
      headers: { 'Authorization': 'Bearer ' + session.accessToken }
    });
    if (res.ok) {
      const d = await res.json();
      currentFigmaPat = d.pat || null;
      renderPatState();
    }
  } catch (_) {}
}

async function saveFigmaPat(pat) {
  if (!session?.accessToken) return false;
  try {
    const res = await fetch(BRIDGE + '/api/user/figma-pat', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + session.accessToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ pat })
    });
    return res.ok;
  } catch (_) { return false; }
}

document.getElementById('btnEditPat').addEventListener('click', () => {
  document.getElementById('figmaPatView').style.display = 'none';
  document.getElementById('figmaPatEdit').style.display = '';
  const inp = document.getElementById('figmaPatInput');
  inp.value = currentFigmaPat || '';
  inp.focus();
});

document.getElementById('btnCancelPat').addEventListener('click', () => {
  document.getElementById('figmaPatEdit').style.display = 'none';
  document.getElementById('figmaPatView').style.display = '';
  document.getElementById('figmaPatInput').value = '';
});

document.getElementById('btnSavePat').addEventListener('click', async () => {
  const pat = document.getElementById('figmaPatInput').value.trim();
  if (!pat) return;
  const btn = document.getElementById('btnSavePat');
  btn.disabled = true;
  btn.textContent = 'Saving…';
  const ok = await saveFigmaPat(pat);
  if (ok) {
    currentFigmaPat = pat;
    renderPatState();
    document.getElementById('figmaPatEdit').style.display = 'none';
    document.getElementById('figmaPatView').style.display = '';
    document.getElementById('figmaPatInput').value = '';
    addLog('Figma token saved', 'ok');
  } else {
    btn.textContent = 'Failed — retry';
    btn.disabled = false;
  }
});

document.getElementById('btnCopyMcp').addEventListener('click', () => {
  const text = document.getElementById('mcpConfigText').textContent;
  const btn = document.getElementById('btnCopyMcp');
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none;';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    const orig = btn.innerHTML;
    btn.innerHTML = ICO.check + ' Copied!';
    setTimeout(() => { btn.innerHTML = orig; }, 2000);
  } catch (_) {}
});

// ── Event wiring ──────────────────────────────────────────────────────────────
document.getElementById('btnMinimize').addEventListener('click', (e) => {
  e.stopPropagation();
  setMinimized(!isMinimized);
});
document.getElementById('btnSignIn').onclick = startOAuth;
document.getElementById('btnSignInCancel').onclick = cancelOAuth;
document.getElementById('btnSignOut').onclick = signOut;

// ── Bootstrap ─────────────────────────────────────────────────────────────────
renderPatState(); // renders config without PAT initially
showView('signin');
storageGet('subsrf_session');
setTimeout(() => {
  if (document.getElementById('view-loading').style.display !== 'none') showView('signin');
}, 4000);

// ── Plugin message handler ────────────────────────────────────────────────────
window.onmessage = async (event) => {
  const msg = event.data.pluginMessage;
  if (!msg) return;

  if (msg.type === 'STORAGE_VALUE') {
    const cb = storageCbs[msg.key];
    if (cb) { delete storageCbs[msg.key]; cb(msg.value); }

    if (msg.key === 'subsrf_session') {
      if (msg.value?.accessToken) {
        session = msg.value;
        const now = Date.now();
        if ((session.expiresAt || 0) > 0 && now > session.expiresAt - 300000) await refreshSession();
        if (session) {
          document.getElementById('settingsEmail').textContent = session.email || '—';
          showView('main');
          applyTier(session.tier || 'free');
          updateCredits(session.credits || 0, session.tier || 'free');
          startPolling();
        }
      } else {
        showView('signin');
      }
    }
    return;
  }

  if (msg.type === 'SELECTION_CHANGED') {
    updateSelChips(msg.nodes || [], msg.nodeCount || 0);
    return;
  }

  if (msg.type === 'SELECTION_DATA') {
    if (isComposing) await runCompose(msg.nodes || []);
    return;
  }

  if (msg.type === 'QUERY_RESULT') {
    try {
      await fetch(BRIDGE + '/api/figma/result', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queryId: msg.queryId, result: msg.result, error: msg.error })
      });
    } catch (_) {}
    return;
  }

  if (msg.type === 'IMPORT_TOKEN_VARS_DONE') {
    if (msg.error) {
      setVarsStatus('Error: ' + msg.error, 'var(--err)');
    } else {
      setVarsStatus('Imported ' + msg.count + ' ' + msg.category + ' variables', 'var(--ok)');
      addLog('Imported ' + msg.count + ' ' + msg.category + ' vars', 'ok');
    }
    return;
  }

  if (msg.type === 'SEND_SELECTION_TO_BRIDGE') {
    try {
      const h = { 'Content-Type': 'application/json' };
      if (session?.accessToken) h['Authorization'] = 'Bearer ' + session.accessToken;
      await fetch(BRIDGE + '/api/figma/selection', {
        method: 'POST', headers: h,
        body: JSON.stringify({ elements: msg.elements, context: { title: 'Figma Selection' } })
      });
    } catch (_) {}
  }
};

// inline onclick handlers
window.setMinimized = setMinimized;
window.loadVarsProjects = loadVarsProjects;
window.selectVarsProject = selectVarsProject;
