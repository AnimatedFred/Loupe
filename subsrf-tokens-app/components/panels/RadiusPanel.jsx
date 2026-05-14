'use client';

export default function RadiusPanel({ radius, onCopy, copied }) {
  if (!radius?.length) return <div style={{ color: 'var(--t3)', fontFamily: "'Azeret Mono', monospace", fontSize: 12 }}>No radius tokens extracted.</div>;

  return (
    <div>
      <div style={{
        fontFamily: "'Azeret Mono', monospace", fontSize: 9, letterSpacing: '2.5px',
        textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 14,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        Border radius scale
        <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {radius.map(t => {
          const px = Math.min(parseFloat(t.value), 18);
          return (
            <div key={t.name} onClick={() => onCopy(t.value)} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              padding: 16, background: 'var(--layer)', border: '1px solid var(--border)',
              borderRadius: 8, cursor: 'pointer', minWidth: 80, transition: 'border-color 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-md)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div style={{
                width: 36, height: 36, borderRadius: px >= 9000 ? '50%' : `${px}px`,
                background: 'rgba(0,255,135,0.15)', border: '1.5px solid var(--neon)',
              }} />
              <div style={{ fontFamily: "'Azeret Mono', monospace", fontSize: 9, color: 'var(--t3)', letterSpacing: 1 }}>
                {t.name.split('/').pop()?.toUpperCase()}
              </div>
              <div style={{ fontFamily: "'Azeret Mono', monospace", fontSize: 10, color: copied === t.value ? 'var(--neon)' : 'var(--neon)' }}>
                {copied === t.value ? '✓' : t.value}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
