'use client';

export default function ComponentPanel({ componentDetection }) {
  if (!componentDetection) {
    return (
      <div style={{ color: 'var(--t3)', fontFamily: "'Azeret Mono', monospace", fontSize: 12, padding: '24px 0' }}>
        Component detection data not available.
      </div>
    );
  }

  const { primaryMatch, secondaryMatch, customTokens } = componentDetection;

  const ConfidenceBar = ({ confidence }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
      <div style={{
        flex: 1, height: 4, background: 'var(--layer)', borderRadius: 2, overflow: 'hidden',
      }}>
        <div style={{
          width: `${Math.round(confidence * 100)}%`, height: '100%',
          background: confidence > 0.6 ? 'var(--neon)' : confidence > 0.4 ? '#FFB020' : 'var(--t3)',
          borderRadius: 2, transition: 'width 0.3s',
        }} />
      </div>
      <span style={{ fontFamily: "'Azeret Mono', monospace", fontSize: 10, color: 'var(--t2)', minWidth: 32 }}>
        {Math.round(confidence * 100)}%
      </span>
    </div>
  );

  return (
    <div>
      {/* Primary match */}
      <div style={{ marginBottom: 32 }}>
        <div style={{
          fontFamily: "'Azeret Mono', monospace", fontSize: 9, letterSpacing: 2,
          textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 12,
        }}>Detected Framework</div>

        {primaryMatch && (
          <div style={{
            background: 'var(--layer)', border: '1px solid var(--neon-dim)',
            borderRadius: 10, padding: '16px 20px', marginBottom: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{
                fontFamily: "'Azeret Mono', monospace", fontSize: 9, letterSpacing: 1,
                textTransform: 'uppercase', color: 'var(--neon)',
                background: 'var(--neon-dim)', border: '1px solid rgba(0,255,135,0.2)',
                borderRadius: 3, padding: '2px 8px',
              }}>Primary</div>
              <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 16, fontWeight: 700 }}>
                {primaryMatch.library}
              </span>
            </div>
            <ConfidenceBar confidence={primaryMatch.confidence} />
          </div>
        )}

        {secondaryMatch && (
          <div style={{
            background: 'var(--layer)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '16px 20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{
                fontFamily: "'Azeret Mono', monospace", fontSize: 9, letterSpacing: 1,
                textTransform: 'uppercase', color: 'var(--t3)',
                background: 'var(--lift)', border: '1px solid var(--border)',
                borderRadius: 3, padding: '2px 8px',
              }}>Secondary</div>
              <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 15, fontWeight: 600, color: 'var(--t2)' }}>
                {secondaryMatch.library}
              </span>
            </div>
            <ConfidenceBar confidence={secondaryMatch.confidence} />
          </div>
        )}

        {!primaryMatch && !secondaryMatch && (
          <div style={{
            background: 'var(--layer)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '20px', color: 'var(--t3)',
            fontFamily: "'Azeret Mono', monospace", fontSize: 11,
          }}>
            No known library matched with sufficient confidence. This appears to be a custom design system.
          </div>
        )}
      </div>

      {/* Custom tokens */}
      {customTokens?.length > 0 && (
        <div>
          <div style={{
            fontFamily: "'Azeret Mono', monospace", fontSize: 9, letterSpacing: 2,
            textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 12,
          }}>Custom Tokens (not in reference libraries)</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {customTokens.map(name => (
              <span key={name} style={{
                fontFamily: "'Azeret Mono', monospace", fontSize: 10,
                color: 'var(--t2)', background: 'var(--layer)',
                border: '1px solid var(--border)', borderRadius: 4,
                padding: '4px 10px',
              }}>{name}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
