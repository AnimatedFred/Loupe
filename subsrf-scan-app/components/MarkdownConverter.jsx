'use client';

import { useState, useEffect, useRef } from 'react';
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

    // Check on mount
    handlePayload();

    // Listen for custom event from extension injection
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
    if (!file) {
      setError('Please upload a valid file.');
      return;
    }
    setActiveFile(file.name);
    const reader = new FileReader();
    reader.onload = (e) => processImage(e.target.result);
    reader.readAsDataURL(file);
  }

  function onDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }

  function onDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }

  function onDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }

  const handleCopy = () => {
    if (markdown) {
      navigator.clipboard.writeText(markdown);
    }
  };

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

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', width: '100%', backgroundColor: '#050508' }}>
      
      {/* CENTER: IDE PREVIEW AREA */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, backgroundColor: '#050508', borderRight: '1px solid rgba(242, 242, 244, 0.12)' }}>
        
        {/* Status Banner */}
        <div style={{ backgroundColor: 'rgba(24, 34, 26, 0.5)', borderBottom: '1px solid rgba(57, 217, 138, 0.2)', padding: '4px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ height: '6px', width: '6px', backgroundColor: '#39D98A', borderRadius: '50%', boxShadow: '0 0 8px rgba(57,217,138,0.5)' }}></span>
            <span style={{ fontFamily: "'Azeret Mono', monospace", fontSize: '11px', color: '#F2F2F4', letterSpacing: '-0.025em' }}>
              Active: <span style={{ color: '#00FF87' }}>{activeFile || 'None'}</span>
            </span>
          </div>
          <span style={{ fontFamily: "'Azeret Mono', monospace", fontSize: '9px', color: 'rgba(242, 242, 244, 0.28)' }}>
            {loading ? 'PROCESSING...' : (markdown ? 'READY' : 'WAITING')}
          </span>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#0C0C12', overflow: 'hidden' }}>
          
          {/* Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', backgroundColor: '#111118', borderBottom: '1px solid rgba(242, 242, 244, 0.12)', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'rgba(255, 77, 77, 0.2)', border: '1px solid rgba(255, 77, 77, 0.4)' }}></div>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'rgba(255, 171, 0, 0.2)', border: '1px solid rgba(255, 171, 0, 0.4)' }}></div>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'rgba(57, 217, 138, 0.2)', border: '1px solid rgba(57, 217, 138, 0.4)' }}></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontFamily: "'Azeret Mono', monospace", fontSize: '10px', color: 'rgba(242, 242, 244, 0.28)', textTransform: 'uppercase', letterSpacing: '2px' }}>MARKDOWN PREVIEW</span>
              <button onClick={handleCopy} style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'rgba(242, 242, 244, 0.55)', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>content_copy</span>
                <span style={{ fontFamily: "'Azeret Mono', monospace", fontSize: '10px', textTransform: 'uppercase', letterSpacing: '2px' }}>Copy</span>
              </button>
            </div>
          </div>

          {/* Markdown Content Area */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex' }} className="custom-scrollbar">
            
            {/* Line Numbers */}
            <div style={{ width: '40px', backgroundColor: '#050508', borderRight: '1px solid rgba(242, 242, 244, 0.12)', display: 'flex', flexDirection: 'column', padding: '16px 8px', textAlign: 'right', userSelect: 'none', flexShrink: 0 }}>
              {Array.from({ length: Math.max(15, (markdown.match(/\n/g) || []).length + 1) }).map((_, i) => (
                <span key={i} style={{ fontFamily: "'Azeret Mono', monospace", fontSize: '11px', color: 'rgba(242, 242, 244, 0.1)' }}>{i + 1}</span>
              ))}
            </div>

            {/* Actual Text */}
            <div style={{ flex: 1, padding: '16px', fontFamily: "'Azeret Mono', monospace", fontSize: '13px', lineHeight: '2', color: 'rgba(242, 242, 244, 0.55)', position: 'relative' }}>
              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px' }}>
                  <div style={{ fontFamily: "'Azeret Mono', monospace", fontSize: '10px', letterSpacing: '2px', color: 'rgba(0, 255, 135, 0.7)' }}>● EXTRACTING MARKDOWN...</div>
                  {previewImage && <img src={previewImage} style={{ maxWidth: '300px', maxHeight: '300px', opacity: 0.2, objectFit: 'contain' }} alt="Preview" />}
                </div>
              ) : error ? (
                <div style={{ color: '#FF4D4D', backgroundColor: 'rgba(255, 77, 77, 0.08)', padding: '12px', border: '1px solid rgba(255, 77, 77, 0.2)', borderRadius: '4px' }}>
                  {error}
                </div>
              ) : !markdown ? (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(242, 242, 244, 0.28)' }}>
                  Select or drop a file to see the markdown output here.
                </div>
              ) : (
                <textarea
                  readOnly
                  value={markdown}
                  style={{
                    width: '100%', height: '100%', backgroundColor: 'transparent', border: 'none', color: '#F2F2F4',
                    fontFamily: "'Azeret Mono', monospace", fontSize: '13px', lineHeight: '2', outline: 'none', resize: 'none'
                  }}
                />
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <footer style={{ backgroundColor: '#050508', borderTop: '1px solid rgba(242, 242, 244, 0.12)', width: '100%', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 32px' }}>
          <p style={{ fontFamily: "'Azeret Mono', monospace", fontSize: '10px', color: 'rgba(242, 242, 244, 0.28)', letterSpacing: '2px' }}>
            © 2024 SUBSURFACE INFRASTRUCTURE
          </p>
          <div style={{ display: 'flex', gap: '16px' }}>
            <a href="#" style={{ fontFamily: "'Azeret Mono', monospace", fontSize: '10px', color: '#00FF87', letterSpacing: '2px', textDecoration: 'none' }}>Security Status</a>
          </div>
        </footer>

      </div>

      {/* RIGHT: WORKSPACE SIDEBAR */}
      <aside style={{ display: 'flex', flexDirection: 'column', width: '340px', backgroundColor: '#111118', borderLeft: '1px solid rgba(242, 242, 244, 0.12)', flexShrink: 0, overflowY: 'auto' }}>
        
        {/* Drop Zone */}
        <div style={{ padding: '16px' }}>
          <div 
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => document.getElementById('sidebar-upload').click()}
            style={{
              width: '100%', padding: '32px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              backgroundColor: dragActive ? 'rgba(0, 255, 135, 0.12)' : '#050508',
              border: `1px dashed ${dragActive ? '#00FF87' : 'rgba(242, 242, 244, 0.12)'}`,
              cursor: 'pointer', transition: 'background-color 0.2s',
              backgroundImage: dragActive ? 'none' : `url("data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' stroke='%2300FF87' stroke-width='1' stroke-dasharray='8%2c 8' stroke-dashoffset='0' stroke-linecap='square'/%3e%3c/svg%3e")`
            }}
          >
            <input 
              id="sidebar-upload" 
              type="file" 
              accept="image/*,.pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,audio/*,.html,.csv,.json,.xml,.zip" 
              style={{ display: 'none' }} 
              onChange={(e) => handleFile(e.target.files[0])} 
            />
            <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#00FF87', marginBottom: '8px', transition: 'transform 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>cloud_upload</span>
            <h3 style={{ fontFamily: "'Azeret Mono', monospace", fontSize: '12px', color: '#F2F2F4', marginBottom: '4px', letterSpacing: '2px' }}>Drag &amp; Drop file</h3>
            <p style={{ fontFamily: "'Azeret Mono', monospace", fontSize: '9px', color: 'rgba(242, 242, 244, 0.28)', textTransform: 'uppercase', textAlign: 'center', padding: '0 16px' }}>PDF, DOCX, HTML, Images</p>
          </div>
        </div>

        {/* Metrics Stacked */}
        <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ fontFamily: "'Azeret Mono', monospace", fontSize: '10px', color: 'rgba(242, 242, 244, 0.28)', borderBottom: '1px solid rgba(242, 242, 244, 0.12)', paddingBottom: '4px', letterSpacing: '2px' }}>SESSION ANALYTICS</div>
          
          {/* Metric 1 */}
          <div style={{ backgroundColor: '#050508', padding: '16px', border: '1px solid rgba(242, 242, 244, 0.12)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <p style={{ fontFamily: "'Azeret Mono', monospace", fontSize: '10px', color: 'rgba(242, 242, 244, 0.55)', textTransform: 'uppercase', letterSpacing: '2px' }}>Baseline Tokens</p>
              <span className="material-symbols-outlined" style={{ color: 'rgba(242, 242, 244, 0.28)', fontSize: '18px' }}>data_array</span>
            </div>
            <h4 style={{ fontFamily: "'Manrope', sans-serif", fontSize: '24px', fontWeight: '700', color: '#F2F2F4', margin: 0 }}>{markdown ? Math.round(markdown.length / 4).toLocaleString() : '0'}</h4>
          </div>

          {/* Metric 2 */}
          <div style={{ backgroundColor: '#050508', padding: '16px', border: '1px solid rgba(0, 255, 135, 0.12)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <p style={{ fontFamily: "'Azeret Mono', monospace", fontSize: '10px', color: '#00FF87', textTransform: 'uppercase', letterSpacing: '2px' }}>Markdown Tokens</p>
              <span className="material-symbols-outlined" style={{ color: '#00FF87', fontSize: '18px' }}>terminal</span>
            </div>
            <h4 style={{ fontFamily: "'Manrope', sans-serif", fontSize: '24px', fontWeight: '700', color: '#00FF87', margin: 0 }}>{markdown ? Math.round(markdown.length / 5).toLocaleString() : '0'}</h4>
          </div>

          {/* Metric 3 */}
          <div style={{ backgroundColor: '#050508', padding: '16px', border: '1px solid rgba(242, 242, 244, 0.12)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0, 255, 135, 0.06)', pointerEvents: 'none' }}></div>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <p style={{ fontFamily: "'Azeret Mono', monospace", fontSize: '10px', color: 'rgba(242, 242, 244, 0.55)', textTransform: 'uppercase', letterSpacing: '2px' }}>Credits Saved</p>
                <span className="material-symbols-outlined" style={{ color: '#39D98A', fontSize: '18px' }}>payments</span>
              </div>
              <h4 style={{ fontFamily: "'Manrope', sans-serif", fontSize: '24px', fontWeight: '700', color: '#39D98A', margin: 0 }}>{markdown ? '$' + (markdown.length / 1000).toFixed(2) : '$0.00'}</h4>
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{ backgroundColor: '#141E16', border: '1px solid rgba(242, 242, 244, 0.12)', padding: '16px' }}>
            <p style={{ fontFamily: "'Azeret Mono', monospace", fontSize: '10px', color: 'rgba(242, 242, 244, 0.28)', textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '2px' }}>Quick Actions</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button onClick={handleExport} style={{ backgroundColor: '#18181F', padding: '8px', border: '1px solid rgba(242, 242, 244, 0.12)', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', transition: 'border-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.borderColor = '#00FF87'} onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(242, 242, 244, 0.12)'}>
                <span className="material-symbols-outlined" style={{ color: 'rgba(242, 242, 244, 0.55)', marginBottom: '4px' }}>download</span>
                <span style={{ fontFamily: "'Azeret Mono', monospace", fontSize: '9px', color: 'rgba(242, 242, 244, 0.28)' }}>Export MD</span>
              </button>
              <button onClick={handleCopy} style={{ backgroundColor: '#18181F', padding: '8px', border: '1px solid rgba(242, 242, 244, 0.12)', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', transition: 'border-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.borderColor = '#00FF87'} onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(242, 242, 244, 0.12)'}>
                <span className="material-symbols-outlined" style={{ color: 'rgba(242, 242, 244, 0.55)', marginBottom: '4px' }}>share</span>
                <span style={{ fontFamily: "'Azeret Mono', monospace", fontSize: '9px', color: 'rgba(242, 242, 244, 0.28)' }}>Share Link</span>
              </button>
            </div>
          </div>

        </div>

        {/* Footer Right */}
        <div style={{ padding: '16px', backgroundColor: '#050508', borderTop: '1px solid rgba(242, 242, 244, 0.12)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontFamily: "'Azeret Mono', monospace", color: 'rgba(242, 242, 244, 0.28)', textTransform: 'uppercase' }}>
            <span>CPU Load: {loading ? '84%' : '12%'}</span>
            <span>Latency: {loading ? '...' : '44ms'}</span>
          </div>
        </div>

      </aside>
    </div>
  );
}
