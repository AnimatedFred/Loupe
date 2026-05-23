// Subsrf Studio — Precision Vector Engine v8.1
let mainCanvas, drawCanvas, mCtx, dCtx;
let img = new Image();
let currentTool = 'select';
let zoom = 1.0;

// State
let objects = [];
let selectedIndex = -1;
let currentObject = null;
let dragAction = 'none'; // 'move', 'resize', 'rotate', 'create'
let startPos = { x: 0, y: 0 };
let lastMousePos = { x: 0, y: 0 };
let originalRect = null;

window.onload = async () => {
  try {
    mainCanvas = document.getElementById('main-canvas');
    drawCanvas = document.getElementById('draw-layer');
    mCtx = mainCanvas.getContext('2d');
    dCtx = drawCanvas.getContext('2d');
  
    console.log('[Subsrf Studio] Initializing...');
    const data = await chrome.storage.local.get(['lastCapture', 'lastCaptureRect', 'lastCaptureViewportWidth', 'openAnalysisTab', 'captureWatermark']);
    const pendingAnalysis = data.openAnalysisTab || null;
    const needsWatermark = !!data.captureWatermark;
    if (pendingAnalysis) chrome.storage.local.remove('openAnalysisTab');
    chrome.storage.local.remove('captureWatermark');
    console.log('[Subsrf Studio] Storage retrieved. Capture size:', data.lastCapture ? data.lastCapture.length : 0);

    if (data.lastCapture) {
      img.src = data.lastCapture;
      img.onload = () => {
        console.log('[Subsrf Studio] Image loaded successfully:', img.width, 'x', img.height);

        if (data.lastCaptureRect && data.lastCaptureViewportWidth) {
          // Crop the full screenshot down to just the selected region.
          // The screenshot is taken at device pixel ratio, so scale coords accordingly.
          const scale = img.width / data.lastCaptureViewportWidth;
          const r = data.lastCaptureRect;
          const sx = Math.round(r.x * scale);
          const sy = Math.round(r.y * scale);
          const sw = Math.round(r.w * scale);
          const sh = Math.round(r.h * scale);
          mainCanvas.width = sw; mainCanvas.height = sh;
          drawCanvas.width = sw; drawCanvas.height = sh;
          mCtx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
          // Clear the rect so future editor opens don't re-apply this crop
          chrome.storage.local.remove(['lastCaptureRect', 'lastCaptureViewportWidth']);
        } else {
          mainCanvas.width = img.width; mainCanvas.height = img.height;
          drawCanvas.width = img.width; drawCanvas.height = img.height;
          mCtx.drawImage(img, 0, 0);
        }

        if (mainCanvas.width > window.innerWidth - 320) {
          zoom = (window.innerWidth - 320) / mainCanvas.width; updateZoom();
        }

        if (needsWatermark) applyWatermark();
        requestAnimationFrame(drawLoop);
        if (pendingAnalysis) activateAnalysisTab(pendingAnalysis);
      };
      img.onerror = (e) => {
        console.error('[Subsrf Studio] Image failed to load:', e);
        showToast('Error: Capture corrupted');
      };
    } else {
      console.warn('[Subsrf Studio] No capture found in storage.');
      showToast('No capture data found.');
    }
    
    setupEventListeners();
    refreshLayers(); // Initial sidebar refresh
    console.log('[Subsrf Studio] Init complete.');
  } catch (err) {
    console.error('[Subsrf Studio] Critical Init Error:', err);
  }
};

function applyWatermark() {
  const w = mainCanvas.width;
  const h = mainCanvas.height;
  const fontSize = Math.max(13, Math.round(Math.min(w, h) * 0.022));

  // Diagonal tiled text
  mCtx.save();
  mCtx.font = `600 ${fontSize}px "Azeret Mono", monospace`;
  mCtx.fillStyle = 'rgba(0, 255, 135, 0.13)';
  mCtx.textAlign = 'center';
  mCtx.textBaseline = 'middle';
  const step = fontSize * 9;
  for (let y = -step; y < h + step; y += step) {
    for (let x = -step; x < w + step; x += step) {
      mCtx.save();
      mCtx.translate(x, y);
      mCtx.rotate(-Math.PI / 6);
      mCtx.fillText('subsrf.dev', 0, 0);
      mCtx.restore();
    }
  }

  // Corner badge
  const pad = 10;
  const badgeH = fontSize + 10;
  const badgeW = mCtx.measureText('subsrf.dev').width + 24;
  mCtx.fillStyle = 'rgba(5,5,8,0.72)';
  mCtx.fillRect(w - badgeW - pad, h - badgeH - pad, badgeW, badgeH);
  mCtx.fillStyle = 'rgba(0,255,135,0.85)';
  mCtx.fillText('subsrf.dev', w - badgeW / 2 - pad, h - badgeH / 2 - pad);
  mCtx.restore();

  // Lock the AI analysis tab — free tier cannot run AI on watermarked captures
  const analysisTab = document.getElementById('tab-analysis');
  if (analysisTab) {
    analysisTab.disabled = true;
    analysisTab.title = 'AI Analysis requires a paid plan';
    analysisTab.style.opacity = '0.35';
    analysisTab.style.cursor = 'not-allowed';
  }
}

function setupEventListeners() {
  const tools = ['select', 'rect', 'circle', 'star', 'arrow', 'text', 'comment', 'emoji', 'pen'];
  tools.forEach(t => {
    const btn = document.getElementById(`tool-${t}`);
    if (btn) btn.onclick = () => setTool(t);
  });

  document.getElementById('zoom-in').onclick = () => { zoom += 0.1; updateZoom(); };
  document.getElementById('zoom-out').onclick = () => { zoom = Math.max(0.1, zoom - 0.1); updateZoom(); };

  drawCanvas.onmousedown = handleMouseDown;
  window.onmousemove = handleMouseMove;
  window.onmouseup = handleMouseUp;

  document.getElementById('color-picker').oninput = (e) => {
    if (selectedIndex !== -1) { objects[selectedIndex].color = e.target.value; refreshLayers(); }
  };

  document.getElementById('stroke-size').oninput = (e) => {
    if (selectedIndex !== -1 && objects[selectedIndex].type === 'pen') {
      objects[selectedIndex].lineWidth = parseInt(e.target.value) || 4;
    }
  };

  document.getElementById('btn-fill').onclick = () => {
    if (selectedIndex !== -1) {
      objects[selectedIndex].fill = !objects[selectedIndex].fill;
      document.getElementById('btn-fill').classList.toggle('active', objects[selectedIndex].fill);
    }
  };

  document.getElementById('btn-bring-front').onclick = () => moveObjectDepth(1);
  document.getElementById('btn-send-back').onclick = () => moveObjectDepth(-1);

  document.getElementById('btn-text-save').onclick = saveText;
  document.getElementById('text-input').onkeydown = (e) => { if(e.key === 'Enter') saveText(); };
  document.getElementById('btn-download').onclick = download;
  document.getElementById('btn-copy').onclick = copyToClipboard;

  document.getElementById('btn-comment-save').onclick = saveComment;
  document.getElementById('btn-comment-cancel').onclick = closeCommentOverlay;
  document.getElementById('comment-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) saveComment();
    if (e.key === 'Escape') closeCommentOverlay();
  });

  drawCanvas.addEventListener('dblclick', (e) => {
    if (currentTool !== 'select') return;
    if (selectedIndex !== -1 && objects[selectedIndex]?.type === 'comment') {
      showCommentOverlay(getCanvasPos(e), selectedIndex);
    }
  });

  // Emoji listeners (Sidebar + Tray)
  document.querySelectorAll('.emoji-item, .tray-emoji').forEach(btn => {
    btn.onclick = () => addEmoji(btn.textContent);
  });

  // Cursor listeners
  document.querySelectorAll('.tray-cursor').forEach(btn => {
    btn.onclick = () => addCursor(btn.dataset.cursor);
  });
}

function addCursor(type) {
  const scrollContainer = document.getElementById('editor-viewport');
  const x = scrollContainer.scrollLeft + 150;
  const y = scrollContainer.scrollTop + 150;
  
  objects.push({
    id: Date.now() + Math.random(),
    type: 'cursor',
    cursorType: type,
    x: x,
    y: y,
    w: 32,
    h: 32,
    angle: 0,
    color: '#000000',
    fill: true
  });
  selectedIndex = objects.length - 1;
  setTool('select');
  refreshLayers();
  showToast('Cursor added');
}

function addEmoji(char) {
  const scrollContainer = document.getElementById('editor-viewport');
  const x = scrollContainer.scrollLeft + 100;
  const y = scrollContainer.scrollTop + 100;
  
  objects.push({
    id: Date.now() + Math.random(),
    type: 'emoji',
    text: char,
    x: x,
    y: y,
    w: 64,
    h: 64,
    angle: 0,
    color: '#000000',
    fill: true
  });
  selectedIndex = objects.length - 1;
  setTool('select');
  refreshLayers();
  showToast('Emoji added');
}

function moveObjectDepth(direction) {
  if (selectedIndex === -1) return;
  const obj = objects.splice(selectedIndex, 1)[0];
  if (direction === 1) objects.push(obj);
  else objects.unshift(obj);
  selectedIndex = direction === 1 ? objects.length - 1 : 0;
  refreshLayers();
  showToast(direction === 1 ? 'Brought to front' : 'Sent to back');
}

function setTool(t) {
  const tray = document.getElementById('emoji-tray');
  
  if (t === 'emoji' && currentTool === 'emoji') {
    // Toggle close if clicking active emoji tool
    tray.classList.toggle('open');
    return;
  }

  currentTool = t;
  document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
  const activeBtn = document.getElementById(`tool-${t}`);
  if (activeBtn) activeBtn.classList.add('active');
  
  if (t === 'emoji') {
    tray.classList.add('open');
  } else {
    tray.classList.remove('open');
  }

  drawCanvas.className = (t === 'select') ? 'mode-select' : '';
  if (t !== 'select') selectedIndex = -1;
  refreshLayers();
}

function updateZoom() {
  document.getElementById('canvas-container').style.transform = `scale(${zoom})`;
  document.getElementById('zoom-level').textContent = `${Math.round(zoom * 100)}%`;
}

function handleMouseDown(e) {
  const pos = getCanvasPos(e);
  startPos = pos; lastMousePos = pos;

  if (currentTool === 'select') {
    if (selectedIndex !== -1 && objects[selectedIndex].type !== 'pen') {
      const action = getHandleAt(pos, objects[selectedIndex]);
      if (action !== 'none') {
        dragAction = action; originalRect = { ...objects[selectedIndex] };
        return;
      }
    }
    const hitIndex = getObjectAt(pos);
    selectedIndex = hitIndex;
    if (hitIndex !== -1) {
      dragAction = 'move';
      originalRect = { ...objects[selectedIndex] };
      if (objects[selectedIndex].type === 'pen') {
        originalRect.points = objects[selectedIndex].points.map(p => ({ ...p }));
        document.getElementById('stroke-size').value = objects[selectedIndex].lineWidth || 4;
      }
      document.getElementById('color-picker').value = objects[selectedIndex].color;
      document.getElementById('btn-fill').classList.toggle('active', objects[selectedIndex].fill);
    }
    refreshLayers();
  } else {
    if (currentTool === 'text') { showTextOverlay(pos); return; }
    if (currentTool === 'comment') { showCommentOverlay(pos); return; }
    if (currentTool === 'pen') {
      dragAction = 'create';
      currentObject = {
        id: Date.now() + Math.random(),
        type: 'pen',
        points: [{ x: pos.x, y: pos.y }],
        color: document.getElementById('color-picker').value,
        lineWidth: parseInt(document.getElementById('stroke-size').value) || 4,
        angle: 0, x: pos.x, y: pos.y, w: 0, h: 0
      };
      return;
    }
    dragAction = 'create';
    currentObject = {
      id: Date.now() + Math.random(),
      type: currentTool, x: pos.x, y: pos.y, w: 0, h: 0, angle: 0,
      color: document.getElementById('color-picker').value, fill: false
    };
  }
}

function handleMouseMove(e) {
  const pos = getCanvasPos(e);
  const dx = pos.x - startPos.x;
  const dy = pos.y - startPos.y;

  if (dragAction === 'none' && currentTool === 'select') {
    let cursor = 'default';
    if (selectedIndex !== -1) {
      const handle = getHandleAt(pos, objects[selectedIndex]);
      if (handle === 'rotate') cursor = 'grab';
      else if (handle === 'resize') cursor = 'nwse-resize';
    }
    if (cursor === 'default' && getObjectAt(pos) !== -1) cursor = 'move';
    drawCanvas.style.cursor = cursor;
  }

  if (dragAction === 'create' && currentObject) {
    if (currentObject.type === 'pen') {
      currentObject.points.push({ x: pos.x, y: pos.y });
    } else {
      currentObject.w = pos.x - currentObject.x;
      currentObject.h = pos.y - currentObject.y;
    }
  } else if (dragAction === 'move' && selectedIndex !== -1) {
    const obj = objects[selectedIndex];
    if (obj.type === 'pen' && originalRect.points) {
      obj.x = originalRect.x + dx;
      obj.y = originalRect.y + dy;
      obj.points = originalRect.points.map(p => ({ x: p.x + dx, y: p.y + dy }));
    } else {
      obj.x = originalRect.x + dx;
      obj.y = originalRect.y + dy;
    }
  } else if (dragAction === 'resize' && selectedIndex !== -1) {
    if (objects[selectedIndex].type === 'comment') {
      // Height is auto-computed from text wrap; only width is user-controlled
      objects[selectedIndex].w = Math.max(160, originalRect.w + dx);
    } else {
      objects[selectedIndex].w = Math.max(10, originalRect.w + dx);
      objects[selectedIndex].h = Math.max(10, originalRect.h + dy);
    }
  } else if (dragAction === 'rotate' && selectedIndex !== -1) {
    const obj = objects[selectedIndex];
    obj.angle = Math.atan2(pos.y - (obj.y + obj.h/2), pos.x - (obj.x + obj.w/2));
  }
  lastMousePos = pos;
}

function handleMouseUp() {
  if (dragAction === 'create' && currentObject) {
    if (currentObject.type === 'pen') {
      if (currentObject.points.length > 1) {
        const xs = currentObject.points.map(p => p.x);
        const ys = currentObject.points.map(p => p.y);
        currentObject.x = Math.min(...xs);
        currentObject.y = Math.min(...ys);
        currentObject.w = Math.max(...xs) - currentObject.x;
        currentObject.h = Math.max(...ys) - currentObject.y;
        objects.push(currentObject);
        selectedIndex = objects.length - 1;
        setTool('select');
      }
    } else {
      if (currentObject.w < 0) { currentObject.x += currentObject.w; currentObject.w = Math.abs(currentObject.w); }
      if (currentObject.h < 0) { currentObject.y += currentObject.h; currentObject.h = Math.abs(currentObject.h); }
      objects.push(currentObject);
      selectedIndex = objects.length - 1;
      setTool('select');
    }
  }
  dragAction = 'none'; currentObject = null; originalRect = null;
  refreshLayers();
}

function drawLoop() {
  dCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
  objects.forEach((obj, index) => drawObject(dCtx, obj, index === selectedIndex));
  if (currentObject) drawObject(dCtx, currentObject, false);
  requestAnimationFrame(drawLoop);
}

function drawObject(ctx, obj, isSelected) {
  if (obj.type === 'comment') { drawComment(ctx, obj, isSelected); return; }
  ctx.save();
  const cx = obj.x + obj.w/2; const cy = obj.y + obj.h/2;
  ctx.translate(cx, cy); ctx.rotate(obj.angle || 0); ctx.translate(-cx, -cy);
  ctx.strokeStyle = obj.color; ctx.fillStyle = obj.color; ctx.lineWidth = 6;
  const x = obj.x, y = obj.y, w = obj.w, h = obj.h;

  if (obj.type === 'rect') obj.fill ? ctx.fillRect(x, y, w, h) : ctx.strokeRect(x, y, w, h);
  else if (obj.type === 'circle') {
    ctx.beginPath(); ctx.ellipse(x + w/2, y + h/2, Math.abs(w/2), Math.abs(h/2), 0, 0, Math.PI*2);
    obj.fill ? ctx.fill() : ctx.stroke();
  } else if (obj.type === 'star') drawStar(ctx, x + w/2, y + h/2, 5, Math.abs(w/2), Math.abs(w/4), obj.fill);
  else if (obj.type === 'arrow') drawArrow(ctx, x, y, x + w, y + h);
  else if (obj.type === 'text' || obj.type === 'emoji') {
    const fontSize = Math.max(16, Math.abs(obj.h));
    ctx.font = obj.type === 'emoji' ? `${fontSize}px serif` : `bold ${fontSize}px Inter, sans-serif`;
    ctx.textBaseline = 'top';
    ctx.fillText(obj.text, x, y);
  } else if (obj.type === 'cursor') {
    drawCursor(ctx, obj.cursorType, x, y, Math.max(24, Math.abs(obj.w)));
  } else if (obj.type === 'pen') {
    if (!obj.points || obj.points.length < 2) { ctx.restore(); return; }
    ctx.lineWidth = obj.lineWidth || 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(obj.points[0].x, obj.points[0].y);
    for (let i = 1; i < obj.points.length - 1; i++) {
      const mx = (obj.points[i].x + obj.points[i + 1].x) / 2;
      const my = (obj.points[i].y + obj.points[i + 1].y) / 2;
      ctx.quadraticCurveTo(obj.points[i].x, obj.points[i].y, mx, my);
    }
    ctx.lineTo(obj.points[obj.points.length - 1].x, obj.points[obj.points.length - 1].y);
    ctx.stroke();
  }

  if (isSelected) {
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 4;
    ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
    ctx.strokeRect(x - 4, y - 4, w + 8, h + 8);
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;

    if (obj.type !== 'pen' && obj.type !== 'comment') {
      // Resize Handle (Bottom Right)
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 2;
      ctx.fillRect(x + w, y + h, 14, 14);
      ctx.strokeRect(x + w, y + h, 14, 14);

      // Rotate Handle
      ctx.fillStyle = '#6366f1';
      ctx.strokeStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(x + w/2, y - 4); ctx.lineTo(x + w/2, y - 20); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + w/2, y - 28, 10, 0, Math.PI*2); ctx.fill();
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawCursor(ctx, type, x, y, size) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'white'; ctx.strokeStyle = 'black'; ctx.lineWidth = 2;
  if (type === 'default') {
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, size); ctx.lineTo(size * 0.3, size * 0.7); ctx.lineTo(size * 0.7, size * 0.7); ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if (type === 'pointer') {
    const s = size / 24;
    ctx.scale(s, s);
    ctx.beginPath();
    ctx.moveTo(10, 11); ctx.lineTo(10, 6); ctx.arc(12, 6, 2, Math.PI, 0); ctx.lineTo(14, 13);
    ctx.arc(16, 13, 2, Math.PI, 0); ctx.lineTo(18, 8); ctx.arc(20, 8, 2, Math.PI, 0); ctx.lineTo(22, 17);
    ctx.arc(15, 24, 7, 0, Math.PI); ctx.lineTo(2, 17); ctx.arc(7, 12, 5, Math.PI, Math.PI*2); ctx.closePath();
    ctx.fill(); ctx.stroke();
  } else if (type === 'text') {
    ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(5, 0); ctx.moveTo(0, 0); ctx.lineTo(0, size); ctx.moveTo(-5, size); ctx.lineTo(5, size); ctx.stroke();
  } else if (type === 'move') {
    ctx.beginPath();
    ctx.moveTo(-size/2, 0); ctx.lineTo(size/2, 0); ctx.moveTo(0, -size/2); ctx.lineTo(0, size/2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius, fill) {
  let rot = Math.PI / 2 * 3; let step = Math.PI / spikes;
  ctx.beginPath(); ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius); rot += step;
    ctx.lineTo(cx + Math.cos(rot) * innerRadius, cy + Math.sin(rot) * innerRadius); rot += step;
  }
  ctx.closePath(); fill ? ctx.fill() : ctx.stroke();
}

function drawArrow(ctx, fromx, fromy, tox, toy) {
  const headlen = 25; const angle = Math.atan2(toy - fromy, tox - fromx);
  ctx.beginPath(); ctx.moveTo(fromx, fromy); ctx.lineTo(tox, toy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(tox, toy);
  ctx.lineTo(tox - headlen * Math.cos(angle - Math.PI / 6), toy - headlen * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(tox - headlen * Math.cos(angle + Math.PI / 6), toy - headlen * Math.sin(angle + Math.PI / 6));
  ctx.closePath(); ctx.fill();
}

function getObjectAt(pos) {
  for (let i = objects.length - 1; i >= 0; i--) {
    const o = objects[i];
    if (pos.x >= o.x && pos.x <= o.x + o.w && pos.y >= o.y && pos.y <= o.y + o.h) return i;
  }
  return -1;
}

function getHandleAt(pos, obj) {
  if (obj.type === 'comment') {
    // Resize handle sits at bottom-right of bubble body (totalH = h - tail)
    const totalH = obj.h - COMMENT_TAIL_H;
    const hx = obj.x + obj.w, hy = obj.y + totalH;
    if (pos.x >= hx - 5 && pos.x <= hx + 15 && pos.y >= hy - 5 && pos.y <= hy + 15) return 'resize';
    return 'none';
  }
  const x = obj.x, y = obj.y, w = obj.w, h = obj.h;
  if (pos.x >= x + w - 5 && pos.x <= x + w + 15 && pos.y >= y + h - 5 && pos.y <= y + h + 15) return 'resize';
  if (Math.hypot(pos.x - (x + w/2), pos.y - (y - 25)) < 15) return 'rotate';
  return 'none';
}

function getCanvasPos(e) {
  const rect = drawCanvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (drawCanvas.width / rect.width),
    y: (e.clientY - rect.top) * (drawCanvas.height / rect.height)
  };
}

function refreshLayers() {
  const list = document.getElementById('layer-list');
  if (!list) return;
  list.innerHTML = '';
  [...objects].reverse().forEach((obj) => {
    const index = objects.indexOf(obj);
    const item = document.createElement('div');
    item.className = `layer-item ${index === selectedIndex ? 'active' : ''}`;
    
    const info = document.createElement('div');
    info.className = 'layer-info';
    const thumbContent = obj.type === 'emoji'
      ? `<div class="layer-thumb" style="background: transparent; display: flex; align-items: center; justify-content: center; font-size: 18px; line-height: 1;">${obj.text}</div>`
      : obj.type === 'comment'
        ? `<div class="layer-thumb" style="background: rgba(0,255,135,0.12); border: 1px solid rgba(0,255,135,0.3); display: flex; align-items: center; justify-content: center;"><span class="material-symbols-outlined" style="font-size:9px; color:#00FF87;">chat_bubble</span></div>`
        : `<div class="layer-thumb" style="background: ${obj.color};"></div>`;
    const snippet = obj.type === 'comment' && obj.text
      ? `<div class="layer-sub">${obj.text.substring(0, 22)}${obj.text.length > 22 ? '…' : ''}</div>`
      : '';
    info.innerHTML = `
      ${thumbContent}
      <div><div class="layer-name">${obj.type === 'comment' ? 'COMMENT' : obj.type.toUpperCase()}</div>${snippet}</div>
    `;
    
    const actions = document.createElement('div');
    actions.className = 'layer-actions';
    const delBtn = document.createElement('button');
    delBtn.className = 'layer-btn';
    delBtn.innerHTML = '✕';
    delBtn.addEventListener('mousedown', (e) => {
      console.log('[Subsrf Studio] Delete button mousedown for ID:', obj.id);
      e.stopPropagation();
      e.preventDefault();
      handleLayerDeleteById(obj.id);
    });
    actions.appendChild(delBtn);
    
    item.appendChild(info);
    item.appendChild(actions);
    
    item.onclick = (e) => {
      if (e.target.closest('.layer-btn')) return;
      selectedIndex = index;
      setTool('select');
      scrollToObject(objects[index]);
    };
    list.appendChild(item);
  });
}

function scrollToObject(obj) {
  const scrollContainer = document.getElementById('editor-viewport');
  if (!scrollContainer || !obj) return;
  // getBoundingClientRect accounts for the CSS scale(zoom) transform correctly
  const canvasRect = drawCanvas.getBoundingClientRect();
  const vpRect = scrollContainer.getBoundingClientRect();
  const scaleX = canvasRect.width / drawCanvas.width;
  const scaleY = canvasRect.height / drawCanvas.height;
  const cx = canvasRect.left + (obj.x + obj.w / 2) * scaleX;
  const cy = canvasRect.top  + (obj.y + obj.h / 2) * scaleY;
  scrollContainer.scrollLeft += cx - (vpRect.left + vpRect.width  / 2);
  scrollContainer.scrollTop  += cy - (vpRect.top  + vpRect.height / 2);
}

function handleLayerDeleteById(id) {
  console.log('[Subsrf Studio] Deleting layer by ID:', id);
  const idx = objects.findIndex(o => o.id === id);
  if (idx !== -1) {
    objects.splice(idx, 1);
    selectedIndex = -1;
    refreshLayers();
    showToast('Layer deleted');
  } else {
    console.warn('[Subsrf Studio] Delete failed: ID not found', id);
  }
}

function showToast(msg) {
  const toast = document.getElementById('toast-notification');
  const msgEl = document.getElementById('toast-message');
  if (!toast || !msgEl) return;
  msgEl.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

window.addEventListener('keydown', (e) => {
  if ((e.key === 'Delete' || e.key === 'Backspace') && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
    if (selectedIndex !== -1 && objects[selectedIndex]) handleLayerDeleteById(objects[selectedIndex].id);
  }
});

function showTextOverlay(pos) {
  document.getElementById('text-overlay').style.display = 'flex';
  document.getElementById('text-input').focus();
  window.pendingTextPos = pos;
}

function saveText() {
  const textInput = document.getElementById('text-input');
  const text = textInput.value;
  if (text) {
    objects.push({ 
      id: Date.now() + Math.random(),
      type: 'text', text, x: window.pendingTextPos.x, y: window.pendingTextPos.y, w: 200, h: 40, color: document.getElementById('color-picker').value, fill: true 
    });
    selectedIndex = objects.length - 1; setTool('select');
  }
  document.getElementById('text-overlay').style.display = 'none';
  textInput.value = '';
}

// ── Comment tool ──────────────────────────────────────────────────────────────

function showCommentOverlay(pos, editIndex) {
  const overlay = document.getElementById('comment-overlay');
  const input = document.getElementById('comment-input');
  const saveBtn = document.getElementById('btn-comment-save');
  overlay.style.display = 'flex';
  input.value = editIndex !== undefined ? (objects[editIndex].text || '') : '';
  saveBtn.textContent = editIndex !== undefined ? 'Save Comment' : 'Add Comment';
  input.focus();
  window._pendingCommentPos = pos;
  window._editingCommentIndex = editIndex;
}

function closeCommentOverlay() {
  document.getElementById('comment-overlay').style.display = 'none';
  document.getElementById('comment-input').value = '';
  window._pendingCommentPos = null;
  window._editingCommentIndex = undefined;
}

function saveComment() {
  const text = document.getElementById('comment-input').value.trim();
  if (!text) { closeCommentOverlay(); return; }

  if (window._editingCommentIndex !== undefined) {
    objects[window._editingCommentIndex].text = text;
  } else {
    const pos = window._pendingCommentPos || { x: 60, y: 60 };
    objects.push({
      id: Date.now() + Math.random(),
      type: 'comment',
      text,
      x: pos.x,
      y: pos.y,
      w: COMMENT_DEFAULT_W,
      h: 80,
      angle: 0,
      color: '#00FF87',
      fill: true,
    });
    selectedIndex = objects.length - 1;
    setTool('select');
  }

  refreshLayers();
  closeCommentOverlay();
}

// ── Comment drawing ───────────────────────────────────────────────────────────

const COMMENT_DEFAULT_W  = 300;
const COMMENT_PAD        = 14;
const COMMENT_HEADER_H   = 32;
const COMMENT_FONT_SIZE  = 15;
const COMMENT_LINE_H     = 23;
const COMMENT_RADIUS     = 7;
const COMMENT_TAIL_H     = 12;

function wrapText(ctx, text, maxWidth) {
  const lines = [];
  for (const para of text.split('\n')) {
    const words = para.split(' ');
    let line = '';
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    lines.push(line);
    if (lines.length >= 7) break;
  }
  return lines.slice(0, 7);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function roundRectTop(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function drawComment(ctx, obj, isSelected) {
  ctx.save();

  // Width is user-controlled; height is auto from text wrap
  const cw = Math.max(obj.w || COMMENT_DEFAULT_W, 160);

  ctx.font = `400 ${COMMENT_FONT_SIZE}px "Manrope", sans-serif`;
  const textLines = wrapText(ctx, obj.text || '', cw - COMMENT_PAD * 2);
  const bodyH     = Math.max(1, textLines.length) * COMMENT_LINE_H;
  const totalH    = COMMENT_HEADER_H + COMMENT_PAD + bodyH + COMMENT_PAD;

  // Keep hit-test bounds in sync
  obj.w = cw;
  obj.h = totalH + COMMENT_TAIL_H;

  const x = obj.x;
  const y = obj.y;
  const borderColor = isSelected ? '#00FF87' : 'rgba(0,255,135,0.38)';
  const borderWidth = isSelected ? 2 : 1;

  // Drop shadow
  ctx.shadowColor   = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur    = 18;
  ctx.shadowOffsetY = 5;
  roundRect(ctx, x, y, cw, totalH, COMMENT_RADIUS);
  ctx.fillStyle = '#111118';
  ctx.fill();
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

  // Body border
  ctx.strokeStyle = borderColor;
  ctx.lineWidth   = borderWidth;
  roundRect(ctx, x, y, cw, totalH, COMMENT_RADIUS);
  ctx.stroke();

  // Header fill
  ctx.fillStyle = 'rgba(0,255,135,0.09)';
  roundRectTop(ctx, x, y, cw, COMMENT_HEADER_H, COMMENT_RADIUS);
  ctx.fill();

  // Header divider
  ctx.strokeStyle = 'rgba(0,255,135,0.18)';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(x, y + COMMENT_HEADER_H);
  ctx.lineTo(x + cw, y + COMMENT_HEADER_H);
  ctx.stroke();

  // Header label
  ctx.fillStyle     = '#00FF87';
  ctx.font          = `700 10px "Azeret Mono", monospace`;
  ctx.textBaseline  = 'middle';
  ctx.letterSpacing = '1.5px';
  ctx.fillText('NOTE', x + COMMENT_PAD, y + COMMENT_HEADER_H / 2);
  ctx.letterSpacing = '0px';

  // Body text
  ctx.fillStyle    = 'rgba(242,242,244,0.85)';
  ctx.font         = `400 ${COMMENT_FONT_SIZE}px "Manrope", sans-serif`;
  ctx.textBaseline = 'top';
  textLines.forEach((line, i) => {
    ctx.fillText(line, x + COMMENT_PAD, y + COMMENT_HEADER_H + COMMENT_PAD + i * COMMENT_LINE_H);
  });

  // Tail (downward pointer at bottom-left)
  const tailX = x + 22;
  const tailY = y + totalH;
  ctx.fillStyle   = '#111118';
  ctx.strokeStyle = borderColor;
  ctx.lineWidth   = borderWidth;
  ctx.beginPath();
  ctx.moveTo(tailX - 12, tailY);
  ctx.lineTo(tailX, tailY + COMMENT_TAIL_H);
  ctx.lineTo(tailX + 16, tailY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Selection: dashed ring + resize handle (width-only, at bottom-right of bubble)
  if (isSelected) {
    ctx.strokeStyle = '#00FF87';
    ctx.lineWidth   = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(x - 5, y - 5, cw + 10, obj.h + 10);
    ctx.setLineDash([]);

    // Resize handle — bottom-right corner of bubble body (not tail)
    ctx.fillStyle   = '#fff';
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth   = 2;
    ctx.fillRect(x + cw, y + totalH, 14, 14);
    ctx.strokeRect(x + cw, y + totalH, 14, 14);
  }

  ctx.restore();
}

async function download() {
  const final = document.createElement('canvas');
  final.width = mainCanvas.width; final.height = mainCanvas.height;
  const ctx = final.getContext('2d'); ctx.drawImage(mainCanvas, 0, 0);
  objects.forEach(obj => drawObject(ctx, obj, false));
  const link = document.createElement('a');
  link.download = `subsrf-studio-${Date.now()}.png`; link.href = final.toDataURL('image/png'); link.click();
  showToast('Download started!');
}

async function copyToClipboard() {
  const final = document.createElement('canvas');
  final.width = mainCanvas.width; final.height = mainCanvas.height;
  const ctx = final.getContext('2d'); ctx.drawImage(mainCanvas, 0, 0);
  objects.forEach(obj => drawObject(ctx, obj, false));
  final.toBlob(async (blob) => {
    const item = new ClipboardItem({ "image/png": blob });
    await navigator.clipboard.write([item]);
    showToast('Copied to clipboard!');
  });
}

// ── AI Vision Analysis ────────────────────────────────────────────────────────

let editorVisionMode = 'build_prompt';

const EDITOR_MODE_LABELS = {
  build_prompt: 'vision-build-prompt.txt',
};

function activateAnalysisTab(config) {
  const aside = document.querySelector('aside');
  document.getElementById('tab-analysis').classList.add('active');
  document.getElementById('tab-layers').classList.remove('active');
  document.getElementById('panel-layers').style.display = 'none';
  document.getElementById('panel-analysis').style.display = 'flex';
  if (aside) aside.classList.add('wide');
  refreshCreditBadge();
  if (config.mode) {
    editorVisionMode = config.mode;
    document.querySelectorAll('.analysis-mode-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.analysis-mode-btn[data-mode="${config.mode}"]`)?.classList.add('active');
  }
  if (config.autoRun) setTimeout(() => runEditorAnalysis(), 300);
}

async function refreshCreditBadge() {
  const badge = document.getElementById('analysis-credit-badge');
  const balanceText = document.getElementById('sidebar-balance-text');
  const s = await chrome.storage.local.get('subsrf_session');
  const credits = s.subsrf_session?.credits ?? null;
  if (badge) {
    if (credits === null) { badge.textContent = '—'; badge.className = 'analysis-credit-badge'; }
    else {
      badge.textContent = `${credits} credit${credits !== 1 ? 's' : ''}`;
      badge.className = 'analysis-credit-badge' + (credits === 0 ? ' empty' : credits <= 3 ? ' low' : '');
    }
  }
  if (balanceText) {
    balanceText.textContent = credits === null ? '— credits' : `${credits} credit${credits !== 1 ? 's' : ''} remaining`;
  }
}

function setupAnalysisPanel() {
  const aside = document.querySelector('aside');

  document.getElementById('tab-layers').addEventListener('click', () => {
    document.getElementById('tab-layers').classList.add('active');
    document.getElementById('tab-analysis').classList.remove('active');
    document.getElementById('panel-layers').style.display = '';
    document.getElementById('panel-analysis').style.display = 'none';
    if (aside) aside.classList.remove('wide');
  });
  document.getElementById('tab-analysis').addEventListener('click', () => {
    document.getElementById('tab-analysis').classList.add('active');
    document.getElementById('tab-layers').classList.remove('active');
    document.getElementById('panel-layers').style.display = 'none';
    document.getElementById('panel-analysis').style.display = 'flex';
    if (aside) aside.classList.add('wide');
    refreshCreditBadge();
  });

  document.querySelectorAll('.analysis-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      editorVisionMode = btn.dataset.mode;
      document.querySelectorAll('.analysis-mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      // Switching mode: show cards again and reset result
      showAnalysisModeCards();
    });
  });

  document.getElementById('btn-analyze').addEventListener('click', runEditorAnalysis);

  document.getElementById('btn-copy-analysis').addEventListener('click', () => {
    const text = document.getElementById('analysis-output')?.textContent || '';
    navigator.clipboard.writeText(text).then(() => showToast('Copied to clipboard'));
  });

  document.getElementById('btn-new-analysis').addEventListener('click', showAnalysisModeCards);
}

function getEditorImageBase64() {
  const MAX_BYTES = 4 * 1024 * 1024; // 4MB target, safely under Anthropic's 5MB limit
  const MAX_DIM = 2048;

  let w = mainCanvas.width;
  let h = mainCanvas.height;

  // Scale down if either dimension exceeds MAX_DIM
  if (w > MAX_DIM || h > MAX_DIM) {
    const scale = Math.min(MAX_DIM / w, MAX_DIM / h);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }

  const composite = document.createElement('canvas');
  composite.width  = w;
  composite.height = h;
  const ctx = composite.getContext('2d');
  ctx.drawImage(mainCanvas, 0, 0, w, h);
  ctx.drawImage(drawCanvas, 0, 0, w, h);

  // Try JPEG at decreasing quality until under limit
  const qualities = [0.85, 0.7, 0.55, 0.4];
  for (const q of qualities) {
    const dataUrl = composite.toDataURL('image/jpeg', q);
    const b64 = dataUrl.split(',')[1];
    if (b64.length * 0.75 <= MAX_BYTES) return b64; // base64 → bytes: len * 0.75
  }

  // Last resort: lowest quality
  return composite.toDataURL('image/jpeg', 0.25).split(',')[1];
}

function showAnalysisModeCards() {
  document.querySelectorAll('.analysis-mode-btn').forEach(b => b.style.display = '');
  const resultEl = document.getElementById('analysis-result');
  if (resultEl) resultEl.style.display = 'none';
  const actions = document.getElementById('analysis-actions');
  if (actions) actions.style.display = 'none';
  const btn = document.getElementById('btn-analyze');
  if (btn) { btn.style.display = ''; btn.textContent = 'Analyze (1 credit)'; btn.disabled = false; }
}

function showAnalysisResult() {
  document.querySelectorAll('.analysis-mode-btn').forEach(b => b.style.display = 'none');
  const btn = document.getElementById('btn-analyze');
  if (btn) btn.style.display = 'none';
  const resultEl = document.getElementById('analysis-result');
  if (resultEl) resultEl.style.display = '';
  const actions = document.getElementById('analysis-actions');
  if (actions) actions.style.display = 'flex';
}

async function runEditorAnalysis() {
  let subsrf_session;
  try {
    const resp = await chrome.runtime.sendMessage({ type: 'GET_AUTH_STATE' });
    subsrf_session = resp?.session;
  } catch (_) {
    const s = await chrome.storage.local.get('subsrf_session');
    subsrf_session = s.subsrf_session;
  }
  if (!subsrf_session?.accessToken) { showToast('Sign in to use AI Analysis'); return; }

  const tier    = (subsrf_session.tier || 'free').toLowerCase();
  const credits = subsrf_session.credits ?? 0;
  const isPaid  = tier === 'starter' || tier === 'pro';

  if (!isPaid)    { showToast('Paid plan required for AI Analysis'); return; }
  if (credits < 1) { showToast('No credits remaining'); return; }

  const btn = document.getElementById('btn-analyze');
  btn.textContent = 'Analyzing…';
  btn.disabled = true;

  const resultEl  = document.getElementById('analysis-result');
  const outputEl  = document.getElementById('analysis-output');
  if (resultEl) resultEl.style.display = 'none';

  try {
    const body = {
      image:    getEditorImageBase64(),
      mimeType: 'image/jpeg',
      mode:     editorVisionMode,
    };

    const res  = await fetch('https://api.subsrf.dev/api/ai/vision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${subsrf_session.accessToken}` },
      body: JSON.stringify(body)
    });

    let data;
    try { data = await res.json(); }
    catch {
      if (res.status === 401) { showToast('Session expired — sign in again'); }
      else { showToast(`Analysis failed (${res.status})`); }
      return;
    }

    if (!res.ok) {
      if (res.status === 401) { showToast('Session expired — sign in again'); return; }
      showToast(data.error === 'insufficient_credits' ? 'No credits remaining' : (data.error || 'Analysis failed'));
      return;
    }

    // Update credits in storage and refresh badge
    const updated = { ...subsrf_session, credits: data.balance };
    await chrome.storage.local.set({ subsrf_session: updated });
    refreshCreditBadge();

    const lines = buildEditorVisionText(data.result, data.mode);
    if (outputEl) outputEl.textContent = lines;
    if (resultEl) resultEl.style.display = '';
    showAnalysisResult();
    showToast('Analysis complete');

  } catch (e) {
    showToast('Analysis failed: ' + e.message);
  } finally {
    btn.textContent = 'Analyze (1 credit)';
    btn.disabled = false;
  }
}

function buildEditorVisionText(result, vMode) {
  const rule  = '─'.repeat(48);
  const lines = [];

  if (vMode === 'build_prompt') {
    const dt = result.designTokens || {};
    lines.push(`BUILD PROMPT — ${result.pagePattern || 'Capture'}`);
    lines.push(rule);
    if ((dt.colors || []).length) {
      lines.push('\nColors');
      (dt.colors || []).forEach(c => lines.push(`  ${c.value}  ${c.role}`));
    }
    if ((dt.typography || []).length) {
      lines.push('\nTypography');
      (dt.typography || []).forEach(t => lines.push(`  ${t.family} ${t.weight}/${t.size}  — ${t.role}`));
    }
    if ((dt.spacing || []).length) lines.push(`\nSpacing  ${dt.spacing.join(' · ')}`);
    lines.push('\n' + rule + '\nCOMPONENTS\n');
    (result.components || []).forEach((c, i) => {
      lines.push(`${i + 1}. ${c.name}`);
      if (c.keyStyles)   lines.push(`   ${c.keyStyles}`);
      if (c.description) lines.push(`   ${c.description}`);
    });
    if (result.implementationPrompt) {
      lines.push('\n' + rule + '\nIMPLEMENTATION PROMPT\n');
      lines.push(result.implementationPrompt);
      lines.push('\nStack: React 18 · Tailwind CSS · shadcn/ui');
    }
  }

  return lines.join('\n');
}

// Wire up analysis panel after DOM is ready
document.addEventListener('DOMContentLoaded', setupAnalysisPanel);
// Fallback if DOMContentLoaded already fired
if (document.readyState !== 'loading') setupAnalysisPanel();
