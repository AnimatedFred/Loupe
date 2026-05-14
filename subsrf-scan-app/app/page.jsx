'use client';

import { useState, useRef } from 'react';
import LoginGate from '../components/LoginGate';
import Nav from '../components/Nav';
import Hero from '../components/Hero';
import TokenExplorer from '../components/TokenExplorer';
import AiAnalysis from '../components/AiAnalysis';
import DiffView from '../components/DiffView';

export default function Home() {
  const [tokens, setTokens] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sourceUrl, setSourceUrl] = useState('');
  const explorerRef = useRef(null);

  const [diffUrl, setDiffUrl] = useState('');
  const [diff, setDiff] = useState(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const [diffError, setDiffError] = useState(null);

  async function handleExtract(url) {
    setLoading(true);
    setError(null);
    setSourceUrl(url);
    setDiff(null);
    setDiffUrl('');

    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, mode: 'both' }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Extraction failed');

      setTokens(data.tokens);
      setTimeout(() => {
        explorerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDiff() {
    if (!diffUrl.trim()) return;
    setDiffLoading(true);
    setDiffError(null);
    setDiff(null);
    try {
      const res = await fetch('/api/diff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urlA: sourceUrl, urlB: diffUrl, mode: 'both' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Diff failed');
      setDiff(data.diff);
    } catch (err) {
      setDiffError(err.message);
    } finally {
      setDiffLoading(false);
    }
  }

  const activeMode = tokens?.hasDark ? 'dark' : 'light';

  return (
    <LoginGate>
    <>
      <Nav />
      <Hero onExtract={handleExtract} loading={loading} error={error} extractedUrl={sourceUrl} tokens={tokens} />
      {tokens && (
        <div ref={explorerRef}>
          <TokenExplorer tokens={tokens} sourceUrl={sourceUrl} />

          {/* Compare bar */}
          {!diff && (
            <div style={{
              borderTop: '1px solid var(--border)', padding: '20px 32px',
              background: 'var(--deep)', display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span style={{ fontFamily: "'Azeret Mono', monospace", fontSize: 10, color: 'var(--t3)', flexShrink: 0 }}>
                Compare with →
              </span>
              <input
                type="text"
                value={diffUrl}
                onChange={e => setDiffUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleDiff()}
                placeholder="another-site.com"
                style={{
                  flex: 1, maxWidth: 360,
                  background: 'var(--layer)', border: '1px solid var(--border)',
                  borderRadius: 6, padding: '8px 12px',
                  fontFamily: "'Azeret Mono', monospace", fontSize: 11,
                  color: 'var(--t1)', outline: 'none',
                }}
              />
              <button
                onClick={handleDiff}
                disabled={diffLoading || !diffUrl.trim()}
                style={{
                  fontFamily: "'Azeret Mono', monospace", fontSize: 10, fontWeight: 600,
                  background: 'var(--neon)', color: 'var(--void)',
                  border: 'none', borderRadius: 6, padding: '8px 16px',
                  opacity: diffLoading || !diffUrl.trim() ? 0.5 : 1,
                  cursor: diffLoading || !diffUrl.trim() ? 'default' : 'pointer',
                }}
              >
                {diffLoading ? '⟳ Comparing…' : 'Diff →'}
              </button>
              {diffError && (
                <span style={{ fontFamily: "'Azeret Mono', monospace", fontSize: 10, color: '#FF4D4D' }}>
                  {diffError}
                </span>
              )}
            </div>
          )}

          {diff && (
            <DiffView diff={diff} urlA={sourceUrl} urlB={diffUrl} onClose={() => setDiff(null)} />
          )}

          <AiAnalysis tokens={tokens?.[activeMode]} mode={activeMode} />
        </div>
      )}
    </>
    </LoginGate>
  );
}
