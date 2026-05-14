'use client';

import { useUser } from '../context/UserContext';

const TIER_COLORS = {
  pro:     { bg: 'rgba(0,255,135,0.10)',   color: '#00FF87', border: 'rgba(0,255,135,0.2)' },
  starter: { bg: 'rgba(255,171,0,0.08)',   color: '#FFAB00', border: 'rgba(255,171,0,0.25)' },
  free:    { bg: 'rgba(255,255,255,0.05)', color: 'rgba(242,242,244,0.28)', border: 'rgba(242,242,244,0.08)' },
};

const MAX_CREDITS = { pro: 300, starter: 75, free: 0 };

export default function Nav() {
  const { user, tier, credits, signOut } = useUser() || {};
  const tierStyle = TIER_COLORS[tier] || TIER_COLORS.free;
  const maxCr = MAX_CREDITS[tier] || 0;

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      height: 52, display: 'flex', alignItems: 'center', padding: '0 32px', gap: 24,
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

      {user ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Tier badge */}
          <span style={{
            fontFamily: "'Azeret Mono', monospace", fontSize: 9, letterSpacing: '1.5px',
            color: tierStyle.color, background: tierStyle.bg,
            border: `1px solid ${tierStyle.border}`,
            borderRadius: 3, padding: '2px 8px', textTransform: 'uppercase',
          }}>
            {tier}
          </span>

          {/* Credits — bolt icon + pill */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--deep)', border: '1px solid var(--border)',
            borderRadius: 4, padding: '4px 10px',
          }} title="AI credits available">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="var(--neon)" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
              <path d="M13 2L3 14h8l-1 8 11-12h-8l1-8z"/>
            </svg>
            <span style={{ fontFamily: "'Azeret Mono', monospace", fontSize: 11, color: 'var(--t1)' }}>
              {credits ?? 0}
              {maxCr > 0 && (
                <span style={{ color: 'var(--t3)' }}> / {maxCr}</span>
              )}
              {' '}<span style={{ color: 'var(--t3)' }}>CR</span>
            </span>
          </div>

          {/* Sign out */}
          <button
            onClick={signOut}
            style={{
              fontFamily: "'Azeret Mono', monospace", fontSize: 10, letterSpacing: 1,
              textTransform: 'uppercase', color: 'var(--t3)', background: 'none',
              border: 'none', cursor: 'pointer', padding: 0, transition: 'color 0.15s',
            }}
            onMouseEnter={e => e.target.style.color = 'var(--t1)'}
            onMouseLeave={e => e.target.style.color = 'var(--t3)'}
          >
            Sign out
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          {['Docs', 'Pricing'].map(l => (
            <a key={l} href="#" style={{
              fontFamily: "'Azeret Mono', monospace", fontSize: 10, letterSpacing: 1,
              textTransform: 'uppercase', color: 'var(--t3)', transition: 'color 0.15s',
            }}
              onMouseEnter={e => e.target.style.color = 'var(--t1)'}
              onMouseLeave={e => e.target.style.color = 'var(--t3)'}
            >{l}</a>
          ))}
        </div>
      )}
    </nav>
  );
}
