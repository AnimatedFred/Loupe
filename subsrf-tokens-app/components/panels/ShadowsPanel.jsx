'use client';

export default function ShadowsPanel({ shadows, onCopy, copied }) {
  if (!shadows?.length) return <div style={{ color: 'var(--t3)', fontFamily: "'Azeret Mono', monospace", fontSize: 12 }}>No shadow tokens extracted.</div>;

  return (
    <div>
      <div style={{
        fontFamily: "'Azeret Mono', monospace", fontSize: 9, letterSpacing: '2.5px',
        textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 14,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        Elevation scale
        <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12,
      }}>
        {shadows.map(t => {
          const isAccent = t.name.includes('accent');
          return (
            <div key={t.name} onClick={() => onCopy(t.value)} style={{
              padding: 20, background: 'var(--surface)',
              border: '1px solid var(--border)', borderRadius: 10,
              cursor: 'pointer', transition: 'transform 0.15s',
              boxShadow: t.value,
            }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = ''}
            >
              <div style={{
                width: 48, height: 48, background: isAccent ? 'rgba(0,255,135,0.1)' : 'var(--lift)',
                borderRadius: 8, marginBottom: 12,
                boxShadow: t.value,
                border: isAccent ? '1px solid rgba(0,255,135,0.2)' : undefined,
              }} />
              <div style={{ fontFamily: "'Azeret Mono', monospace", fontSize: 10, color: 'var(--t2)', marginBottom: 4 }}>
                {t.name}
              </div>
              <div style={{
                fontFamily: "'Azeret Mono', monospace", fontSize: 9, color: 'var(--t3)',
                lineHeight: 1.6, wordBreak: 'break-all',
              }}>
                {copied === t.value ? '✓ copied' : t.value.slice(0, 60)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
