'use client';

import { useState, useEffect } from 'react';
import LoginGate from '../components/LoginGate';
import TokenExplorer from '../components/TokenExplorer';

import { useUser } from '../context/UserContext';

export default function Home() {
  const [tokens, setTokens] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sourceUrl, setSourceUrl] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [projectSlug, setProjectSlug] = useState(null);
  const [savedProjects, setSavedProjects] = useState([]);
  const [loadingProject, setLoadingProject] = useState(null);
  const { user, session, signOut, credits, tier } = useUser() || {};

  useEffect(() => {
    if (!session?.access_token) return;
    fetch('/api/project', {
      headers: { 'Authorization': `Bearer ${session.access_token}` },
    })
      .then(r => r.json())
      .then(d => { if (d.projects) setSavedProjects(d.projects); })
      .catch(() => {});
  }, [session?.access_token]);

  async function handleLoadProject(slug) {
    if (!session?.access_token) return;
    setLoadingProject(slug);
    try {
      const res = await fetch(`/api/project/${slug}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTokens(data.tokens);
      setSourceUrl(data.source_url);
      setProjectSlug(data.slug);
    } catch {
      setError('Failed to load project');
    } finally {
      setLoadingProject(null);
    }
  }

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
      setProjectSlug(null);

      // Auto-save project (fire-and-forget)
      if (session?.access_token) {
        fetch('/api/project', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
          body: JSON.stringify({ sourceUrl: target.trim(), tokens: data.tokens }),
        }).then(r => r.json()).then(d => {
          if (d.slug) {
            setProjectSlug(d.slug);
            setSavedProjects(prev => {
              const filtered = prev.filter(p => p.slug !== d.slug);
              return [{ slug: d.slug, source_url: target.trim(), updated_at: new Date().toISOString() }, ...filtered];
            });
          }
        }).catch(() => {});
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <img
              src="/subsrf-icon.png"
              width={28} height={28}
              alt="Subsrf"
              style={{ borderRadius: 6, display: 'block', flexShrink: 0 }}
            />
            <span style={{
              fontFamily: "'Azeret Mono', monospace", fontSize: 18, fontWeight: 700,
              letterSpacing: '-0.02em', color: '#F2F2F4',
            }}>subsrf</span>
            <span style={{
              fontFamily: "'Azeret Mono', monospace", fontSize: 9,
              color: '#00FF87', letterSpacing: 1.5,
              background: 'rgba(0,255,135,0.10)', border: '1px solid rgba(0,255,135,0.2)',
              borderRadius: 3, padding: '2px 6px',
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

          {/* Right: credits + avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#0C0C12', border: '1px solid rgba(242,242,244,0.12)',
              padding: '6px 12px', borderRadius: 2,
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="#00FF87" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                <path d="M13 2L3 14h8l-1 8 11-12h-8l1-8z"/>
              </svg>
              <span style={{ fontFamily: "'Azeret Mono', monospace", fontSize: 12, color: '#F2F2F4' }}>
                {credits ?? '—'} <span style={{ color: 'rgba(242,242,244,0.28)' }}>CR</span>
              </span>
            </div>

            {/* Avatar + dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowUserMenu(v => !v)}
                style={{
                  width: 32, height: 32, borderRadius: 2, padding: 0,
                  border: '1px solid rgba(242,242,244,0.12)',
                  background: '#111118', overflow: 'hidden', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {user?.user_metadata?.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt={user.user_metadata.full_name || 'User'}
                    width={32} height={32}
                    style={{ objectFit: 'cover', display: 'block' }}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span style={{ fontFamily: "'Azeret Mono', monospace", fontSize: 12, color: 'rgba(242,242,244,0.4)' }}>
                    {(user?.email || '?')[0].toUpperCase()}
                  </span>
                )}
              </button>

              {showUserMenu && (
                <div style={{
                  position: 'absolute', top: 40, right: 0,
                  background: '#111118', border: '1px solid rgba(242,242,244,0.12)',
                  borderRadius: 4, padding: 8, minWidth: 200,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                  zIndex: 100,
                }}>
                  <div style={{
                    padding: '8px 12px', borderBottom: '1px solid rgba(242,242,244,0.08)',
                    marginBottom: 8,
                  }}>
                    <div style={{
                      fontFamily: "'Manrope', sans-serif", fontSize: 13, fontWeight: 600,
                      color: '#F2F2F4', marginBottom: 2,
                    }}>
                      {user?.user_metadata?.full_name || 'User'}
                    </div>
                    <div style={{
                      fontFamily: "'Azeret Mono', monospace", fontSize: 10,
                      color: 'rgba(242,242,244,0.4)',
                    }}>
                      {user?.email || ''}
                    </div>
                    <div style={{
                      fontFamily: "'Azeret Mono', monospace", fontSize: 9,
                      color: '#00FF87', textTransform: 'uppercase', letterSpacing: 1, marginTop: 6,
                    }}>
                      {tier || 'free'} plan
                    </div>
                  </div>
                  <button
                    onClick={() => { setShowUserMenu(false); signOut?.(); }}
                    style={{
                      width: '100%', padding: '8px 12px',
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      fontFamily: "'Azeret Mono', monospace", fontSize: 11,
                      color: 'rgba(242,242,244,0.55)', textAlign: 'left',
                      borderRadius: 3, transition: 'background 0.15s, color 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(242,242,244,0.06)'; e.currentTarget.style.color = '#F2F2F4'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(242,242,244,0.55)'; }}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
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
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative', minHeight: 0 }}>
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

              <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 560 }}>
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

                {!loading && savedProjects.length > 0 && (
                  <div style={{ marginTop: 48, textAlign: 'left' }}>
                    <div style={{
                      fontFamily: "'Azeret Mono', monospace", fontSize: 9, letterSpacing: 2,
                      textTransform: 'uppercase', color: 'rgba(242,242,244,0.28)', marginBottom: 12,
                    }}>
                      Recent scans
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {savedProjects.map(p => {
                        let hostname = p.source_url;
                        try { hostname = new URL(p.source_url.startsWith('http') ? p.source_url : 'https://' + p.source_url).hostname; } catch {}
                        const isLoading = loadingProject === p.slug;
                        const ago = (() => {
                          const diff = Date.now() - new Date(p.updated_at).getTime();
                          const m = Math.floor(diff / 60000);
                          if (m < 1) return 'just now';
                          if (m < 60) return `${m}m ago`;
                          const h = Math.floor(m / 60);
                          if (h < 24) return `${h}h ago`;
                          return `${Math.floor(h / 24)}d ago`;
                        })();
                        return (
                          <button
                            key={p.slug}
                            onClick={() => handleLoadProject(p.slug)}
                            disabled={!!loadingProject}
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              padding: '10px 14px', borderRadius: 4, cursor: 'pointer',
                              background: '#111118', border: '1px solid rgba(242,242,244,0.08)',
                              transition: 'border-color 0.15s, background 0.15s',
                              opacity: loadingProject && !isLoading ? 0.4 : 1,
                              width: '100%', textAlign: 'left',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,255,135,0.3)'; e.currentTarget.style.background = 'rgba(0,255,135,0.04)'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(242,242,244,0.08)'; e.currentTarget.style.background = '#111118'; }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{
                                width: 8, height: 8, borderRadius: '50%',
                                background: isLoading ? '#00FF87' : 'rgba(0,255,135,0.4)', flexShrink: 0,
                                boxShadow: isLoading ? '0 0 8px rgba(0,255,135,0.8)' : 'none',
                              }} />
                              <span style={{
                                fontFamily: "'Azeret Mono', monospace", fontSize: 12, color: '#F2F2F4',
                              }}>
                                {isLoading ? 'Loading…' : hostname}
                              </span>
                            </div>
                            <span style={{
                              fontFamily: "'Azeret Mono', monospace", fontSize: 9,
                              color: 'rgba(242,242,244,0.28)',
                            }}>
                              {ago}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ── Token dashboard (3-column layout) ────────────────────────── */
            <TokenExplorer
              tokens={tokens}
              sourceUrl={sourceUrl}
              projectSlug={projectSlug}
              onSaveCuratedTokens={(curated) => {
                if (!projectSlug || !session?.access_token) return;
                fetch(`/api/project/${projectSlug}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                  body: JSON.stringify({ curatedTokens: curated }),
                }).catch(() => {});
              }}
            />
          )}
        </div>
      </div>
    </LoginGate>
  );
}
