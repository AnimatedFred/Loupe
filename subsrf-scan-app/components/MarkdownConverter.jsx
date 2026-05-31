'use client';

import { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';

export default function MarkdownConverter() {
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [markdown, setMarkdown] = useState('');
  const [error, setError] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [activeFile, setActiveFile] = useState(null);
  const { session, credits, setCredits } = useUser() || {};

  // Check if extension passed an image via sessionStorage on mount
  useEffect(() => {
    const handlePayload = () => {
      const extPayload = sessionStorage.getItem('subsrf_ext_markdown_payload');
      const extPayloadName = sessionStorage.getItem('subsrf_ext_markdown_payload_name');
      if (extPayload) {
        sessionStorage.removeItem('subsrf_ext_markdown_payload');
        sessionStorage.removeItem('subsrf_ext_markdown_payload_name');
        if (extPayloadName) setActiveFile(extPayloadName);
        processImage(extPayload);
      }
    };
    handlePayload();
    window.addEventListener('subsrf_payload_injected', handlePayload);
    return () => window.removeEventListener('subsrf_payload_injected', handlePayload);
  }, [session?.access_token]);

  async function processImage(base64Data) {
    if (!session?.access_token) {
      setError('Please sign in to generate Markdown.');
      return;
    }
    setLoading(true);
    setError(null);
    setPreviewImage(base64Data);
    try {
      const mimeMatch = base64Data.match(/^data:(.*?);base64,/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
      const res = await fetch('/api/markdown', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ imageBase64: base64Data, mimeType }),
      });
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
    const reader = new FileReader();
    reader.onload = (e) => processImage(e.target.result);
    reader.readAsDataURL(file);
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
    const a = document.createElement('a');
    a.href = url;
    a.download = (activeFile ? activeFile.split('.')[0] : 'export') + '.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ── Derived values ──────────────────────────────────────── */
  const lines = markdown ? markdown.split('\n') : [];
  const lineCount = Math.max(15, lines.length);
  const baselineTokens = markdown ? Math.round(markdown.length / 4).toLocaleString() : '0';
  const mdTokens       = markdown ? Math.round(markdown.length / 5).toLocaleString() : '0';
  const creditsSaved   = markdown ? '$' + (markdown.length / 1000).toFixed(2) : '$0.00';

  /* ── Render a single markdown line with syntax colouring ── */
  const renderLine = (line, i) => {
    const trimmed = line.trimStart();
    // ### heading – neon with left accent bar + dim bg
    if (trimmed.startsWith('### ')) {
      return (
        <p key={i} style={{ color: '#00FF87', borderLeft: '2px solid #00FF87', paddingLeft: 16, paddingTop: 4, paddingBottom: 4, background: 'rgba(0,255,135,0.12)', marginBottom: 8 }}>
          {line}
        </p>
      );
    }
    // ## heading – neon, bold, uppercase, wide tracking
    if (trimmed.startsWith('## ')) {
      return (
        <p key={i} style={{ color: '#00FF87', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '3px', marginBottom: 8 }}>
          {line}
        </p>
      );
    }
    // # heading – neon
    if (trimmed.startsWith('# ')) {
      return <p key={i} style={{ color: '#00FF87', marginBottom: 16 }}>{line}</p>;
    }
    // > blockquote – italic, muted
    if (trimmed.startsWith('>') || (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
      return <p key={i} style={{ color: 'rgba(242,242,244,0.55)', fontStyle: 'italic', marginBottom: 16 }}>{line}</p>;
    }
    // default
    return <p key={i} style={{ minHeight: '1.8em' }}>{line || '\u00A0'}</p>;
  };

  /* ══════════════════════════════════════════════════════════ */
  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', width: '100%', backgroundColor: 'var(--void)' }}>

      {/* ── CENTER: IDE PREVIEW AREA ──────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, backgroundColor: 'var(--void)', borderRight: '1px solid var(--border-md)' }}>

        {/* Status Banner */}
        <div style={{
          backgroundColor: 'rgba(24,34,26,0.5)', borderBottom: '1px solid rgba(57,217,138,0.2)',
          padding: '4px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ height: 6, width: 6, backgroundColor: '#39D98A', borderRadius: '50%', boxShadow: '0 0 8px rgba(57,217,138,0.5)', display: 'inline-block' }} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--t1)', letterSpacing: '-0.025em' }}>
              Active: <span style={{ color: 'var(--neon)' }}>{activeFile || 'None'}</span>
            </span>
          </div>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t3)' }}>
            {loading ? 'PROCESSING...' : (markdown ? 'READY' : 'WAITING')}
          </span>
        </div>

        {/* IDE body */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--deep)', overflow: 'hidden' }}>

          {/* Toolbar (traffic lights + label + copy) */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 16px', backgroundColor: 'var(--layer)', borderBottom: '1px solid var(--border-md)', flexShrink: 0,
          }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(255,77,77,0.2)', border: '1px solid rgba(255,77,77,0.4)' }} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(255,171,0,0.2)', border: '1px solid rgba(255,171,0,0.4)' }} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(57,217,138,0.2)', border: '1px solid rgba(57,217,138,0.4)' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: 2 }}>MARKDOWN PREVIEW</span>
              <button onClick={handleCopy} style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--t2)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>content_copy</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 2 }}>Copy</span>
              </button>
            </div>
          </div>

          {/* Scrollable markdown content */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex' }} className="custom-scrollbar">

            {/* Line numbers */}
            <div style={{
              width: 40, backgroundColor: 'var(--void)', borderRight: '1px solid var(--border-md)',
              display: 'flex', flexDirection: 'column', paddingTop: 16, paddingRight: 8, textAlign: 'right',
              userSelect: 'none', flexShrink: 0,
            }}>
              {Array.from({ length: lineCount }).map((_, i) => (
                <span key={i} style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'rgba(242,242,244,0.1)', lineHeight: '1.8', display: 'block' }}>{i + 1}</span>
              ))}
            </div>

            {/* Text body */}
            <div style={{ flex: 1, padding: 16, fontFamily: 'var(--mono)', fontSize: 13, lineHeight: '1.8', color: 'var(--t2)', position: 'relative' }}>
              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16 }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 2, color: 'rgba(0,255,135,0.7)' }}>● EXTRACTING MARKDOWN...</div>
                  {previewImage && <img src={previewImage} style={{ maxWidth: 300, maxHeight: 300, opacity: 0.2, objectFit: 'contain' }} alt="Preview" />}
                </div>
              ) : error ? (
                <div style={{ color: '#FF4D4D', background: 'rgba(255,77,77,0.08)', padding: 12, border: '1px solid rgba(255,77,77,0.2)', borderRadius: 4 }}>
                  {error}
                </div>
              ) : !markdown ? (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t3)' }}>
                  Select or drop a file to see the markdown output here.
                </div>
              ) : (
                <div>{lines.map(renderLine)}</div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer style={{
          backgroundColor: 'var(--void)', borderTop: '1px solid var(--border-md)', width: '100%', flexShrink: 0,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 32px',
        }}>
          <p style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)', letterSpacing: 2 }}>
            © 2024 SUBSURFACE INFRASTRUCTURE
          </p>
          <a href="#" style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--neon)', letterSpacing: 2 }}>Security Status</a>
        </footer>
      </div>

      {/* ── RIGHT: WORKSPACE SIDEBAR ─────────────────────── */}
      <aside style={{
        display: 'flex', flexDirection: 'column', width: 340, backgroundColor: 'var(--layer)',
        borderLeft: '1px solid var(--border-md)', flexShrink: 0, overflowY: 'auto',
      }} className="custom-scrollbar">

        {/* Drop Zone */}
        <div style={{ padding: 16 }}>
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => document.getElementById('md-upload').click()}
            className="neon-border-dashed"
            style={{
              width: '100%', padding: '32px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              backgroundColor: dragActive ? 'rgba(0,255,135,0.12)' : 'var(--void)',
              border: '1px solid var(--border-md)', cursor: 'pointer', transition: 'background-color 0.2s',
            }}
          >
            <input
              id="md-upload"
              type="file"
              accept="image/*,.pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,audio/*,.html,.csv,.json,.xml,.zip"
              style={{ display: 'none' }}
              onChange={(e) => handleFile(e.target.files[0])}
            />
            <span className="material-symbols-outlined" style={{ fontSize: 32, color: 'var(--neon)', marginBottom: 8, transition: 'transform 0.2s' }}>cloud_upload</span>
            <h3 style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--t1)', marginBottom: 4, letterSpacing: 2 }}>Drag &amp; Drop file</h3>
            <p style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t3)', textTransform: 'uppercase', textAlign: 'center', padding: '0 16px' }}>PDF, DOCX, HTML, Images</p>
          </div>
        </div>

        {/* Session Analytics */}
        <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)', borderBottom: '1px solid var(--border-md)', paddingBottom: 4, letterSpacing: 2, marginBottom: 4 }}>SESSION ANALYTICS</div>

          {/* Metric 1 – Baseline Tokens */}
          <div style={{ backgroundColor: 'var(--void)', padding: 16, border: '1px solid var(--border-md)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <p style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: 2, margin: 0 }}>Baseline Tokens</p>
              <span className="material-symbols-outlined" style={{ color: 'var(--t3)', fontSize: 18 }}>data_array</span>
            </div>
            <h4 style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 700, color: 'var(--t1)', margin: 0 }}>{baselineTokens}</h4>
          </div>

          {/* Metric 2 – Markdown Tokens */}
          <div style={{ backgroundColor: 'var(--void)', padding: 16, border: '1px solid var(--neon-dim)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <p style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--neon)', textTransform: 'uppercase', letterSpacing: 2, margin: 0 }}>Markdown Tokens</p>
              <span className="material-symbols-outlined" style={{ color: 'var(--neon)', fontSize: 18 }}>terminal</span>
            </div>
            <h4 style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 700, color: 'var(--neon)', margin: 0 }}>{mdTokens}</h4>
          </div>

          {/* Metric 3 – Credits Saved */}
          <div style={{ backgroundColor: 'var(--void)', padding: 16, border: '1px solid var(--border-md)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, backgroundColor: 'var(--neon-glow)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <p style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: 2, margin: 0 }}>Credits Saved</p>
                <span className="material-symbols-outlined" style={{ color: '#39D98A', fontSize: 18 }}>payments</span>
              </div>
              <h4 style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 700, color: '#39D98A', margin: 0 }}>{creditsSaved}</h4>
            </div>
          </div>

          {/* Quick Actions – 2-col grid */}
          <div style={{ backgroundColor: '#141E16', border: '1px solid var(--border-md)', padding: 16 }}>
            <p style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)', textTransform: 'uppercase', marginBottom: 16, letterSpacing: 2 }}>Quick Actions</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button
                onClick={handleExport}
                style={{ backgroundColor: 'var(--surface)', padding: 8, border: '1px solid var(--border-md)', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', transition: 'border-color 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--neon)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-md)'}
              >
                <span className="material-symbols-outlined" style={{ color: 'var(--t2)', display: 'block', marginBottom: 4 }}>download</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t3)' }}>Export MD</span>
              </button>
              <button
                onClick={handleCopy}
                style={{ backgroundColor: 'var(--surface)', padding: 8, border: '1px solid var(--border-md)', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', transition: 'border-color 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--neon)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-md)'}
              >
                <span className="material-symbols-outlined" style={{ color: 'var(--t2)', display: 'block', marginBottom: 4 }}>share</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t3)' }}>Share Link</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer – CPU / Latency */}
        <div style={{ padding: 16, backgroundColor: 'var(--void)', borderTop: '1px solid var(--border-md)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--t3)', textTransform: 'uppercase' }}>
            <span>CPU Load: {loading ? '84%' : '12%'}</span>
            <span>Latency: {loading ? '...' : '44ms'}</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
