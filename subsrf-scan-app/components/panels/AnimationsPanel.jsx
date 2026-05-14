'use client';

export default function AnimationsPanel({ animations, onCopy, copied }) {
  if (!animations?.length) {
    return (
      <div style={{ color: 'var(--t3)', fontFamily: "'Azeret Mono', monospace", fontSize: 12, padding: '24px 0' }}>
        No animations detected on this page.
      </div>
    );
  }

  const durations = animations.filter(a => a.name.startsWith('anim/duration'));
  const easings = animations.filter(a => a.name.startsWith('anim/ease'));
  const delays = animations.filter(a => a.name.startsWith('anim/delay'));

  const Section = ({ title, items }) => {
    if (!items.length) return null;
    return (
      <div style={{ marginBottom: 32 }}>
        <div style={{
          fontFamily: "'Azeret Mono', monospace", fontSize: 9, letterSpacing: 2,
          textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 12,
        }}>{title}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map(t => (
            <div key={t.name} onClick={() => onCopy(t.value)} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: 'var(--layer)', border: copied === t.value ? '1px solid rgba(0,255,135,0.3)' : '1px solid var(--border)',
              borderRadius: 8, padding: '12px 16px', cursor: 'pointer', transition: 'border-color 0.15s',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Azeret Mono', monospace", fontSize: 10, color: 'var(--neon)', marginBottom: 4 }}>
                  --{t.name.replace(/\//g, '-')}
                </div>
                <div style={{ fontFamily: "'Azeret Mono', monospace", fontSize: 11, color: 'var(--t1)' }}>
                  {t.value}
                </div>
              </div>
              <div style={{ fontFamily: "'Azeret Mono', monospace", fontSize: 9, color: 'var(--t3)' }}>
                {t.frequency}×
              </div>
              {copied === t.value && (
                <div style={{ fontFamily: "'Azeret Mono', monospace", fontSize: 9, color: 'var(--neon)' }}>copied</div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div>
      <Section title="Durations" items={durations} />
      <Section title="Easings" items={easings} />
      <Section title="Delays" items={delays} />
    </div>
  );
}
