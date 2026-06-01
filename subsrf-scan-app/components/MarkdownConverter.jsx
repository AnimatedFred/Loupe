'use client';

import { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';

/* ── Shared style constants (inline styles can't read CSS vars via fontFamily) ── */
const MONO = "'Azeret Mono', monospace";
const BODY = "'Manrope', sans-serif";
const VOID = '#050508';
const DEEP = '#08080E';
const LAYER = '#0E0E18';
const SURFACE = '#141420';
const NEON = '#00FF87';
const NEON_DIM = 'rgba(0,255,135,0.12)';
const NEON_GLOW = 'rgba(0,255,135,0.06)';
const T1 = '#F2F2F4';
const T2 = 'rgba(242,242,244,0.55)';
const T3 = 'rgba(242,242,244,0.28)';
const BORDER = 'rgba(255,255,255,0.12)';
const STATUS_OK = '#39D98A';

export default function MarkdownConverter() {
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [markdown, setMarkdown] = useState('');
  const [error, setError] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [activeFile, setActiveFile] = useState(null);
  const { session } = useUser() || {};

  /* ── Load Material Symbols font on mount ───────────────── */
  useEffect(() => {
    if (!document.getElementById('material-symbols-link')) {
      const link = document.createElement('link');
      link.id = 'material-symbols-link';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap';
      document.head.appendChild(link);
    }
  }, []);

  /* ── Extension payload listener ────────────────────────── */
  useEffect(() => {
    const handlePayload = () => {
      const extPayload = sessionStorage.getItem('subsrf_ext_markdown_payload');
      const extPayloadName = sessionStorage.getItem('subsrf_ext_markdown_payload_name');
      if (extPayload) {
        if (!session?.access_token) {
          // Wait for session to load before processing
          return;
        }
        sessionStorage.removeItem('subsrf_ext_markdown_payload');
        sessionStorage.removeItem('subsrf_ext_markdown_payload_name');
        if (extPayloadName) setActiveFile(extPayloadName);
        processFile(null, extPayload, extPayloadName);
      }
    };
    handlePayload();
    window.addEventListener('subsrf_payload_injected', handlePayload);
    return () => window.removeEventListener('subsrf_payload_injected', handlePayload);
  }, [session?.access_token]);

  async function processFile(file, extPayload = null, payloadName = null) {
    if (!session?.access_token) { setError('Please sign in to generate Markdown.'); return; }
    
    // Set preview image if it's an image
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreviewImage(e.target.result);
      reader.readAsDataURL(file);
    } else if (extPayload) {
      setPreviewImage(extPayload);
    } else {
      setPreviewImage(null);
    }

    setLoading(true);
    setError(null);
    setMarkdown('');
    
    try {
      const formData = new FormData();
      if (file) {
        formData.append('file', file);
      } else if (extPayload) {
        // Handle extension payload (base64 string)
        const mimeMatch = extPayload.match(/^data:(.*?);base64,/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
        const b64Data = extPayload.includes(',') ? extPayload.split(',')[1] : extPayload;
        
        // Convert base64 to Blob to send as file
        const byteCharacters = atob(b64Data);
        const byteArrays = [];
        for (let offset = 0; offset < byteCharacters.length; offset += 512) {
          const slice = byteCharacters.slice(offset, offset + 512);
          const byteNumbers = new Array(slice.length);
          for (let i = 0; i < slice.length; i++) byteNumbers[i] = slice.charCodeAt(i);
          byteArrays.push(new Uint8Array(byteNumbers));
        }
        const blob = new Blob(byteArrays, { type: mimeType });
        formData.append('file', blob, payloadName || activeFile || 'extension-upload');
      }

      const res = await fetch('/api/markdown', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        // Do NOT set Content-Type header. The browser will automatically set it to multipart/form-data with the correct boundary
        body: formData,
      });
      
      // Check for raw HTML error pages (like Vercel 413 Payload Too Large)
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        if (res.status === 413) throw new Error('File is too large to upload (Vercel limit is 4.5MB).');
        throw new Error(`Server returned HTML error: ${res.status} ${res.statusText}`);
      }
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate markdown');
      setMarkdown(data.markdown);
    } catch (err) { 
      setError(err.message); 
    } finally { 
      setLoading(false); 
    }
  }

  function handleFile(file) {
    if (!file) { setError('Please upload a valid file.'); return; }
    setActiveFile(file.name);
    processFile(file, null);
  }

  function onDragOver(e) { e.preventDefault(); e.stopPropagation(); setDragActive(true); }
  function onDragLeave(e) { e.preventDefault(); e.stopPropagation(); setDragActive(false); }
  function onDrop(e) {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  }

  const handleCopy = () => { if (markdown) navigator.clipboard.writeText(markdown); };
  const handleExport = () => {
    if (!markdown) return;
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = (activeFile ? activeFile.split('.')[0] : 'export') + '.md';
    a.click(); URL.revokeObjectURL(url);
  };

  /* ── Derived values ──────────────────────────────────── */
  const lines = markdown ? markdown.split('\n') : [];
  const lineCount = Math.max(15, lines.length);
  const baselineTokens = markdown ? Math.round(markdown.length / 4).toLocaleString() : '0';
  const mdTokens       = markdown ? Math.round(markdown.length / 5).toLocaleString() : '0';
  const creditsSaved   = markdown ? '$' + (markdown.length / 1000).toFixed(2) : '$0.00';

  /* ── Syntax-highlighted line renderer ────────────────── */
  const renderLine = (line, i) => {
    const t = line.trimStart();
    if (t.startsWith('### '))
      return <p key={i} style={{ color: NEON, borderLeft: `2px solid ${NEON}`, paddingLeft: 16, paddingTop: 4, paddingBottom: 4, background: NEON_DIM, marginBottom: 8 }}>{line}</p>;
    if (t.startsWith('## '))
      return <p key={i} style={{ color: NEON, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 3, marginBottom: 8 }}>{line}</p>;
    if (t.startsWith('# '))
      return <p key={i} style={{ color: NEON, marginBottom: 16 }}>{line}</p>;
    if (t.startsWith('>') || (t.startsWith('"') && t.endsWith('"')))
      return <p key={i} style={{ color: T2, fontStyle: 'italic', marginBottom: 16 }}>{line}</p>;
    return <p key={i} style={{ minHeight: '1.8em' }}>{line || '\u00A0'}</p>;
  };

  /* ════════════════════════════  JSX  ═══════════════════ */
  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', width: '100%', backgroundColor: VOID, position: 'relative', zIndex: 10 }}>

      {/* ── LEFT: IDE PREVIEW AREA ───────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, backgroundColor: VOID, borderRight: `1px solid ${BORDER}` }}>

        {/* Status Banner */}
        <div style={{ backgroundColor: 'rgba(24,34,26,0.5)', borderBottom: `1px solid rgba(57,217,138,0.2)`, padding: '4px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ height: 6, width: 6, backgroundColor: STATUS_OK, borderRadius: '50%', boxShadow: '0 0 8px rgba(57,217,138,0.5)', display: 'inline-block' }} />
            <span style={{ fontFamily: MONO, fontSize: 11, color: T1, letterSpacing: '-0.025em' }}>
              Active: <span style={{ color: NEON }}>{activeFile || 'None'}</span>
            </span>
          </div>
          <span style={{ fontFamily: MONO, fontSize: 9, color: T3 }}>
            {loading ? 'PROCESSING...' : (markdown ? 'READY' : 'WAITING')}
          </span>
        </div>

        {/* IDE Body */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: DEEP, overflow: 'hidden' }}>

          {/* Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', backgroundColor: LAYER, borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(255,77,77,0.2)', border: '1px solid rgba(255,77,77,0.4)' }} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(255,171,0,0.2)', border: '1px solid rgba(255,171,0,0.4)' }} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(57,217,138,0.2)', border: '1px solid rgba(57,217,138,0.4)' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ fontFamily: MONO, fontSize: 10, color: T3, textTransform: 'uppercase', letterSpacing: 2 }}>MARKDOWN PREVIEW</span>
              <button onClick={handleCopy} style={{ display: 'flex', alignItems: 'center', gap: 4, color: T2, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: MONO }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>content_copy</span>
                <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2 }}>Copy</span>
              </button>
            </div>
          </div>

          {/* Scrollable markdown content */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex' }} className="custom-scrollbar">
            {/* Line numbers */}
            <div style={{ width: 40, backgroundColor: VOID, borderRight: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', paddingTop: 16, paddingRight: 8, textAlign: 'right', userSelect: 'none', flexShrink: 0 }}>
              {Array.from({ length: lineCount }).map((_, i) => (
                <span key={i} style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(242,242,244,0.1)', lineHeight: '1.8', display: 'block' }}>{i + 1}</span>
              ))}
            </div>
            {/* Text body */}
            <div style={{ flex: 1, padding: 16, fontFamily: MONO, fontSize: 13, lineHeight: '1.8', color: T2 }}>
              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16 }}>
                  <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 2, color: 'rgba(0,255,135,0.7)' }}>● EXTRACTING MARKDOWN...</div>
                  {previewImage && <img src={previewImage} style={{ maxWidth: 300, maxHeight: 300, opacity: 0.2, objectFit: 'contain' }} alt="Preview" />}
                </div>
              ) : error ? (
                <div style={{ color: '#FF4D4D', background: 'rgba(255,77,77,0.08)', padding: 12, border: '1px solid rgba(255,77,77,0.2)', borderRadius: 4 }}>{error}</div>
              ) : !markdown ? (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T3 }}>
                  Select or drop a file to see the markdown output here.
                </div>
              ) : (
                <div>{lines.map(renderLine)}</div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer style={{ backgroundColor: VOID, borderTop: `1px solid ${BORDER}`, width: '100%', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 32px' }}>
          <p style={{ fontFamily: MONO, fontSize: 10, color: T3, letterSpacing: 2, margin: 0 }}>© 2024 SUBSURFACE INFRASTRUCTURE</p>
          <a href="#" style={{ fontFamily: MONO, fontSize: 10, color: NEON, letterSpacing: 2 }}>Security Status</a>
        </footer>
      </div>

      {/* ── RIGHT: WORKSPACE SIDEBAR ─────────────────── */}
      <aside style={{ display: 'flex', flexDirection: 'column', width: 340, backgroundColor: LAYER, borderLeft: `1px solid ${BORDER}`, flexShrink: 0, overflowY: 'auto' }} className="custom-scrollbar">

        {/* Drop Zone */}
        <div style={{ padding: 16 }}>
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => document.getElementById('md-upload').click()}
            className="neon-border-dashed"
            style={{
              width: '100%', padding: '32px 0', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: dragActive ? NEON_DIM : VOID,
              cursor: 'pointer', transition: 'background-color 0.2s',
            }}
          >
            <input
              id="md-upload" type="file"
              accept="image/*,.pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,audio/*,.html,.csv,.json,.xml,.zip"
              style={{ display: 'none' }}
              onChange={(e) => handleFile(e.target.files[0])}
            />
            <span className="material-symbols-outlined" style={{ fontSize: 32, color: NEON, marginBottom: 8 }}>cloud_upload</span>
            <h3 style={{ fontFamily: MONO, fontSize: 12, color: T1, marginBottom: 4, letterSpacing: 2, fontWeight: 400 }}>Drag &amp; Drop file</h3>
            <p style={{ fontFamily: MONO, fontSize: 9, color: T3, textTransform: 'uppercase', textAlign: 'center', padding: '0 16px', margin: 0 }}>PDF, DOCX, HTML, Images</p>
          </div>
        </div>

        {/* Session Analytics */}
        <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontFamily: MONO, fontSize: 10, color: T3, borderBottom: `1px solid ${BORDER}`, paddingBottom: 4, letterSpacing: 2, marginBottom: 4 }}>SESSION ANALYTICS</div>

          {/* Metric 1 – Baseline Tokens */}
          <div style={{ backgroundColor: VOID, padding: 16, border: `1px solid ${BORDER}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <p style={{ fontFamily: MONO, fontSize: 10, color: T2, textTransform: 'uppercase', letterSpacing: 2, margin: 0 }}>Baseline Tokens</p>
              <span className="material-symbols-outlined" style={{ color: T3, fontSize: 18 }}>data_array</span>
            </div>
            <h4 style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700, color: T1, margin: 0 }}>{baselineTokens}</h4>
          </div>

          {/* Metric 2 – Markdown Tokens */}
          <div style={{ backgroundColor: VOID, padding: 16, border: `1px solid ${NEON_DIM}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <p style={{ fontFamily: MONO, fontSize: 10, color: NEON, textTransform: 'uppercase', letterSpacing: 2, margin: 0 }}>Markdown Tokens</p>
              <span className="material-symbols-outlined" style={{ color: NEON, fontSize: 18 }}>terminal</span>
            </div>
            <h4 style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700, color: NEON, margin: 0 }}>{mdTokens}</h4>
          </div>

          {/* Metric 3 – Credits Saved */}
          <div style={{ backgroundColor: VOID, padding: 16, border: `1px solid ${BORDER}`, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, backgroundColor: NEON_GLOW, pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <p style={{ fontFamily: MONO, fontSize: 10, color: T2, textTransform: 'uppercase', letterSpacing: 2, margin: 0 }}>Credits Saved</p>
                <span className="material-symbols-outlined" style={{ color: STATUS_OK, fontSize: 18 }}>payments</span>
              </div>
              <h4 style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700, color: STATUS_OK, margin: 0 }}>{creditsSaved}</h4>
            </div>
          </div>

          {/* Quick Actions – 2-col grid */}
          <div style={{ backgroundColor: '#141E16', border: `1px solid ${BORDER}`, padding: 16 }}>
            <p style={{ fontFamily: MONO, fontSize: 10, color: T3, textTransform: 'uppercase', marginBottom: 16, letterSpacing: 2 }}>Quick Actions</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button
                onClick={handleExport}
                style={{ backgroundColor: SURFACE, padding: 8, border: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', transition: 'border-color 0.2s', fontFamily: MONO }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = NEON}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = BORDER}
              >
                <span className="material-symbols-outlined" style={{ color: T2, display: 'block', marginBottom: 4 }}>download</span>
                <span style={{ fontSize: 9, color: T3 }}>Export MD</span>
              </button>
              <button
                onClick={handleCopy}
                style={{ backgroundColor: SURFACE, padding: 8, border: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', transition: 'border-color 0.2s', fontFamily: MONO }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = NEON}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = BORDER}
              >
                <span className="material-symbols-outlined" style={{ color: T2, display: 'block', marginBottom: 4 }}>share</span>
                <span style={{ fontSize: 9, color: T3 }}>Share Link</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer – CPU / Latency */}
        <div style={{ padding: 16, backgroundColor: VOID, borderTop: `1px solid ${BORDER}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontFamily: MONO, color: T3, textTransform: 'uppercase' }}>
            <span>CPU Load: {loading ? '84%' : '12%'}</span>
            <span>Latency: {loading ? '...' : '44ms'}</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
