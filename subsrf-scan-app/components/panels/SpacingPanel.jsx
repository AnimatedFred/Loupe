'use client';

export default function SpacingPanel({ spacing, baseUnit, onCopy, copied }) {
  if (!spacing?.length) return <div style={{ color: 'var(--t3)', fontFamily: "'Azeret Mono', monospace", fontSize: 12 }}>No spacing tokens extracted.</div>;

  const maxPx = Math.max(...spacing.map(t => parseFloat(t.value)));

  return (
    <div>
      <div style={{
        fontFamily: "'Azeret Mono', monospace", fontSize: 9, letterSpacing: '2.5px',
        textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 14,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        Scale — base unit: {baseUnit || 4}px
        <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {spacing.map(t => {
          const px = parseFloat(t.value);
          const pct = Math.max(3, (px / maxPx) * 96);
          return (
            <div key={t.name} onClick={() => onCopy(t.value)} style={{
              display: 'flex', alignItems: 'center', gap: 16,
              padding: '8px 14px', background: 'var(--layer)',
              border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer',
            }}>
              <div style={{ fontFamily: "'Azeret Mono', monospace", fontSize: 10, color: 'var(--t3)', width: 80 }}>
                {t.name}
              </div>
              <div style={{ flex: 1, height: 8, background: 'var(--surface)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${pct}%`,
                  background: 'rgba(0,255,135,0.25)', borderRadius: 2,
                  borderRight: '2px solid var(--neon)',
                }} />
              </div>
              <div style={{ fontFamily: "'Azeret Mono', monospace", fontSize: 10, color: 'var(--neon)', width: 50, textAlign: 'right' }}>
                {copied === t.value ? '✓' : t.value}
              </div>
              <div style={{ fontFamily: "'Azeret Mono', monospace", fontSize: 9, color: 'var(--t3)', width: 50, textAlign: 'right' }}>
                {t.frequency} uses
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
