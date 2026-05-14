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
                  <div key={token.name} onClick={() => onCopy(token.value)} style={{
                    borderRadius: 8, overflow: 'hidden',
                    border: '1px solid var(--border)', cursor: 'pointer',
                    transition: 'transform 0.15s, box-shadow 0.15s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.4)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
                  >
                    <div style={{
                      height: 60, width: '100%', background: token.value, position: 'relative',
                      boxShadow: token.name.includes('accent') ? 'inset 0 0 20px rgba(0,255,135,0.2)' : undefined,
                    }}>
                      {isCopied && (
                        <div style={{
                          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: "'Azeret Mono', monospace", fontSize: 8, letterSpacing: 1,
                          color: 'rgba(255,255,255,0.9)', background: 'rgba(0,0,0,0.4)',
                          textTransform: 'uppercase',
                        }}>✓ copied</div>
                      )}
                    </div>
                    <div style={{ background: 'var(--surface)', padding: '8px 10px' }}>
                      <div style={{
                        fontFamily: "'Azeret Mono', monospace", fontSize: 9, color: 'var(--t2)',
                        marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>{token.name.split('/').pop()}</div>
                      <div style={{
                        fontFamily: "'Azeret Mono', monospace", fontSize: 9, color: 'var(--t3)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>{token.hex || token.value}</div>
                      {token.frequency > 0 && (
                        <div style={{ fontFamily: "'Azeret Mono', monospace", fontSize: 8, color: 'var(--t4)', marginTop: 2 }}>
                          {token.frequency} uses
                        </div>
                      )}
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
