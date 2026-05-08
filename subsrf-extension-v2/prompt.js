// Subsrf — Prompt Studio
'use strict';

let mode = 'prompt';
let elements = [];
let context = {};
let session = null;
let bridgeOnline = false;
let figmaConnected = false;
let smartEnriched = null; // populated after a successful Smart Prompt generation

const outputEl    = document.getElementById('output');
const outputLabel = document.getElementById('output-label');
const elListEl    = document.getElementById('el-list');
const elCountEl   = document.getElementById('el-count');
const pageCtxEl   = document.getElementById('page-context');
const btnCopy     = document.getElementById('btn-copy');
const togPrompt   = document.getElementById('tog-prompt');
const togCss      = document.getElementById('tog-css');
const toastEl     = document.getElementById('toast');

// ── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  const stored = await chrome.storage.local.get(['selectedElements', 'lastPageContext', 'subsrf_session']);
  elements = stored.selectedElements || [];
  context  = stored.lastPageContext  || {};
  session  = stored.subsrf_session   || null;

  pageCtxEl.textContent = context.title
    ? context.title
    : context.url
    ? new URL(context.url).hostname
    : 'No page context';

  renderAiGate();
  renderSidebar();
  renderOutput();
  await checkBridge();
  setInterval(checkBridge, 6000);
}

// ── AI Gate ───────────────────────────────────────────────────────────────────

function renderAiGate() {
  const gate = document.getElementById('ai-gate');
  if (!gate) return;

  const tier    = session?.tier || 'free';
  const credits = session?.credits ?? 0;
  const isPaid  = tier === 'starter' || tier === 'pro';

  if (!isPaid) {
    gate.innerHTML = `
      <div class="upgrade-banner">
        <div class="upgrade-text">
          <strong>AI Prompt Engine</strong> — Starter &amp; Pro<br>
          Let Claude interpret your captured UI and generate a semantically rich, build-ready prompt.
        </div>
        <button class="btn-upgrade-sm" id="btn-upgrade-gate">Upgrade — $9/mo</button>
      </div>`;
    document.getElementById('btn-upgrade-gate').onclick = () => {
      chrome.tabs.create({ url: 'https://www.subsrf.dev/#pricing' });
    };
    return;
  }

  const badgeClass = credits === 0 ? 'empty' : credits <= 10 ? 'low' : '';
  const disabled   = credits < 1 || elements.length === 0;
  const btnLabel   = credits === 0 ? 'No credits remaining' : 'Generate Smart Prompt (1 credit)';

  gate.innerHTML = `
    <div class="ai-engine-bar">
      <div class="ai-engine-label">
        AI Prompt Engine
        <span class="credit-badge ${badgeClass}">${credits} credit${credits !== 1 ? 's' : ''}</span>
      </div>
      <button class="btn-generate" id="btn-ai-generate" ${disabled ? 'disabled' : ''}>${btnLabel}</button>
    </div>`;

  if (!disabled) {
    document.getElementById('btn-ai-generate').onclick = () => generateAiPrompt();
  }
}

async function generateAiPrompt() {
  const { subsrf_session } = await chrome.storage.local.get('subsrf_session');

  if (!subsrf_session?.accessToken) {
    showToast('Sign in to use AI features');
    return;
  }

  const btn = document.getElementById('btn-ai-generate');
  const setBtn = (label, disabled = true) => { if (btn) { btn.textContent = label; btn.disabled = disabled; } };

  setBtn('Interpreting elements…');
  outputLabel.textContent = 'subsrf-smart-brief.txt';
  outputEl.innerHTML = '<span style="color:rgba(0,255,135,0.55);">Interpreting UI elements…</span>';

  try {
    const res = await fetch('https://api.subsrf.dev/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${subsrf_session.accessToken}` },
      body: JSON.stringify({ elements, context })
    });

    const data = await res.json();

    if (!res.ok) {
      const msg = data.error === 'insufficient_credits' ? 'No credits remaining' : (data.error || 'Generation failed');
      showToast(msg);
      setBtn('Generate Smart Prompt (1 credit)', false);
      return;
    }

    // Update credit balance from server response
    session = { ...session, credits: data.balance };
    await chrome.storage.local.set({ subsrf_session: session });
    renderAiGate();

    // Store enriched data and render the smart output
    smartEnriched = data.enriched;
    outputLabel.textContent = 'subsrf-smart-brief.txt';
    outputEl.innerHTML = buildSmartPromptHTML(smartEnriched, elements, context);

    setBtn('Regenerate (1 credit)', false);
    showToast('Smart prompt ready');

  } catch (e) {
    outputEl.textContent = `Error: ${e.message}`;
    setBtn('Generate Smart Prompt (1 credit)', false);
    showToast('Generation failed');
  }
}

// ── Smart Prompt Assembler ────────────────────────────────────────────────────

const CIRCLED = ['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩'];

function buildSmartPromptLines(enriched, rawElements, ctx) {
  const hostname = ctx.url
    ? (() => { try { return new URL(ctx.url).hostname.replace(/^www\./, ''); } catch { return ctx.url; } })()
    : 'Unknown';
  const rule = '─'.repeat(56);
  const lines = [];

  lines.push(`SMART BRIEF — ${enriched.pagePattern || 'UI Capture'} | ${hostname}`);
  lines.push(rule);
  lines.push('');

  // Build a map from element index → enriched element data
  const elMap = {};
  (enriched.elements || []).forEach(el => { elMap[el.index] = el; });

  // Components with their elements
  const components = enriched.components || [];
  if (components.length > 0) {
    lines.push('COMPONENTS');
    lines.push('');
    components.forEach((comp, ci) => {
      const num = CIRCLED[ci] || `${ci + 1}.`;
      lines.push(`${num} ${comp.name}`);
      if (comp.description) lines.push(`   ${comp.description}`);
      (comp.elementIndices || []).forEach(idx => {
        const el = elMap[idx];
        const raw = rawElements[idx];
        if (!el && !raw) return;
        const label = el?.label || raw?.tagName || `Element ${idx + 1}`;
        const desc  = el?.description || '';
        lines.push(`   └─ [${idx + 1}] ${label}${desc ? ' — ' + desc : ''}`);
        if (el?.accessibilityNote) lines.push(`      ⚠ ${el.accessibilityNote}`);
      });
      lines.push('');
    });

    // Any elements not assigned to a component
    const assigned = new Set(components.flatMap(c => c.elementIndices || []));
    const unassigned = rawElements
      .map((_, i) => i)
      .filter(i => !assigned.has(i) && elMap[i]);
    if (unassigned.length > 0) {
      lines.push(`${CIRCLED[components.length] || `${components.length + 1}.`} Other Elements`);
      lines.push('');
      unassigned.forEach(idx => {
        const el = elMap[idx];
        lines.push(`   └─ [${idx + 1}] ${el.label}${el.description ? ' — ' + el.description : ''}`);
        if (el.accessibilityNote) lines.push(`      ⚠ ${el.accessibilityNote}`);
      });
      lines.push('');
    }
  }

  // Accessibility section
  const a11y = enriched.accessibilityIssues || [];
  if (a11y.length > 0) {
    lines.push(rule);
    lines.push('');
    lines.push('ACCESSIBILITY GAPS');
    lines.push('');
    a11y.forEach(issue => lines.push(`  ⚠ ${issue}`));
    lines.push('');
  }

  // Implementation prompt
  if (enriched.implementationPrompt) {
    lines.push(rule);
    lines.push('');
    lines.push('IMPLEMENTATION PROMPT');
    lines.push('');
    lines.push(enriched.implementationPrompt);
    lines.push('');
    lines.push('Stack: React 18 · Tailwind CSS · shadcn/ui');
  }

  return lines;
}

function buildSmartPromptHTML(enriched, rawElements, ctx) {
  const lines = buildSmartPromptLines(enriched, rawElements, ctx);
  return esc(lines.join('\n'));
}

function buildSmartPromptText(enriched, rawElements, ctx) {
  return buildSmartPromptLines(enriched, rawElements, ctx).join('\n');
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

function renderSidebar() {
  elCountEl.textContent = elements.length;

  if (elements.length === 0) {
    elListEl.innerHTML = `<div style="padding:32px 16px; text-align:center; font-size:11px; color:var(--muted);">No elements selected.<br>Use Smart Select or Region Tool on the page.</div>`;
    return;
  }

  elListEl.innerHTML = elements.map((el, i) => {
    const bg  = el.styles?.backgroundColor;
    const fg  = el.styles?.color;
    const cls = el.cls
      ? el.cls.split(' ').filter(Boolean).map(c => '.' + c).join('').slice(0, 24)
      : '';
    const txt = el.text ? `"${el.text.slice(0, 36)}${el.text.length > 36 ? '…' : ''}"` : '';
    const w   = el.rect?.width  ? Math.round(el.rect.width)  : null;
    const h   = el.rect?.height ? Math.round(el.rect.height) : null;

    const hasBg = bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)';
    const hasFg = fg && fg !== 'transparent';

    return `
      <div class="el-card" data-index="${i}">
        <div class="el-top">
          <span class="el-num">${i + 1}</span>
          <span class="el-tag">${el.tagName}</span>
          ${cls ? `<span class="el-cls">${cls}</span>` : ''}
        </div>
        ${txt ? `<div class="el-txt">${txt}</div>` : ''}
        <div class="swatches">
          ${hasBg ? `<div class="swatch" title="${bg}" style="background:${bg};"></div>` : ''}
          ${hasFg ? `<div class="swatch" title="${fg}" style="background:${fg};"></div>` : ''}
          ${w && h ? `<span class="swatch-dim">${w}×${h}</span>` : ''}
        </div>
      </div>`;
  }).join('');

  elListEl.querySelectorAll('.el-card').forEach((card) => {
    card.addEventListener('click', () => activateCard(card, Number(card.dataset.index)));
  });
}

function activateCard(card, i) {
  document.querySelectorAll('.el-card').forEach(c => c.classList.remove('active'));
  card.classList.add('active');

  document.querySelectorAll('.el-section').forEach(s => s.classList.remove('hl'));
  const sec = document.getElementById(`el-sec-${i}`);
  if (sec) {
    sec.classList.add('hl');
    sec.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ── Output ────────────────────────────────────────────────────────────────────

function renderOutput() {
  if (elements.length === 0) {
    outputEl.innerHTML = esc([
      'No elements selected.',
      '',
      'How to use:',
      '  1. Click the Subsrf extension icon in your browser toolbar',
      '  2. Choose "Smart Click" to pick individual elements, or',
      '     "Region" to select everything inside a drawn area',
      '  3. Click "Preview AI" in the on-page toolbar to return here',
    ].join('\n'));
    return;
  }

  if (mode === 'prompt') {
    if (smartEnriched) {
      outputLabel.textContent = 'subsrf-smart-brief.txt';
      outputEl.innerHTML = buildSmartPromptHTML(smartEnriched, elements, context);
    } else {
      outputLabel.textContent = 'subsrf-brief.txt';
      outputEl.innerHTML = generatePromptHTML(elements, context);
    }
  } else {
    outputLabel.textContent = 'subsrf-export.css';
    outputEl.innerHTML = generateCSSHTML(elements, context);
  }
}

// ── Prompt Generator ──────────────────────────────────────────────────────────

function elementTypeLabel(tagName) {
  const tag = (tagName || '').toUpperCase();
  const map = { A: 'LINK', IMG: 'MEDIA', VIDEO: 'MEDIA', AUDIO: 'MEDIA', BUTTON: 'BUTTON', INPUT: 'INPUT', TEXTAREA: 'TEXTAREA' };
  return map[tag] || tag;
}

function buildStylesString(el) {
  const s = el.styles || {};
  const r = el.rect   || {};
  const parts = [];
  if (s.display)            parts.push(`display: ${s.display}`);
  parts.push(`position: ${s.position || 'static'}`);
  if (r.width)              parts.push(`width: ${Math.round(r.width)}px`);
  if (r.height)             parts.push(`height: ${Math.round(r.height)}px`);
  const hasBg = s.backgroundColor && s.backgroundColor !== 'transparent' && s.backgroundColor !== 'rgba(0, 0, 0, 0)';
  if (hasBg)                parts.push(`background-color: ${s.backgroundColor}`);
  if (s.color)              parts.push(`color: ${s.color}`);
  if (s.fontSize)           parts.push(`font-size: ${s.fontSize}`);
  if (s.fontFamily)         parts.push(`font-family: ${s.fontFamily}`);
  if (s.fontWeight)         parts.push(`font-weight: ${s.fontWeight}`);
  if (s.lineHeight && s.lineHeight !== 'normal') parts.push(`line-height: ${s.lineHeight}`);
  if (s.textAlign && s.textAlign !== 'start')    parts.push(`text-align: ${s.textAlign}`);
  if (s.borderTopColor)     parts.push(`border: ${s.borderTopColor}`);
  if (s.borderRadius && s.borderRadius !== '0px') parts.push(`border-radius: ${s.borderRadius}`);
  if (s.boxShadow && s.boxShadow !== 'none')     parts.push(`box-shadow: ${s.boxShadow}`);
  if (s.opacity && parseFloat(s.opacity) !== 1)  parts.push(`opacity: ${s.opacity}`);
  if (s.flexDirection)      parts.push(`flex-direction: ${s.flexDirection}`);
  if (s.justifyContent)     parts.push(`justify-content: ${s.justifyContent}`);
  if (s.alignItems)         parts.push(`align-items: ${s.alignItems}`);
  if (s.gap && s.gap !== '0px' && s.gap !== 'normal') parts.push(`gap: ${s.gap}`);
  const pad = [s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft];
  if (pad.some(v => v && v !== '0px')) parts.push(`padding: ${pad.join(' ')}`);
  const mar = [s.marginTop, s.marginRight, s.marginBottom, s.marginLeft];
  if (mar.some(v => v && v !== '0px')) parts.push(`margin: ${mar.join(' ')}`);
  return '{ ' + parts.join('; ') + ' }';
}

function buildElementLines(el, i) {
  const r = el.rect || {};
  const typeLabel = elementTypeLabel(el.tagName);
  const w  = r.width  ? Math.round(r.width)  : '?';
  const h  = r.height ? Math.round(r.height) : '?';
  const px = r.left   ? Math.round(r.left)   : 0;
  const py = r.top    ? Math.round(r.top)    : 0;

  const lines = [];
  lines.push(`[${i + 1}] ${typeLabel}`);
  lines.push(`Tag: <${el.tagName.toLowerCase()}> | Box: ${w}x${h}px at (${px},${py})`);
  lines.push('');
  if (el.cls) {
    const sel = el.cls.split(' ').filter(Boolean).map(c => '.' + c).join('');
    lines.push(`Selector: ${sel}`);
    lines.push('');
  }
  if (el.text && el.text.trim()) {
    lines.push(`Text: "${el.text.slice(0, 120)}${el.text.length > 120 ? '…' : ''}"`);
    lines.push('');
  }
  const attrs = el.attributes || {};
  const attrParts = [];
  if (attrs.href) attrParts.push(`href="${attrs.href}"`);
  if (attrs.src)  attrParts.push(`src="${attrs.src}"`);
  if (attrs.alt)  attrParts.push(`alt="${attrs.alt}"`);
  if (attrParts.length > 0) {
    lines.push(`Attrs: ${attrParts.join(' ')}`);
    lines.push('');
  }
  lines.push(`Styles: ${buildStylesString(el)}`);
  lines.push('');
  return lines;
}

function promptHeader(els, ctx) {
  const hostname = ctx.url
    ? (() => { try { return new URL(ctx.url).hostname.replace(/^www\./, ''); } catch { return ctx.url; } })()
    : 'Unknown';
  const siteName = hostname.split('.')[0];
  const sitePretty = siteName.charAt(0).toUpperCase() + siteName.slice(1);
  const pageTitle = ctx.title || hostname;
  const vp = ctx.viewport ? `${ctx.viewport.w}x${ctx.viewport.h}` : 'unknown';

  return [
    `Subsrf UI Brief: ${pageTitle} | ${sitePretty}`,
    `URL: ${ctx.url || 'Unknown'}`,
    '',
    `Viewport: ${vp} | Count: ${els.length}`,
    '',
    '🧠 Frontend Implementation Skill: Active',
    'Goal: Rebuild the provided UI with 1:1 visual fidelity using production-grade engineering.',
    '',
    'Visual Fidelity: Match the source colors, spacing, and typography exactly as provided in the Subsrf data. Do NOT change the aesthetic direction.',
    '',
    'Technical Quality: Use clean, modular React 18+ components and optimized Tailwind CSS.',
    '',
    'Motion & Depth: Enhance the source with subtle, high-quality micro-interactions (staggered reveals, smooth transitions) that complement the existing design.',
    '',
    'Accessibility: Implement Radix UI / shadcn primitives to ensure the implementation is fully accessible.',
    '',
    'CRITICAL: The source design is the single source of truth. The Skill is for implementation excellence.',
    '',
  ].join('\n');
}

const PROMPT_FOOTER = '\nTask: Rebuild these elements using React 18, Tailwind CSS, and shadcn/ui. Match visual fidelity precisely.';

function generatePromptHTML(els, ctx) {
  const header = promptHeader(els, ctx);
  const elSections = els.map((el, i) =>
    `<span id="el-sec-${i}" class="el-section">${esc(buildElementLines(el, i).join('\n'))}</span>`
  );
  return esc(header) + elSections.join('') + esc(PROMPT_FOOTER);
}

function generatePrompt(els, ctx) {
  const out = [promptHeader(els, ctx)];
  els.forEach((el, i) => out.push(buildElementLines(el, i).join('\n')));
  out.push(PROMPT_FOOTER);
  return out.join('\n');
}

// ── CSS Generator ─────────────────────────────────────────────────────────────

function generateCSSHTML(els, ctx) {
  const now  = new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
  const host = ctx.url ? (() => { try { return new URL(ctx.url).hostname; } catch { return ctx.url; } })() : 'unknown';

  const header = [
    '/*',
    ' * ════════════════════════════════════════════════',
    ' * SUBSRF CSS EXPORT',
    ` * Source: ${ctx.title || host}`,
    ` * URL:    ${ctx.url || 'unknown'}`,
    ` * Date:   ${now}`,
    ' * ════════════════════════════════════════════════',
    ' */',
    '',
  ].join('\n');

  const elSections = els.map((el, i) => {
    const lines = buildCSSLines(el, i);
    return `<span id="el-sec-${i}" class="el-section">${esc(lines.join('\n'))}</span>`;
  });

  return esc(header) + elSections.join('');
}

function generateCSS(els, ctx) {
  const now  = new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
  const host = ctx.url ? (() => { try { return new URL(ctx.url).hostname; } catch { return ctx.url; } })() : 'unknown';
  const out = [
    '/*',
    ' * ════════════════════════════════════════════════',
    ' * SUBSRF CSS EXPORT',
    ` * Source: ${ctx.title || host}`,
    ` * URL:    ${ctx.url || 'unknown'}`,
    ` * Date:   ${now}`,
    ' * ════════════════════════════════════════════════',
    ' */',
    '',
  ];
  els.forEach((el, i) => out.push(...buildCSSLines(el, i)));
  return out.join('\n');
}

function buildCSSLines(el, i) {
  const s = el.styles || {};
  const r = el.rect   || {};
  const cls = el.cls ? el.cls.split(' ').filter(Boolean)[0] : null;
  const selector = cls ? `.${cls}` : `.subsrf-element-${i + 1}`;
  const tagLabel = `${el.tagName}${cls ? '.' + cls : ''}`;
  const lines = [];

  lines.push(`/* ── [${i + 1}] ${tagLabel} ${'─'.repeat(Math.max(2, 46 - tagLabel.length))} */`);
  if (el.text && el.text.trim()) {
    lines.push(`/* Content: "${el.text.slice(0, 48)}${el.text.length > 48 ? '…' : ''}" */`);
  }
  if (r.width && r.height) {
    lines.push(`/* Size: ${Math.round(r.width)} × ${Math.round(r.height)} px */`);
  }
  lines.push(`${selector} {`);

  const hasFontProps = s.fontFamily || s.fontSize || s.color || s.fontWeight;
  if (hasFontProps) {
    lines.push('  /* Typography */');
    if (s.fontFamily) lines.push(`  font-family: ${s.fontFamily};`);
    if (s.fontSize)   lines.push(`  font-size: ${s.fontSize};`);
    if (s.fontWeight) lines.push(`  font-weight: ${s.fontWeight};`);
    if (s.color)      lines.push(`  color: ${s.color};`);
    if (s.lineHeight && s.lineHeight !== 'normal') lines.push(`  line-height: ${s.lineHeight};`);
    if (s.textAlign && s.textAlign !== 'start')    lines.push(`  text-align: ${s.textAlign};`);
    lines.push('');
  }

  const hasBg  = s.backgroundColor && s.backgroundColor !== 'transparent' && s.backgroundColor !== 'rgba(0, 0, 0, 0)';
  const hasBdr = s.borderTopWidth && parseInt(s.borderTopWidth) > 0;
  const hasSh  = s.boxShadow && s.boxShadow !== 'none';
  const hasRad = s.borderRadius && s.borderRadius !== '0px';
  const hasOp  = s.opacity && parseFloat(s.opacity) !== 1;
  if (hasBg || hasBdr || hasSh || hasRad || hasOp) {
    lines.push('  /* Background & Border */');
    if (hasBg)  lines.push(`  background-color: ${s.backgroundColor};`);
    if (hasRad) lines.push(`  border-radius: ${s.borderRadius};`);
    if (hasBdr) lines.push(`  border: ${s.borderTopWidth} solid ${s.borderTopColor};`);
    if (hasSh)  lines.push(`  box-shadow: ${s.boxShadow};`);
    if (hasOp)  lines.push(`  opacity: ${s.opacity};`);
    lines.push('');
  }

  const pad = [s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft];
  const mar = [s.marginTop,  s.marginRight,  s.marginBottom,  s.marginLeft];
  const hasPad = pad.some(v => v && v !== '0px');
  const hasMar = mar.some(v => v && v !== '0px' && v !== 'auto');
  if (hasPad || hasMar) {
    lines.push('  /* Spacing */');
    if (hasPad) lines.push(`  padding: ${pad.join(' ')};`);
    if (hasMar) lines.push(`  margin: ${mar.join(' ')};`);
    lines.push('');
  }

  if (r.width && r.height) {
    lines.push('  /* Dimensions */');
    lines.push(`  width: ${Math.round(r.width)}px;`);
    lines.push(`  height: ${Math.round(r.height)}px;`);
    lines.push('');
  }

  if (s.display) {
    lines.push('  /* Layout */');
    lines.push(`  display: ${s.display};`);
    if (s.display === 'flex') {
      if (s.flexDirection)  lines.push(`  flex-direction: ${s.flexDirection};`);
      if (s.justifyContent) lines.push(`  justify-content: ${s.justifyContent};`);
      if (s.alignItems)     lines.push(`  align-items: ${s.alignItems};`);
      if (s.gap && s.gap !== '0px' && s.gap !== 'normal') lines.push(`  gap: ${s.gap};`);
    }
    lines.push('');
  }

  lines.push('}');
  lines.push('');
  return lines;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function shortFamily(css) {
  if (!css) return '';
  return css.split(',')[0].replace(/['"]/g, '').trim();
}

function showToast(msg, duration = 2200) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), duration);
}

// ── Bridge Status ─────────────────────────────────────────────────────────────

async function checkBridge() {
  const chipMcp   = document.getElementById('chip-mcp');
  const dotMcp    = document.getElementById('dot-mcp');
  const lblMcp    = document.getElementById('lbl-mcp');
  const chipFigma = document.getElementById('chip-figma');
  const dotFigma  = document.getElementById('dot-figma');
  const lblFigma  = document.getElementById('lbl-figma');

  try {
    const res = await fetch('https://api.subsrf.dev/api/state');
    if (!res.ok) throw new Error('not ok');
    const data = await res.json();

    bridgeOnline   = true;
    figmaConnected = !!data.figmaConnected;

    dotMcp.classList.add('on');
    lblMcp.textContent = 'MCP ONLINE';
    chipMcp.classList.add('online');

    if (figmaConnected) {
      dotFigma.classList.add('on');
      lblFigma.textContent = 'FIGMA CONNECTED';
      chipFigma.classList.add('online');
    } else {
      dotFigma.classList.remove('on');
      lblFigma.textContent = 'FIGMA WAITING';
      chipFigma.classList.remove('online');
    }
  } catch {
    bridgeOnline   = false;
    figmaConnected = false;
    dotMcp.classList.remove('on');
    lblMcp.textContent = 'MCP OFFLINE';
    chipMcp.classList.remove('online');
    dotFigma.classList.remove('on');
    lblFigma.textContent = 'FIGMA WAITING';
    chipFigma.classList.remove('online');
  }
}

// ── Events ────────────────────────────────────────────────────────────────────

togPrompt.addEventListener('click', () => {
  mode = 'prompt';
  togPrompt.classList.add('active');
  togCss.classList.remove('active');
  renderOutput();
});

togCss.addEventListener('click', () => {
  mode = 'css';
  togCss.classList.add('active');
  togPrompt.classList.remove('active');
  renderOutput();
});

btnCopy.addEventListener('click', async () => {
  try {
    let plain;
    if (mode === 'prompt' && smartEnriched) {
      plain = buildSmartPromptText(smartEnriched, elements, context);
    } else if (mode === 'prompt') {
      plain = generatePrompt(elements, context);
    } else {
      plain = generateCSS(elements, context);
    }
    await navigator.clipboard.writeText(plain);
    showToast('Copied to clipboard!');
  } catch {
    showToast('Copy failed — try selecting and copying manually');
  }
});


// ── Start ─────────────────────────────────────────────────────────────────────
init();
