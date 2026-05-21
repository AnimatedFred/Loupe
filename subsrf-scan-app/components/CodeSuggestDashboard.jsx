'use client';

import { useState } from 'react';
import { useUser } from '../context/UserContext';
import GitHubConnect from './GitHubConnect';
import CodeDiff from './CodeDiff';

const CATEGORIES = {
  colors:       { label: 'Colors',         color: '#FF6B6B' },
  typography:   { label: 'Typography',     color: '#FFB020' },
  spacing:      { label: 'Spacing',        color: '#38bdf8' },
  accessibility:{ label: 'Accessibility',  color: '#A855F7' },
  consistency:  { label: 'Consistency',    color: '#00FF87' },
  tokens:       { label: 'Design Tokens',  color: '#F97316' },
  components:   { label: 'Components',     color: '#EC4899' },
};

const SEVERITY = {
  error:      { color: '#FF4D4D', bg: 'rgba(255,77,77,0.09)',   border: 'rgba(255,77,77,0.2)',   label: 'ERROR' },
  warning:    { color: '#FFB020', bg: 'rgba(255,176,32,0.09)',  border: 'rgba(255,176,32,0.2)',  label: 'WARN' },
  suggestion: { color: '#38bdf8', bg: 'rgba(56,189,248,0.09)', border: 'rgba(56,189,248,0.2)',  label: 'SUGGEST' },
  info:       { color: '#38bdf8', bg: 'rgba(56,189,248,0.09)', border: 'rgba(56,189,248,0.2)',  label: 'INFO' },
};

const ANALYZING_STEPS = [
  'Cloning repository tree…',
  'Reading component files…',
  'Reading style sheets…',
  'Building design context…',
  'Generating suggestions…',
];

export default function CodeSuggestDashboard() {
  const { session } = useUser() || {};
  const [repos, setRepos]           = useState([]);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [result, setResult]         = useState(null);
  const [loading, setLoading]       = useState(false);
  const [stepIdx, setStepIdx]       = useState(0);
  const [error, setError]           = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [expanded, setExpanded]     = useState(null);

  async function handleAnalyze() {
    if (!selectedRepo || !session?.access_token) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setExpanded(null);
    setStepIdx(0);
    setActiveCategory('all');

    // Animate the step labels during the (long) API call
    const stepTimer = setInterval(() => {
      setStepIdx(i => Math.min(i + 1, ANALYZING_STEPS.length - 1));
    }, 3500);

    try {
      const res = await fetch('/api/github/suggest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          owner: selectedRepo.owner,
          repo: selectedRepo.name,
          installationId: selectedRepo.installationId,
          branch: selectedRepo.defaultBranch,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      clearInterval(stepTimer);
      setLoading(false);
    }
  }

  const suggestions = result?.suggestions || [];
  const filtered = activeCategory === 'all'
    ? suggestions
    : suggestions.filter(s => s.category === activeCategory);

  const categoryCounts = suggestions.reduce((acc, s) => {
    acc[s.category] = (acc[s.category] || 0) + 1;
    return acc;
  }, {});

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', height: '100%', position: 'relative', zIndex: 1 }}>

      {/* ── Left sidebar ─────────────────────────────────────────────── */}
      <div style={{
        width: 264, flexShrink: 0,
        borderRight: '1px solid rgba(242,242,244,0.07)',
        overflowY: 'auto', padding: '28px 20px',
        display: 'flex', flexDirection: 'column', gap: 28,
      }}>

        {/* Title block */}
        <div>
          <div style={{
            fontFamily: "'Azeret Mono', monospace", fontSize: 8,
            letterSpacing: 2, textTransform: 'uppercase',
            color: 'rgba(242,242,244,0.28)', marginBottom: 6,
          }}>AI Code Review</div>
          <div style={{
            fontFamily: "'Manrope', sans-serif", fontSize: 17, fontWeight: 700,
            color: '#F2F2F4', letterSpacing: '-0.3px', lineHeight: 1.3,
          }}>Design Suggestions</div>
          <div style={{
            fontFamily: "'Manrope', sans-serif", fontSize: 12,
            color: 'rgba(242,242,244,0.35)', marginTop: 6, lineHeight: 1.65,
          }}>
            AI scans your codebase and suggests exact design improvements with code diffs.
          </div>
        </div>

        {/* GitHub connect */}
        <div style={{
          background: '#0E0E18', border: '1px solid rgba(242,242,244,0.07)',
          borderRadius: 6, padding: 14,
        }}>
          <div style={{
            fontFamily: "'Azeret Mono', monospace", fontSize: 8,
            letterSpacing: 2, textTransform: 'uppercase',
            color: 'rgba(242,242,244,0.28)', marginBottom: 12,
          }}>GitHub</div>
          <GitHubConnect onReposLoaded={setRepos} />
        </div>

        {/* Repo picker + analyse button */}
        {repos.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{
              fontFamily: "'Azeret Mono', monospace", fontSize: 8,
              letterSpacing: 2, textTransform: 'uppercase',
              color: 'rgba(242,242,244,0.28)', marginBottom: 2,
            }}>Repository</div>

            <div style={{ position: 'relative' }}>
              <select
                value={selectedRepo?.fullName || ''}
                onChange={e => {
                  const r = repos.find(r => r.fullName === e.target.value);
                  setSelectedRepo(r || null);
                  setResult(null);
                }}
                style={{
                  width: '100%', padding: '8px 32px 8px 12px',
                  borderRadius: 4,
                  background: '#141420', border: '1px solid rgba(242,242,244,0.07)',
                  color: selectedRepo ? '#F2F2F4' : 'rgba(242,242,244,0.3)',
                  fontFamily: "'Azeret Mono', monospace", fontSize: 11,
                  cursor: 'pointer', outline: 'none', appearance: 'none',
                }}
              >
                <option value="">Select repository…</option>
                {repos.map(r => (
                  <option key={r.fullName} value={r.fullName}>{r.fullName}</option>
                ))}
              </select>
              <svg style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                pointerEvents: 'none',
              }} width="10" height="6" viewBox="0 0 10 6" fill="none">
                <path d="M1 1l4 4 4-4" stroke="rgba(242,242,244,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            {selectedRepo && (
              <button
                onClick={handleAnalyze}
                disabled={loading}
                style={{
                  width: '100%', padding: '10px 0',
                  borderRadius: 4, border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  background: loading ? 'rgba(242,242,244,0.05)' : '#00FF87',
                  color: loading ? 'rgba(242,242,244,0.35)' : '#050508',
                  fontFamily: "'Azeret Mono', monospace", fontSize: 10,
                  fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'background 0.15s',
                }}
              >
                {loading ? (
                  <>
                    <Spinner />
                    Analyzing…
                  </>
                ) : 'Analyze Codebase →'}
              </button>
            )}
          </div>
        )}

        {/* Category filter */}
        {result && suggestions.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{
              fontFamily: "'Azeret Mono', monospace", fontSize: 8,
              letterSpacing: 2, textTransform: 'uppercase',
              color: 'rgba(242,242,244,0.28)', marginBottom: 2,
            }}>Filter</div>

            <FilterPill
              label="All suggestions"
              count={suggestions.length}
              color="rgba(242,242,244,0.45)"
              active={activeCategory === 'all'}
              onClick={() => setActiveCategory('all')}
            />
            {Object.entries(categoryCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([cat, count]) => {
                const cfg = CATEGORIES[cat] || { label: cat, color: 'rgba(242,242,244,0.4)' };
                return (
                  <FilterPill
                    key={cat}
                    label={cfg.label}
                    count={count}
                    color={cfg.color}
                    active={activeCategory === cat}
                    onClick={() => setActiveCategory(cat)}
                  />
                );
              })}
          </div>
        )}

        {/* Stats */}
        {result && (
          <div style={{
            background: '#0E0E18', border: '1px solid rgba(242,242,244,0.07)',
            borderRadius: 6, padding: 14,
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            <div style={{
              fontFamily: "'Azeret Mono', monospace", fontSize: 8,
              letterSpacing: 2, textTransform: 'uppercase',
              color: 'rgba(242,242,244,0.28)',
            }}>Analysis</div>
            <StatRow label="Files read" value={result.filesAnalyzed} />
            <StatRow label="Suggestions" value={suggestions.length} highlight />
            <StatRow label="Repo" value={result.repoName} small />
          </div>
        )}
      </div>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>

        {/* Loading */}
        {loading && (
          <LoadingState repo={selectedRepo?.fullName} stepLabel={ANALYZING_STEPS[stepIdx]} />
        )}

        {/* Error */}
        {!loading && error && (
          <div style={{
            padding: '12px 16px', borderRadius: 4, maxWidth: 560,
            background: 'rgba(255,77,77,0.08)', border: '1px solid rgba(255,77,77,0.2)',
            fontFamily: "'Azeret Mono', monospace", fontSize: 11, color: '#FF4D4D',
          }}>
            {error}
          </div>
        )}

        {/* Empty / welcome */}
        {!loading && !result && !error && (
          <EmptyState />
        )}

        {/* Results */}
        {!loading && result && (
          <>
            {/* Summary row */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 20,
            }}>
              <div>
                <div style={{
                  fontFamily: "'Manrope', sans-serif", fontSize: 20, fontWeight: 700,
                  color: '#F2F2F4', letterSpacing: '-0.4px',
                }}>
                  {suggestions.length === 0
                    ? 'No issues found'
                    : `${suggestions.length} suggestion${suggestions.length !== 1 ? 's' : ''}`}
                </div>
                <div style={{
                  fontFamily: "'Azeret Mono', monospace", fontSize: 9,
                  color: 'rgba(242,242,244,0.28)', marginTop: 4,
                }}>
                  {result.repoName} · {result.filesAnalyzed} files analyzed
                </div>
              </div>

              {suggestions.length > 0 && (
                <div style={{ display: 'flex', gap: 6 }}>
                  {['error', 'warning', 'suggestion'].map(sev => {
                    const count = suggestions.filter(s => s.severity === sev).length;
                    if (!count) return null;
                    const cfg = SEVERITY[sev];
                    return (
                      <div key={sev} style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        padding: '4px 10px', borderRadius: 4,
                        background: cfg.bg, border: `1px solid ${cfg.border}`,
                      }}>
                        <span style={{
                          fontFamily: "'Azeret Mono', monospace", fontSize: 12,
                          fontWeight: 700, color: cfg.color,
                        }}>{count}</span>
                        <span style={{
                          fontFamily: "'Azeret Mono', monospace", fontSize: 8,
                          color: 'rgba(242,242,244,0.28)', letterSpacing: 1, textTransform: 'uppercase',
                        }}>{cfg.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* No results after filter */}
            {filtered.length === 0 && suggestions.length > 0 && (
              <div style={{
                fontFamily: "'Azeret Mono', monospace", fontSize: 11,
                color: 'rgba(242,242,244,0.28)', padding: '40px 0', textAlign: 'center',
              }}>
                No suggestions in this category.
              </div>
            )}

            {/* All clean */}
            {suggestions.length === 0 && (
              <div style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                minHeight: 300, gap: 12,
              }}>
                <div style={{
                  fontFamily: "'Azeret Mono', monospace", fontSize: 9,
                  color: '#00FF87', letterSpacing: 3,
                }}>✓ CLEAN</div>
                <div style={{
                  fontFamily: "'Manrope', sans-serif", fontSize: 20, fontWeight: 700, color: '#F2F2F4',
                }}>No design issues found</div>
                <div style={{
                  fontFamily: "'Manrope', sans-serif", fontSize: 13,
                  color: 'rgba(242,242,244,0.35)',
                }}>
                  {result.filesAnalyzed} files analyzed — design system looks consistent.
                </div>
              </div>
            )}

            {/* Suggestion cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {filtered.map((s, i) => {
                const catCfg  = CATEGORIES[s.category] || { label: s.category, color: 'rgba(242,242,244,0.4)' };
                const sevCfg  = SEVERITY[s.severity]   || SEVERITY.suggestion;
                const isOpen  = expanded === i;

                return (
                  <div key={i} style={{
                    background: '#0A0A12',
                    border: `1px solid ${isOpen ? 'rgba(242,242,244,0.12)' : 'rgba(242,242,244,0.06)'}`,
                    borderRadius: 6, overflow: 'hidden',
                    transition: 'border-color 0.15s',
                  }}>

                    {/* Header */}
                    <button
                      onClick={() => setExpanded(isOpen ? null : i)}
                      style={{
                        width: '100%', padding: '14px 16px',
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
                        transition: 'background 0.12s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(242,242,244,0.02)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      {/* Category accent dot */}
                      <div style={{
                        width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                        background: catCfg.color,
                        boxShadow: `0 0 5px ${catCfg.color}70`,
                      }} />

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap',
                        }}>
                          <span style={{
                            fontFamily: "'Manrope', sans-serif", fontSize: 13, fontWeight: 600,
                            color: '#F2F2F4',
                          }}>
                            {s.title}
                          </span>
                          <span style={{
                            fontFamily: "'Azeret Mono', monospace", fontSize: 8,
                            color: sevCfg.color, background: sevCfg.bg,
                            border: `1px solid ${sevCfg.border}`,
                            padding: '1px 5px', borderRadius: 2,
                            letterSpacing: 1, fontWeight: 600, flexShrink: 0,
                          }}>
                            {sevCfg.label}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{
                            fontFamily: "'Azeret Mono', monospace", fontSize: 9,
                            color: 'rgba(242,242,244,0.28)',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            maxWidth: 320,
                          }}>
                            {s.file}{s.line ? `:${s.line}` : ''}
                          </span>
                          <span style={{
                            fontFamily: "'Azeret Mono', monospace", fontSize: 8,
                            color: catCfg.color, background: `${catCfg.color}18`,
                            padding: '1px 6px', borderRadius: 2, flexShrink: 0,
                          }}>
                            {catCfg.label}
                          </span>
                        </div>
                      </div>

                      <svg
                        width="12" height="12" viewBox="0 0 12 12" fill="none"
                        style={{
                          flexShrink: 0,
                          transform: isOpen ? 'rotate(90deg)' : 'none',
                          transition: 'transform 0.15s',
                        }}
                      >
                        <path d="M4 2l4 4-4 4" stroke="rgba(242,242,244,0.28)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>

                    {/* Expanded body */}
                    {isOpen && (
                      <div style={{ borderTop: '1px solid rgba(242,242,244,0.06)' }}>

                        {/* Explanation */}
                        <div style={{
                          padding: '14px 16px',
                          fontFamily: "'Manrope', sans-serif", fontSize: 13,
                          color: 'rgba(242,242,244,0.5)', lineHeight: 1.7,
                          borderBottom: '1px solid rgba(242,242,244,0.05)',
                        }}>
                          {s.explanation}
                        </div>

                        {/* Diff */}
                        <div style={{ padding: '14px 16px' }}>
                          <CodeDiff before={s.before} after={s.after} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────────────────── */

function Spinner({ size = 12 }) {
  return (
    <span style={{
      display: 'inline-block', width: size, height: size, borderRadius: '50%',
      border: '2px solid rgba(242,242,244,0.12)',
      borderTopColor: 'rgba(0,255,135,0.6)',
      animation: 'spin 0.8s linear infinite', flexShrink: 0,
    }} />
  );
}

function FilterPill({ label, count, color, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', padding: '6px 10px', borderRadius: 4,
        background: active ? 'rgba(242,242,244,0.06)' : 'transparent',
        border: `1px solid ${active ? 'rgba(242,242,244,0.1)' : 'transparent'}`,
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
        transition: 'background 0.12s',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(242,242,244,0.03)'; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = active ? 'rgba(242,242,244,0.06)' : 'transparent'; }}
    >
      <span style={{
        fontFamily: "'Azeret Mono', monospace", fontSize: 10,
        color: active ? '#F2F2F4' : 'rgba(242,242,244,0.45)',
        flex: 1, textAlign: 'left',
      }}>{label}</span>
      <span style={{
        fontFamily: "'Azeret Mono', monospace", fontSize: 9,
        color, background: `${color}1A`,
        padding: '1px 7px', borderRadius: 3, minWidth: 22, textAlign: 'center',
      }}>{count}</span>
    </button>
  );
}

function StatRow({ label, value, highlight, small }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{
        fontFamily: "'Azeret Mono', monospace", fontSize: 8,
        color: 'rgba(242,242,244,0.25)', letterSpacing: 1, textTransform: 'uppercase',
      }}>{label}</span>
      <span style={{
        fontFamily: small ? "'Azeret Mono', monospace" : "'Manrope', sans-serif",
        fontSize: small ? 9 : 12, fontWeight: small ? 400 : 600,
        color: highlight ? '#00FF87' : 'rgba(242,242,244,0.55)',
        maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        textAlign: 'right',
      }}>{value}</span>
    </div>
  );
}

function LoadingState({ repo, stepLabel }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      minHeight: 420, gap: 24,
    }}>
      {/* Spinner ring */}
      <div style={{ position: 'relative', width: 56, height: 56 }}>
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          border: '1px solid rgba(0,255,135,0.08)',
        }} />
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          border: '2px solid transparent',
          borderTopColor: '#00FF87',
          animation: 'spin 1.1s linear infinite',
        }} />
      </div>

      <div style={{ textAlign: 'center', maxWidth: 360 }}>
        <div style={{
          fontFamily: "'Manrope', sans-serif", fontSize: 17, fontWeight: 600,
          color: '#F2F2F4', letterSpacing: '-0.3px', marginBottom: 10,
        }}>
          Analyzing {repo}
        </div>
        <div style={{
          fontFamily: "'Azeret Mono', monospace", fontSize: 10,
          color: 'rgba(0,255,135,0.55)', letterSpacing: 0.5,
          minHeight: 18,
        }}>
          {stepLabel}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      minHeight: 420, gap: 20,
    }}>
      {/* GitHub icon */}
      <div style={{
        width: 52, height: 52, borderRadius: 10,
        background: '#0E0E18', border: '1px solid rgba(242,242,244,0.07)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="rgba(242,242,244,0.25)">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
        </svg>
      </div>

      <div style={{ textAlign: 'center', maxWidth: 380 }}>
        <div style={{
          fontFamily: "'Manrope', sans-serif", fontSize: 20, fontWeight: 700,
          color: '#F2F2F4', letterSpacing: '-0.4px', marginBottom: 10,
        }}>
          AI Design Review
        </div>
        <div style={{
          fontFamily: "'Manrope', sans-serif", fontSize: 13,
          color: 'rgba(242,242,244,0.35)', lineHeight: 1.75,
        }}>
          Connect your GitHub repo and click <strong style={{ color: 'rgba(242,242,244,0.6)', fontWeight: 600 }}>Analyze Codebase</strong> to get specific design improvements with exact before/after code diffs.
        </div>
      </div>

      {/* Feature pills */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 }}>
        {['Colors & tokens', 'Typography', 'Spacing scale', 'Accessibility', 'Consistency'].map(f => (
          <span key={f} style={{
            fontFamily: "'Azeret Mono', monospace", fontSize: 9,
            color: 'rgba(242,242,244,0.28)', letterSpacing: 0.5,
            background: 'rgba(242,242,244,0.04)',
            border: '1px solid rgba(242,242,244,0.07)',
            padding: '4px 10px', borderRadius: 20,
          }}>{f}</span>
        ))}
      </div>
    </div>
  );
}
