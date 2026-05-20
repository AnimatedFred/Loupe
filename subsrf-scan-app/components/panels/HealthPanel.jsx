'use client';

const SEVERITY_COLOR = {
  critical: '#FF4D4D',
  warning: '#FFB020',
  info: 'var(--t3)',
};

const SEVERITY_LABEL = {
  critical: 'CRITICAL',
  warning: 'WARNING',
  info: 'INFO',
};

export default function HealthPanel({ healthScore }) {
  if (!healthScore) {
    return (
      <div style={{ color: 'var(--t3)', fontFamily: "'Azeret Mono', monospace", fontSize: 12, padding: '24px 0' }}>
        Health score not available.
      </div>
    );
  }

  const { score, critical, warnings, info, issues } = healthScore;

  const scoreColor = score >= 80 ? 'var(--neon)' : score >= 60 ? '#FFB020' : '#FF4D4D';
  const scoreBg = score >= 80 ? 'rgba(0,255,135,0.08)' : score >= 60 ? 'rgba(255,176,32,0.08)' : 'rgba(255,77,77,0.08)';
  const scoreBorder = score >= 80 ? 'rgba(0,255,135,0.2)' : score >= 60 ? 'rgba(255,176,32,0.2)' : 'rgba(255,77,77,0.2)';

  const grouped = {
    critical: issues.filter(i => i.severity === 'critical'),
    warning: issues.filter(i => i.severity === 'warning'),
    info: issues.filter(i => i.severity === 'info'),
  };

  return (
    <div>
      {/* Score badge */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 20,
        background: scoreBg, border: `1px solid ${scoreBorder}`,
        borderRadius: 12, padding: '20px 24px', marginBottom: 32,
      }}>
        <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: 56, fontWeight: 800, color: scoreColor, lineHeight: 1 }}>
          {score}
        </div>
        <div>
          <div style={{ fontFamily: "'Azeret Mono', monospace", fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 8 }}>
            Health Score / 100
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            {critical > 0 && <span style={{ fontFamily: "'Azeret Mono', monospace", fontSize: 10, color: '#FF4D4D' }}>{critical} critical</span>}
            {warnings > 0 && <span style={{ fontFamily: "'Azeret Mono', monospace", fontSize: 10, color: '#FFB020' }}>{warnings} warning{warnings !== 1 ? 's' : ''}</span>}
            {info > 0 && <span style={{ fontFamily: "'Azeret Mono', monospace", fontSize: 10, color: 'var(--t3)' }}>{info} info</span>}
            {!issues.length && <span style={{ fontFamily: "'Azeret Mono', monospace", fontSize: 10, color: 'var(--neon)' }}>No issues found</span>}
          </div>
        </div>
      </div>

      {/* Issues by severity */}
      {['critical', 'warning', 'info'].map(sev => {
        const list = grouped[sev];
        if (!list.length) return null;
        return (
          <div key={sev} style={{ marginBottom: 28 }}>
            <div style={{
              fontFamily: "'Azeret Mono', monospace", fontSize: 9, letterSpacing: 2,
              color: SEVERITY_COLOR[sev], marginBottom: 10,
            }}>{SEVERITY_LABEL[sev]} — {list.length} issue{list.length !== 1 ? 's' : ''}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {list.map((issue, i) => (
                <div key={i} style={{
                  background: 'var(--layer)', border: '1px solid var(--border)',
                  borderLeft: `3px solid ${SEVERITY_COLOR[sev]}`,
                  borderRadius: 8, padding: '12px 16px',
                }}>
                  <div style={{
                    fontFamily: "'Azeret Mono', monospace", fontSize: 10,
                    color: 'var(--t2)', lineHeight: 1.6, marginBottom: issue.tokens?.length ? 10 : 0,
                  }}>{issue.message}</div>
                  {issue.tokens?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {issue.tokens.map((token, j) => (
                        <span key={j} style={{
                          fontFamily: "'Azeret Mono', monospace", fontSize: 9,
                          color: SEVERITY_COLOR[sev],
                          background: sev === 'critical' ? 'rgba(255,77,77,0.07)' : sev === 'warning' ? 'rgba(255,176,32,0.07)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${SEVERITY_COLOR[sev]}22`,
                          borderRadius: 4, padding: '2px 7px',
                          maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{token}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {!issues.length && (
        <div style={{
          textAlign: 'center', padding: '40px 0',
          fontFamily: "'Azeret Mono', monospace", fontSize: 12, color: 'var(--neon)',
        }}>
          No issues detected — this is a clean system.
        </div>
      )}
    </div>
  );
}
