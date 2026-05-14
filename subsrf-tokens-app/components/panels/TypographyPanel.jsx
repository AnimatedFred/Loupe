'use client';

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <div style={{
        fontFamily: "'Azeret Mono', monospace", fontSize: 9, letterSpacing: '2.5px',
        textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 14,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        {title}
        <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>
      {children}
    </div>
  );
}

export default function TypographyPanel({ typography, onCopy, copied }) {
  if (!typography) return null;

  return (
    <div>
      {typography.families?.length > 0 && (
        <Section title="Font Families">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {typography.families.map(t => (
              <div key={t.name} onClick={() => onCopy(t.value)} style={{
                display: 'grid', gridTemplateColumns: '180px 1fr auto',
                alignItems: 'center', gap: 16, padding: '10px 14px',
                background: 'var(--layer)', border: '1px solid var(--border)',
                borderRadius: 6, cursor: 'pointer', transition: 'border-color 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-md)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <div style={{ fontFamily: "'Azeret Mono', monospace", fontSize: 9, color: 'var(--t3)', lineHeight: 1.7 }}>
                  {t.name}<br />{t.value}
                </div>
                <div style={{
                  fontSize: 18, fontWeight: 700, color: 'var(--t1)',
                  fontFamily: t.value, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>The quick brown fox</div>
                <div style={{
                  fontFamily: "'Azeret Mono', monospace", fontSize: 9, color: 'var(--t3)',
                  background: 'var(--surface)', padding: '2px 7px', borderRadius: 3,
                  color: copied === t.value ? 'var(--neon)' : 'var(--t3)',
                }}>{copied === t.value ? '✓ copied' : `${t.frequency} uses`}</div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {typography.sizes?.length > 0 && (
        <Section title="Font Sizes">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {typography.sizes.map(t => (
              <div key={t.name} onClick={() => onCopy(t.value)} style={{
                display: 'grid', gridTemplateColumns: '120px 1fr auto',
                alignItems: 'center', gap: 16, padding: '10px 14px',
                background: 'var(--layer)', border: '1px solid var(--border)',
                borderRadius: 6, cursor: 'pointer', transition: 'border-color 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-md)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <div style={{ fontFamily: "'Azeret Mono', monospace", fontSize: 9, color: 'var(--t3)', lineHeight: 1.7 }}>
                  {t.name}<br />{t.value}
                </div>
                <div style={{
                  fontSize: t.value, color: 'var(--t1)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  maxWidth: 200,
                }}>Sample text</div>
                <div style={{
                  fontFamily: "'Azeret Mono', monospace", fontSize: 9,
                  color: copied === t.value ? 'var(--neon)' : 'var(--t3)',
                  background: 'var(--surface)', padding: '2px 7px', borderRadius: 3,
                }}>{copied === t.value ? '✓' : t.frequency + ' uses'}</div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
