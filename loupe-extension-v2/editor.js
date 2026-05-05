// Loupe Studio — Precision Vector Engine v8.1
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
  
    console.log('[Loupe Studio] Initializing...');
    const data = await chrome.storage.local.get(['lastCapture', 'lastCaptureRect', 'lastCaptureViewportWidth']);
    console.log('[Loupe Studio] Storage retrieved. Capture size:', data.lastCapture ? data.lastCapture.length : 0);

    if (data.lastCapture) {
      img.src = data.lastCapture;
      img.onload = () => {
        console.log('[Loupe Studio] Image loaded successfully:', img.width, 'x', img.height);

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
        requestAnimationFrame(drawLoop);
      };
      img.onerror = (e) => {
        console.error('[Loupe Studio] Image failed to load:', e);
        showToast('Error: Capture corrupted');
      };
    } else {
      console.warn('[Loupe Studio] No capture found in storage.');
      showToast('No capture data found.');
    }
    
    setupEventListeners();
    refreshLayers(); // Initial sidebar refresh
    console.log('[Loupe Studio] Init complete.');
  } catch (err) {
    console.error('[Loupe Studio] Critical Init Error:', err);
  }
};

function setupEventListeners() {
  const tools = ['select', 'rect', 'circle', 'star', 'arrow', 'text', 'emoji'];
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
    if (selectedIndex !== -1) {
      const action = getHandleAt(pos, objects[selectedIndex]);
      if (action !== 'none') {
        dragAction = action; originalRect = { ...objects[selectedIndex] };
        return;
      }
    }
    const hitIndex = getObjectAt(pos);
    selectedIndex = hitIndex;
    if (hitIndex !== -1) {
      dragAction = 'move'; originalRect = { ...objects[selectedIndex] };
      document.getElementById('color-picker').value = objects[selectedIndex].color;
      document.getElementById('btn-fill').classList.toggle('active', objects[selectedIndex].fill);
    }
    refreshLayers();
  } else {
    if (currentTool === 'text') { showTextOverlay(pos); return; }
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
    currentObject.w = pos.x - currentObject.x;
    currentObject.h = pos.y - currentObject.y;
  } else if (dragAction === 'move' && selectedIndex !== -1) {
    objects[selectedIndex].x = originalRect.x + dx;
    objects[selectedIndex].y = originalRect.y + dy;
  } else if (dragAction === 'resize' && selectedIndex !== -1) {
    objects[selectedIndex].w = Math.max(10, originalRect.w + dx);
    objects[selectedIndex].h = Math.max(10, originalRect.h + dy);
  } else if (dragAction === 'rotate' && selectedIndex !== -1) {
    const obj = objects[selectedIndex];
    obj.angle = Math.atan2(pos.y - (obj.y + obj.h/2), pos.x - (obj.x + obj.w/2));
  }
  lastMousePos = pos;
}

function handleMouseUp() {
  if (dragAction === 'create' && currentObject) {
    if (currentObject.w < 0) { currentObject.x += currentObject.w; currentObject.w = Math.abs(currentObject.w); }
    if (currentObject.h < 0) { currentObject.y += currentObject.h; currentObject.h = Math.abs(currentObject.h); }
    objects.push(currentObject);
    selectedIndex = objects.length - 1;
    setTool('select');
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
  [...objects].reverse().forEach((obj, revIndex) => {
    const index = objects.indexOf(obj);
    const item = document.createElement('div');
    item.className = `layer-item ${index === selectedIndex ? 'active' : ''}`;
    
    const info = document.createElement('div');
    info.className = 'layer-info';
    info.innerHTML = `
      <div class="layer-thumb" style="background: ${obj.color}; border: ${obj.fill ? 'none' : '1px solid #fff'}"></div>
      <div class="layer-name">${obj.type.toUpperCase()}</div>
    `;
    
    const actions = document.createElement('div');
    actions.className = 'layer-actions';
    const delBtn = document.createElement('button');
    delBtn.className = 'layer-btn';
    delBtn.innerHTML = '✕';
    delBtn.addEventListener('mousedown', (e) => {
      console.log('[Loupe Studio] Delete button mousedown for ID:', obj.id);
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
    };
    list.appendChild(item);
  });
}

function handleLayerDeleteById(id) {
  console.log('[Loupe Studio] Deleting layer by ID:', id);
  const idx = objects.findIndex(o => o.id === id);
  if (idx !== -1) {
    objects.splice(idx, 1);
    selectedIndex = -1;
    refreshLayers();
    showToast('Layer deleted');
  } else {
    console.warn('[Loupe Studio] Delete failed: ID not found', id);
  }
}

window.handleLayerDelete = (e, index) => {
  if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
  if (objects[index]) handleLayerDeleteById(objects[index].id);
};

function showToast(msg) {
  const toast = document.getElementById('toast-notification');
  const msgEl = document.getElementById('toast-message');
  if (!toast || !msgEl) return;
  msgEl.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

window.addEventListener('keydown', (e) => {
  if ((e.key === 'Delete' || e.key === 'Backspace') && document.activeElement.tagName !== 'INPUT') {
    if (selectedIndex !== -1) window.handleLayerDelete(e, selectedIndex);
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

async function download() {
  const final = document.createElement('canvas');
  final.width = mainCanvas.width; final.height = mainCanvas.height;
  const ctx = final.getContext('2d'); ctx.drawImage(mainCanvas, 0, 0);
  objects.forEach(obj => drawObject(ctx, obj, false));
  const link = document.createElement('a');
  link.download = `loupe-studio-${Date.now()}.png`; link.href = final.toDataURL('image/png'); link.click();
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
