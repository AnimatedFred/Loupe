'use client';

function groupColors(colors) {
  const groups = { 'Text': [], 'Backgrounds': [], 'Accent & Status': [], 'Other': [] };
  for (const t of colors || []) {
    if (t.name.includes('/text/')) groups['Text'].push(t);
    else if (t.name.includes('/bg/')) groups['Backgrounds'].push(t);
    else if (t.name.includes('/accent') || t.name.includes('/status') || t.name.includes('/other/0')) groups['Accent & Status'].push(t);
    else groups['Other'].push(t);
  }
  return groups;
}

export default function ColorsPanel({ tokens, onCopy, copied }) {
  const groups = groupColors(tokens);

  return (
    <div>
      {Object.entries(groups).map(([group, items]) => {
        if (!items.length) return null;
        return (
          <div key={group} style={{ marginBottom: 36 }}>
            <div style={{
              fontFamily: "'Azeret Mono', monospace", fontSize: 9, letterSpacing: '2.5px',
              textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 14,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              {group}
              <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
              gap: 10,
            }}>
              {items.map(token => {
                const isCopied = copied === token.value;
                return (
                  <div key={token.name} onClick={() => onCopy(token.value)} className="token-card">
                    <div style={{
                      height: 80, width: '100%', background: token.value, position: 'relative',
                      borderRadius: 2, border: '1px solid rgba(242,242,244,0.08)', overflow: 'hidden',
                    }}>
                      <div className="token-swatch-overlay" />
                      {isCopied && (
                        <div style={{
                          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: "'Azeret Mono', monospace", fontSize: 8, letterSpacing: 1,
                          color: 'rgba(255,255,255,0.9)', background: 'rgba(0,0,0,0.4)',
                          textTransform: 'uppercase',
                        }}>✓ copied</div>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '0 2px' }}>
                      <span style={{
                        fontFamily: "'Azeret Mono', monospace", fontSize: 12, color: 'var(--t1)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>{token.name.split('/').pop()}</span>
                      <span style={{
                        fontFamily: "'Azeret Mono', monospace", fontSize: 10, color: 'var(--t3)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>{token.hex || token.value}</span>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
                        {token.frequency > 0 ? (
                          <span style={{ fontFamily: "'Azeret Mono', monospace", fontSize: 9, color: 'rgba(242,242,244,0.4)' }}>
                            {token.frequency} uses
                          </span>
                        ) : <span />}
                        <svg className="token-copy-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
