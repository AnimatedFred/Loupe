'use client';

import { useState } from 'react';

export default function Hero({ onExtract, loading, error, extractedUrl, tokens }) {
  const [url, setUrl] = useState('');

  const totalTokens = tokens?.dark?.meta?.totalTokens || tokens?.light?.meta?.totalTokens || 0;
  const extractionMs = tokens?.dark?.meta?.extractionMs || tokens?.light?.meta?.extractionMs || 0;

  function handleSubmit(e) {
    e.preventDefault();
    if (url.trim()) onExtract(url.trim());
  }

  return (
    <div style={{
      position: 'relative', paddingTop: 52,
      minHeight: 420, display: 'flex', flexDirection: 'column',
      alignItems: 'center', textAlign: 'center', overflow: 'hidden', zIndex: 1,
      padding: '120px 32px 80px',
    }}>
      {/* Background grid */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        backgroundImage: `
          linear-gradient(rgba(0,255,135,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,255,135,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
        WebkitMaskImage: 'radial-gradient(ellipse 80% 100% at 50% 0%, black 0%, transparent 80%)',
        maskImage: 'radial-gradient(ellipse 80% 100% at 50% 0%, black 0%, transparent 80%)',
      }} />

      {/* Glow */}
      <div style={{
        position: 'absolute', top: -100, left: '50%', transform: 'translateX(-50%)',
        width: 700, height: 500, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at center, rgba(0,255,135,0.05) 0%, transparent 65%)',
      }} />

      {/* Eyebrow */}
      <div style={{
        fontFamily: "'Azeret Mono', monospace", fontSize: 10, letterSpacing: 3,
        textTransform: 'uppercase', color: 'var(--neon)', marginBottom: 24,
        position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{ width: 32, height: 1, background: 'linear-gradient(90deg, transparent, var(--neon))' }} />
        Design token extraction
        <span style={{ width: 32, height: 1, background: 'linear-gradient(90deg, var(--neon), transparent)' }} />
      </div>

      {/* Title */}
      <h1 style={{
        fontFamily: "'Manrope', sans-serif", fontSize: 'clamp(40px, 7vw, 80px)',
        fontWeight: 800, lineHeight: 0.95, letterSpacing: '-3px',
        marginBottom: 24, position: 'relative', zIndex: 1,
      }}>
        <span style={{ display: 'block', color: 'var(--t1)' }}>Every design system</span>
        <span style={{ display: 'block', color: 'transparent', WebkitTextStroke: '1px rgba(242,242,244,0.18)' }}>
          is <span style={{ color: 'var(--neon)', WebkitTextFillColor: 'var(--neon)', textShadow: '0 0 60px rgba(0,255,135,0.4)' }}>already there.</span>
        </span>
      </h1>

      {/* Subheading */}
      <p style={{
        fontSize: 17, fontWeight: 300, color: 'var(--t2)', maxWidth: 480,
        lineHeight: 1.75, marginBottom: 48, position: 'relative', zIndex: 1,
      }}>
        Point at any URL. Get the full token set — colors, typography, spacing, shadows, radii — cleaned, named, and exported into any format your stack uses.
      </p>

      {/* URL form */}
      <form onSubmit={handleSubmit} style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 580, marginBottom: 14 }}>
        <div style={{
          display: 'flex', alignItems: 'center',
          background: 'var(--layer)', border: `1px solid ${error ? 'rgba(255,77,77,0.4)' : 'var(--border-md)'}`,
          borderRadius: 10, overflow: 'hidden', transition: 'border-color 0.2s, box-shadow 0.2s',
        }}>
          <span style={{
            fontFamily: "'Azeret Mono', monospace", fontSize: 11,
            color: 'var(--t3)', padding: '0 0 0 18px', whiteSpace: 'nowrap', userSelect: 'none',
          }}>https://</span>

          <input
            type="text"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="stripe.com"
            disabled={loading}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--t1)', fontFamily: "'Azeret Mono', monospace",
              fontSize: 13, padding: '14px 12px',
            }}
          />

          <button
            type="submit"
            disabled={loading || !url.trim()}
            style={{
              background: loading ? 'rgba(0,255,135,0.5)' : 'var(--neon)',
              color: 'var(--void)', border: 'none', padding: '10px 20px', margin: 6,
              borderRadius: 7, fontFamily: "'Azeret Mono', monospace",
              fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
              transition: 'opacity 0.15s', opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Extracting...' : 'Extract tokens →'}
          </button>
        </div>
      </form>

      {error && (
        <div style={{
          fontFamily: "'Azeret Mono', monospace", fontSize: 11, color: '#FF4D4D',
          marginTop: 8, position: 'relative', zIndex: 1,
        }}>
          {error}
        </div>
      )}

      {tokens && !loading && (
        <div style={{
          fontFamily: "'Azeret Mono', monospace", fontSize: 10,
          color: 'var(--t3)', position: 'relative', zIndex: 1,
        }}>
          {extractedUrl} extracted in {(extractionMs / 1000).toFixed(1)}s · {totalTokens} tokens found
        </div>
      )}
    </div>
  );
}
