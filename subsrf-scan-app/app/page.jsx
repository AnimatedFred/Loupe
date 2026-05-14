'use client';

import { useState, useRef } from 'react';
import LoginGate from '../components/LoginGate';
import TokenExplorer from '../components/TokenExplorer';

export default function Home() {
  const [tokens, setTokens] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sourceUrl, setSourceUrl] = useState('');
  const [urlInput, setUrlInput] = useState('');

  async function handleExtract(url) {
    const target = url || urlInput;
    if (!target.trim()) return;
    setLoading(true);
    setError(null);
    setSourceUrl(target.trim());

    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: target.trim(), mode: 'both' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Extraction failed');
      setTokens(data.tokens);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const hostname = (() => {
    try { return new URL(sourceUrl.startsWith('http') ? sourceUrl : 'https://' + sourceUrl).hostname; }
    catch { return sourceUrl; }
  })();

  return (
    <LoginGate>
      <div style={{
        background: '#050508', color: '#F2F2F4',
        fontFamily: "'Manrope', sans-serif",
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        WebkitFontSmoothing: 'antialiased',
        overflow: 'hidden',
      }}>
        {/* ── Top App Bar ──────────────────────────────────────────────────── */}
        <header style={{
          background: '#050508', borderBottom: '1px solid rgba(242,242,244,0.12)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 32px', position: 'sticky', top: 0, zIndex: 50, flexShrink: 0,
        }}>
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <div style={{ width: 16, height: 4, background: '#00FF87', boxShadow: '0 0 12px rgba(0,255,135,0.4)' }} />
            <span style={{
              fontFamily: "'Manrope', sans-serif", fontSize: 32, fontWeight: 700,
              lineHeight: 1.1, letterSpacing: '-0.8px', color: '#F2F2F4',
            }}>Scan.subsrf.dev</span>
            <span style={{
              background: '#2d372e', color: '#00FF87',
              padding: '2px 6px', borderRadius: 2, fontSize: 9,
              fontFamily: "'Azeret Mono', monospace",
              border: '1px solid rgba(0,255,135,0.2)', marginLeft: 8, marginTop: 4,
            }}>BETA</span>
          </div>

          {/* URL Scan Input */}
          <div style={{ flex: 1, maxWidth: 640, margin: '0 48px', display: 'flex' }}>
            <div style={{
              display: 'flex', width: '100%',
              background: '#111118', border: '1px solid rgba(242,242,244,0.12)',
              borderRadius: 2, overflow: 'hidden',
              transition: 'border-color 0.2s',
            }}>
              <div style={{
                padding: '8px 16px', display: 'flex', alignItems: 'center',
                color: 'rgba(242,242,244,0.28)',
                fontFamily: "'Azeret Mono', monospace", fontSize: 13,
                background: '#0C0C12', borderRight: '1px solid rgba(242,242,244,0.12)',
              }}>https://</div>
              <input
                type="text"
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleExtract()}
                placeholder="Enter URL to scan..."
                style={{
                  flex: 1, background: 'transparent', border: 'none',
                  color: '#F2F2F4', fontFamily: "'Azeret Mono', monospace", fontSize: 13,
                  padding: '8px 16px', outline: 'none', lineHeight: 1.8,
                }}
              />
              <button
                onClick={() => handleExtract()}
                disabled={loading || !urlInput.trim()}
                style={{
                  background: '#00FF87', color: '#050508',
                  fontFamily: "'Azeret Mono', monospace", fontSize: 11,
                  letterSpacing: 2, fontWeight: 700, textTransform: 'uppercase',
                  padding: '8px 16px', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8,
                  opacity: loading || !urlInput.trim() ? 0.5 : 1,
                  transition: 'background 0.15s',
                }}
              >
                {loading ? 'Scanning…' : 'Scan'} <span style={{ fontSize: 14 }}>→</span>
              </button>
            </div>
          </div>

          {/* Right actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 32, flexShrink: 0 }}>
            <nav style={{
              display: 'flex', alignItems: 'center', gap: 16,
              fontFamily: "'Azeret Mono', monospace", fontSize: 11, letterSpacing: 2,
            }}>
              <a href="#" style={{ color: 'rgba(242,242,244,0.55)', transition: 'color 0.2s' }}>DOCS</a>
              <a href="#" style={{ color: 'rgba(242,242,244,0.55)', transition: 'color 0.2s' }}>PRICING</a>
            </nav>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#0C0C12', border: '1px solid rgba(242,242,244,0.12)',
              padding: '6px 12px', borderRadius: 2,
            }}>
              <span style={{ color: '#00FF87', fontSize: 16 }}>⚡</span>
              <span style={{ fontFamily: "'Azeret Mono', monospace", fontSize: 12, color: '#F2F2F4' }}>
                294 / 300 <span style={{ color: 'rgba(242,242,244,0.28)' }}>CR</span>
              </span>
            </div>
            <div style={{
              width: 32, height: 32, borderRadius: 2,
              border: '1px solid rgba(242,242,244,0.12)',
              background: '#111118', overflow: 'hidden', opacity: 0.8,
            }} />
          </div>
        </header>

        {/* ── Error bar ──────────────────────────────────────────────────────── */}
        {error && (
          <div style={{
            background: 'rgba(255,77,77,0.08)', borderBottom: '1px solid rgba(255,77,77,0.2)',
            padding: '8px 32px',
            fontFamily: "'Azeret Mono', monospace", fontSize: 11, color: '#FF4D4D',
          }}>{error}</div>
        )}

        {/* ── Main workspace ─────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
          {/* Ambient gradient bg */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
            background: 'linear-gradient(to bottom, #071009, #050508)',
          }} />

          {!tokens ? (
            /* ── Empty state ──────────────────────────────────────────────── */
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              position: 'relative', zIndex: 10,
            }}>
              {/* Grid bg */}
              <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.015,
                backgroundImage: 'linear-gradient(to right, #F2F2F4 1px, transparent 1px), linear-gradient(to bottom, #F2F2F4 1px, transparent 1px)',
                backgroundSize: '32px 32px',
              }} />

              <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 480 }}>
                <div style={{
                  width: 56, height: 56, background: '#111118',
                  border: '1px solid rgba(242,242,244,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 24px', boxShadow: '0 0 40px rgba(0,255,135,0.06)',
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M21 21L16.65 16.65M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z" stroke="#00FF87" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>

                <h2 style={{
                  fontFamily: "'Manrope', sans-serif", fontSize: 32, fontWeight: 700,
                  lineHeight: 1.1, letterSpacing: '-0.8px', marginBottom: 12,
                }}>Ready to scan</h2>

                <p style={{
                  fontFamily: "'Manrope', sans-serif", fontSize: 16, fontWeight: 300,
                  lineHeight: 1.8, color: 'rgba(242,242,244,0.55)', marginBottom: 32,
                }}>
                  Enter a URL above to extract the complete design token set — colors, typography, spacing, shadows, and more.
                </p>

                {loading && (
                  <div style={{
                    fontFamily: "'Azeret Mono', monospace", fontSize: 11,
                    color: '#00FF87', letterSpacing: 2,
                  }}>
                    ● SCANNING {urlInput.toUpperCase()}…
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ── Token dashboard (3-column layout) ────────────────────────── */
            <TokenExplorer tokens={tokens} sourceUrl={sourceUrl} />
          )}
        </div>
      </div>
    </LoginGate>
  );
}
