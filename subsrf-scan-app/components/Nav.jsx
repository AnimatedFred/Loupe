'use client';

export default function Nav() {
  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      height: 52, display: 'flex', alignItems: 'center', padding: '0 32px', gap: 32,
      background: 'rgba(5,5,8,0.88)', backdropFilter: 'blur(20px)',
      borderBottom: '1px solid var(--border)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 'auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ display: 'block', height: 2, width: 16, background: 'var(--neon)', borderRadius: 1 }} />
          <span style={{ display: 'block', height: 2, width: 10, background: 'var(--neon)', borderRadius: 1, opacity: 0.4 }} />
        </div>
        <span style={{ fontFamily: "'Azeret Mono', monospace", fontSize: 13, fontWeight: 600, letterSpacing: '-0.5px' }}>
          subsrf scan
        </span>
      </div>

      <span style={{
        fontFamily: "'Azeret Mono', monospace", fontSize: 9, letterSpacing: '1.5px',
        color: 'var(--neon)', background: 'var(--neon-dim)', border: '1px solid rgba(0,255,135,0.2)',
        borderRadius: 3, padding: '2px 8px', textTransform: 'uppercase',
      }}>beta</span>

      <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
        {['Docs', 'Pricing', 'Sign in'].map(l => (
          <a key={l} href="#" style={{
            fontFamily: "'Azeret Mono', monospace", fontSize: 10, letterSpacing: 1,
            textTransform: 'uppercase', color: 'var(--t3)', transition: 'color 0.15s',
          }}
            onMouseEnter={e => e.target.style.color = 'var(--t1)'}
            onMouseLeave={e => e.target.style.color = 'var(--t3)'}
          >{l}</a>
        ))}
      </div>

      <button style={{
        fontFamily: "'Azeret Mono', monospace", fontSize: 11, fontWeight: 500,
        background: 'var(--neon)', color: 'var(--void)', border: 'none', borderRadius: 5,
        padding: '7px 16px', transition: 'opacity 0.15s',
      }}>Get started</button>
    </nav>
  );
}
