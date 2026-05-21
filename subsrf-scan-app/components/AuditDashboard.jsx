'use client';

import { useState } from 'react';
import { useUser } from '../context/UserContext';
import GitHubConnect from './GitHubConnect';

const SEVERITY_CONFIG = {
  error:   { color: '#FF4D4D', bg: 'rgba(255,77,77,0.08)',   border: 'rgba(255,77,77,0.2)',  label: 'ERROR' },
  warning: { color: '#FFB020', bg: 'rgba(255,176,32,0.08)',  border: 'rgba(255,176,32,0.2)', label: 'WARN' },
  info:    { color: '#38bdf8', bg: 'rgba(56,189,248,0.08)',  border: 'rgba(56,189,248,0.2)', label: 'INFO' },
};

const RULE_LABELS = {
  'hardcoded-color': 'Hardcoded Color',
  'hardcoded-font-size': 'Hardcoded Font Size',
  'hardcoded-spacing': 'Hardcoded Spacing',
  'hardcoded-radius': 'Hardcoded Radius',
  'inconsistent-font-family': 'Inconsistent Font',
};

export default function AuditDashboard({ tokens }) {
  const { session } = useUser() || {};
  const [repos, setRepos] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [auditResult, setAuditResult] = useState(null);
  const [auditing, setAuditing] = useState(false);
  const [error, setError] = useState(null);
  const [severityFilter, setSeverityFilter] = useState('all');
  const [expandedFile, setExpandedFile] = useState(null);

  async function handleRunAudit() {
    if (!selectedRepo || !session?.access_token || !tokens) return;
    setAuditing(true);
    setError(null);
    setAuditResult(null);

    try {
      const res = await fetch('/api/github/audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          owner: selectedRepo.owner,
          repo: selectedRepo.name,
          installationId: selectedRepo.installationId,
          tokens,
          branch: selectedRepo.defaultBranch,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Audit failed');
      setAuditResult(data.audit);
    } catch (err) {
      setError(err.message);
    } finally {
      setAuditing(false);
    }
  }

  // Group violations by file
  const violationsByFile = auditResult?.violations?.reduce((acc, v) => {
    if (severityFilter !== 'all' && v.severity !== severityFilter) return acc;
    if (!acc[v.file]) acc[v.file] = [];
    acc[v.file].push(v);
    return acc;
  }, {}) || {};

  const filteredTotal = Object.values(violationsByFile).reduce((n, arr) => n + arr.length, 0);

  // ── No tokens extracted yet ──
  if (!tokens) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center' }}>
        <div style={{
          fontFamily: "'Azeret Mono', monospace", fontSize: 11,
          color: 'var(--t3)', lineHeight: 1.8,
        }}>
          Extract design tokens from a URL first,<br />
          then audit your codebase against them.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Connect + Repo picker ── */}
      <div style={{
        background: 'var(--layer)', border: '1px solid var(--border)',
        borderRadius: 6, padding: 16,
      }}>
        <GitHubConnect onReposLoaded={setRepos} />

        {repos.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{
              fontFamily: "'Azeret Mono', monospace", fontSize: 9,
              letterSpacing: 2, textTransform: 'uppercase', color: 'var(--t3)',
              marginBottom: 8,
            }}>Repository</div>

            <select
              value={selectedRepo?.fullName || ''}
              onChange={e => {
                const repo = repos.find(r => r.fullName === e.target.value);
                setSelectedRepo(repo || null);
                setAuditResult(null);
              }}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 4,
                background: 'var(--surface)', border: '1px solid var(--border)',
                color: 'var(--t1)', fontFamily: "'Azeret Mono', monospace", fontSize: 12,
                cursor: 'pointer', outline: 'none',
                appearance: 'none',
              }}
            >
              <option value="">Select a repository…</option>
              {repos.map(r => (
                <option key={r.fullName} value={r.fullName}>
                  {r.fullName} {r.private ? '🔒' : ''}
                </option>
              ))}
            </select>

            {selectedRepo && (
              <button
                onClick={handleRunAudit}
                disabled={auditing}
                style={{
                  marginTop: 12, width: '100%', padding: '10px 16px',
                  borderRadius: 4, border: 'none', cursor: 'pointer',
                  background: auditing ? 'var(--lift)' : '#00FF87',
                  color: auditing ? 'var(--t2)' : '#050508',
                  fontFamily: "'Azeret Mono', monospace", fontSize: 11,
                  fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  opacity: auditing ? 0.6 : 1,
                  transition: 'background 0.15s',
                }}
              >
                {auditing ? (
                  <>
                    <span style={{
                      display: 'inline-block', width: 12, height: 12,
                      border: '2px solid var(--t3)', borderTopColor: 'var(--neon)',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite',
                    }} />
                    Auditing…
                  </>
                ) : (
                  <>Run Audit →</>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={{
          padding: '10px 14px', borderRadius: 4,
          background: 'rgba(255,77,77,0.08)', border: '1px solid rgba(255,77,77,0.2)',
          fontFamily: "'Azeret Mono', monospace", fontSize: 11, color: '#FF4D4D',
        }}>
          {error}
        </div>
      )}

      {/* ── Audit results ── */}
      {auditResult && (
        <>
          {/* Summary bar */}
          <div style={{
            display: 'flex', gap: 8, flexWrap: 'wrap',
          }}>
            <SummaryChip
              label="Files"
              value={auditResult.filesScanned}
              color="var(--t2)"
            />
            <SummaryChip
              label="Errors"
              value={auditResult.summary.errors}
              color="#FF4D4D"
              active={severityFilter === 'error'}
              onClick={() => setSeverityFilter(f => f === 'error' ? 'all' : 'error')}
            />
            <SummaryChip
              label="Warnings"
              value={auditResult.summary.warnings}
              color="#FFB020"
              active={severityFilter === 'warning'}
              onClick={() => setSeverityFilter(f => f === 'warning' ? 'all' : 'warning')}
            />
            <SummaryChip
              label="Info"
              value={auditResult.summary.info}
              color="#38bdf8"
              active={severityFilter === 'info'}
              onClick={() => setSeverityFilter(f => f === 'info' ? 'all' : 'info')}
            />
          </div>

          {/* Score */}
          <div style={{
            background: 'var(--layer)', border: '1px solid var(--border)',
            borderRadius: 6, padding: 16, display: 'flex', alignItems: 'center', gap: 16,
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: auditResult.summary.errors === 0 ? 'rgba(0,255,135,0.1)' : 'rgba(255,77,77,0.1)',
              border: `2px solid ${auditResult.summary.errors === 0 ? 'rgba(0,255,135,0.4)' : 'rgba(255,77,77,0.4)'}`,
            }}>
              <span style={{
                fontFamily: "'Azeret Mono', monospace", fontSize: 16, fontWeight: 700,
                color: auditResult.summary.errors === 0 ? '#00FF87' : '#FF4D4D',
              }}>
                {auditResult.totalViolations}
              </span>
            </div>
            <div>
              <div style={{
                fontFamily: "'Manrope', sans-serif", fontSize: 16, fontWeight: 600,
                color: 'var(--t1)',
              }}>
                {auditResult.totalViolations === 0
                  ? 'Clean — no violations found'
                  : `${auditResult.totalViolations} violation${auditResult.totalViolations !== 1 ? 's' : ''} found`}
              </div>
              <div style={{
                fontFamily: "'Azeret Mono', monospace", fontSize: 10,
                color: 'var(--t3)', marginTop: 2,
              }}>
                {auditResult.repoName} · {auditResult.filesScanned} files scanned
              </div>
            </div>
          </div>

          {/* Violations grouped by file */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {Object.entries(violationsByFile).map(([file, violations]) => (
              <div key={file} style={{
                background: 'var(--layer)', border: '1px solid var(--border)',
                borderRadius: 4, overflow: 'hidden',
              }}>
                {/* File header */}
                <button
                  onClick={() => setExpandedFile(f => f === file ? null : file)}
                  style={{
                    width: '100%', padding: '10px 14px',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(242,242,244,0.02)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="2">
                      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                      <polyline points="13 2 13 9 20 9" />
                    </svg>
                    <span style={{
                      fontFamily: "'Azeret Mono', monospace", fontSize: 11,
                      color: 'var(--t1)',
                    }}>
                      {file}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {violations.some(v => v.severity === 'error') && (
                      <span style={{
                        fontFamily: "'Azeret Mono', monospace", fontSize: 9,
                        color: '#FF4D4D', background: 'rgba(255,77,77,0.1)',
                        padding: '1px 6px', borderRadius: 3,
                      }}>
                        {violations.filter(v => v.severity === 'error').length}
                      </span>
                    )}
                    {violations.some(v => v.severity === 'warning') && (
                      <span style={{
                        fontFamily: "'Azeret Mono', monospace", fontSize: 9,
                        color: '#FFB020', background: 'rgba(255,176,32,0.1)',
                        padding: '1px 6px', borderRadius: 3,
                      }}>
                        {violations.filter(v => v.severity === 'warning').length}
                      </span>
                    )}
                    <span style={{
                      fontFamily: "'Azeret Mono', monospace", fontSize: 10,
                      color: 'var(--t3)',
                      transform: expandedFile === file ? 'rotate(90deg)' : 'none',
                      transition: 'transform 0.15s',
                    }}>▸</span>
                  </div>
                </button>

                {/* Expanded violations */}
                {expandedFile === file && (
                  <div style={{
                    borderTop: '1px solid var(--border)',
                    padding: '0',
                  }}>
                    {violations.map((v, i) => {
                      const sev = SEVERITY_CONFIG[v.severity] || SEVERITY_CONFIG.info;
                      return (
                        <div key={i} style={{
                          padding: '10px 14px 10px 36px',
                          borderBottom: i < violations.length - 1 ? '1px solid rgba(242,242,244,0.04)' : 'none',
                          display: 'flex', flexDirection: 'column', gap: 4,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{
                              fontFamily: "'Azeret Mono', monospace", fontSize: 8,
                              color: sev.color, background: sev.bg,
                              border: `1px solid ${sev.border}`,
                              padding: '1px 5px', borderRadius: 2,
                              letterSpacing: 1, fontWeight: 600,
                            }}>{sev.label}</span>
                            <span style={{
                              fontFamily: "'Azeret Mono', monospace", fontSize: 10,
                              color: 'var(--t2)',
                            }}>
                              {RULE_LABELS[v.rule] || v.rule}
                            </span>
                            <span style={{
                              fontFamily: "'Azeret Mono', monospace", fontSize: 9,
                              color: 'var(--t3)',
                            }}>
                              L{v.line}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {v.rule === 'hardcoded-color' && (
                              <div style={{
                                width: 14, height: 14, borderRadius: 2,
                                background: v.found, flexShrink: 0,
                                border: '1px solid rgba(242,242,244,0.1)',
                              }} />
                            )}
                            <code style={{
                              fontFamily: "'Azeret Mono', monospace", fontSize: 10,
                              color: sev.color, fontWeight: 500,
                            }}>
                              {v.found}
                            </code>
                            <span style={{
                              fontFamily: "'Azeret Mono', monospace", fontSize: 9,
                              color: 'var(--t3)',
                            }}>→</span>
                            <span style={{
                              fontFamily: "'Azeret Mono', monospace", fontSize: 10,
                              color: 'var(--neon)',
                            }}>
                              {v.suggestion}
                            </span>
                          </div>

                          {/* Code context */}
                          <div style={{
                            fontFamily: "'Azeret Mono', monospace", fontSize: 9,
                            color: 'var(--t3)', marginTop: 2,
                            padding: '4px 8px', borderRadius: 3,
                            background: 'rgba(242,242,244,0.02)',
                            overflow: 'hidden', textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {v.context}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}

            {filteredTotal === 0 && auditResult.totalViolations > 0 && (
              <div style={{
                fontFamily: "'Azeret Mono', monospace", fontSize: 11,
                color: 'var(--t3)', padding: '20px 0', textAlign: 'center',
              }}>
                No violations match the current filter.
              </div>
            )}
          </div>
        </>
      )}

      {/* Spinner keyframes */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

function SummaryChip({ label, value, color, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '6px 12px', borderRadius: 4,
        background: active ? `${color}15` : 'var(--layer)',
        border: active ? `1px solid ${color}40` : '1px solid var(--border)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.12s, background 0.12s',
      }}
    >
      <span style={{
        fontFamily: "'Azeret Mono', monospace", fontSize: 14,
        fontWeight: 700, color,
      }}>{value}</span>
      <span style={{
        fontFamily: "'Azeret Mono', monospace", fontSize: 9,
        color: 'var(--t3)', letterSpacing: 1, textTransform: 'uppercase',
      }}>{label}</span>
    </button>
  );
}
