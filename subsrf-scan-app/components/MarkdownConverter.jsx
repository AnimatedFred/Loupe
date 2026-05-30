'use client';

import { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';

export default function MarkdownConverter() {
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [markdown, setMarkdown] = useState('');
  const [error, setError] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const { session, credits, setCredits } = useUser() || {};

  // Check if extension passed an image via sessionStorage on mount
  useEffect(() => {
    const handlePayload = () => {
      const extPayload = sessionStorage.getItem('subsrf_ext_markdown_payload');
      if (extPayload) {
        sessionStorage.removeItem('subsrf_ext_markdown_payload');
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
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';

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
      
      // If we got back updated credits, ideally we'd update context. 
      // Assuming context exposes a setter or we just trigger a refresh.
      // E.g. if (data.creditsRemaining !== undefined && setCredits) setCredits(data.creditsRemaining);
      
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

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '32px', position: 'relative', zIndex: 10 }}>
      <div style={{ maxWidth: 800, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
        
        {/* Header */}
        <div>
          <h2 style={{
            fontFamily: "'Manrope', sans-serif", fontSize: 24, fontWeight: 700,
            letterSpacing: '-0.5px', color: '#F2F2F4', marginBottom: 8,
          }}>Markdown Converter</h2>
          <p style={{
            fontFamily: "'Manrope', sans-serif", fontSize: 14, color: 'rgba(242,242,244,0.55)',
          }}>Drop an image, screenshot, or document to instantly convert it into perfectly structured Markdown using AI.</p>
        </div>

        {/* Dropzone */}
        {!markdown && !loading && (
          <div 
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => document.getElementById('markdown-upload').click()}
            style={{
              border: dragActive ? '2px dashed #00FF87' : '2px dashed rgba(242,242,244,0.12)',
              background: dragActive ? 'rgba(0,255,135,0.04)' : '#111118',
              borderRadius: 8, padding: '48px 32px', textAlign: 'center',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            <input 
              id="markdown-upload" 
              type="file" 
              accept="image/*,.pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,audio/*,.html,.csv,.json,.xml,.zip" 
              style={{ display: 'none' }} 
              onChange={(e) => handleFile(e.target.files[0])} 
            />
            <div style={{
              width: 48, height: 48, margin: '0 auto 16px', background: 'rgba(242,242,244,0.04)',
              borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={dragActive ? '#00FF87' : 'rgba(242,242,244,0.4)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
            </div>
            <div style={{ fontFamily: "'Azeret Mono', monospace", fontSize: 12, color: dragActive ? '#00FF87' : '#F2F2F4' }}>
              {dragActive ? 'Drop file here' : 'Click or drag file to convert'}
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '64px 0' }}>
            <div style={{
              fontFamily: "'Azeret Mono', monospace", fontSize: 10, letterSpacing: 2,
              textTransform: 'uppercase', color: 'rgba(0,255,135,0.7)', marginBottom: 16,
            }}>
              ● Extracting Markdown...
            </div>
            {previewImage && (
              <img src={previewImage} alt="Preview" style={{ maxWidth: '100%', maxHeight: 200, opacity: 0.5, borderRadius: 4, objectFit: 'contain' }} />
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(255,77,77,0.08)', border: '1px solid rgba(255,77,77,0.2)',
            padding: '12px 16px', borderRadius: 6,
            fontFamily: "'Azeret Mono', monospace", fontSize: 11, color: '#FF4D4D',
          }}>
            {error}
          </div>
        )}

        {/* Result */}
        {markdown && !loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button 
                onClick={() => { setMarkdown(''); setPreviewImage(null); }}
                style={{
                  background: 'transparent', border: '1px solid rgba(242,242,244,0.12)', color: '#F2F2F4',
                  padding: '6px 12px', borderRadius: 4, cursor: 'pointer', fontFamily: "'Azeret Mono', monospace", fontSize: 11,
                }}
              >
                Convert Another
              </button>
              <button 
                onClick={() => navigator.clipboard.writeText(markdown)}
                style={{
                  background: '#00FF87', border: 'none', color: '#050508', fontWeight: 600,
                  padding: '6px 12px', borderRadius: 4, cursor: 'pointer', fontFamily: "'Azeret Mono', monospace", fontSize: 11,
                }}
              >
                Copy Markdown
              </button>
            </div>
            <textarea
              readOnly
              value={markdown}
              style={{
                flex: 1, minHeight: 400, background: '#0C0C12', border: '1px solid rgba(242,242,244,0.12)',
                color: '#F2F2F4', padding: 16, borderRadius: 6, fontFamily: "'Azeret Mono', monospace", fontSize: 12,
                outline: 'none', resize: 'vertical'
              }}
            />
          </div>
        )}

      </div>
    </div>
  );
}
