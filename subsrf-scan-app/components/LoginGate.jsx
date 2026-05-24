'use client';

import { useEffect, useCallback } from 'react';
import { useUser } from '../context/UserContext';
import { supabase } from '../lib/supabase';

export default function LoginGate({ children }) {
  const { user, loading } = useUser();

  const handleGoogleLogin = useCallback(async () => {
    if (!supabase) {
      alert('Supabase is not configured yet. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
      return;
    }
    
    if (typeof window !== 'undefined' && window.location.search) {
      localStorage.setItem('postLoginParams', window.location.search);
    }

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }, []);

  useEffect(() => {
    if (loading || user) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('autoScan') === '1') {
      handleGoogleLogin();
    }
  }, [loading, user, handleGoogleLogin]);

  if (loading) {
    return (
      <div style={{
        background: '#050508', minHeight: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          fontFamily: "'Azeret Mono', monospace", fontSize: 11,
          color: 'rgba(242,242,244,0.28)', letterSpacing: 2,
        }}>
          AUTHENTICATING…
        </div>
      </div>
    );
  }

  if (user) return children;

  return (
    <div style={{
      background: '#050508',
      color: '#F2F2F4',
      minHeight: '100vh',
      display: 'flex',
      fontFamily: "'Manrope', sans-serif",
      WebkitFontSmoothing: 'antialiased',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Noise overlay */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 50, pointerEvents: 'none', opacity: 0.02,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      }} />

      {/* ── Left panel: hero image ──────────────────────────────────────────── */}
      <section style={{
        display: 'none', position: 'relative', flexDirection: 'column', justifyContent: 'flex-end',
        width: '50%', padding: 48, borderRight: '1px solid rgba(242,242,244,0.12)', overflow: 'hidden',
      }} className="login-left">
        <video
          autoPlay muted loop playsInline
          src="/Hero.mp4"
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', opacity: 0.45, mixBlendMode: 'screen',
          }}
        />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, #050508, rgba(5,5,8,0.8), transparent)',
        }} />
        <div style={{ position: 'relative', zIndex: 10, maxWidth: 540, marginBottom: 64 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 32 }}>
            <div style={{ width: 6, height: 6, background: '#00FF87', boxShadow: '0 0 8px rgba(0,255,135,0.4)' }} />
            <span style={{
              fontFamily: "'Azeret Mono', monospace", fontSize: 11, lineHeight: 1,
              letterSpacing: '0.2em', textTransform: 'uppercase', color: '#00FF87',
            }}>
              Compute Environment Live
            </span>
          </div>
          <h1 style={{
            fontFamily: "'Manrope', sans-serif", fontSize: 52, fontWeight: 800,
            lineHeight: 1.05, letterSpacing: '-2px', color: '#F2F2F4', marginBottom: 16,
          }}>
            What lives beneath any interface.
          </h1>
          <p style={{
            fontFamily: "'Manrope', sans-serif", fontSize: 16, fontWeight: 300,
            lineHeight: 1.8, color: 'rgba(242,242,244,0.55)', maxWidth: 400,
          }}>
            Scan, extract, and pipe computed UI state directly to your developer pipeline.
          </p>
        </div>
      </section>

      {/* ── Right panel: login form ────────────────────────────────────────── */}
      <section style={{
        width: '100%', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center', padding: 48,
        minHeight: '100vh', background: '#050508', position: 'relative',
      }} className="login-right">
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.015,
          backgroundImage: 'linear-gradient(to right, #F2F2F4 1px, transparent 1px), linear-gradient(to bottom, #F2F2F4 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }} />

        <div style={{
          width: '100%', maxWidth: 340, position: 'relative', zIndex: 10,
          display: 'flex', flexDirection: 'column', gap: 64,
        }}>
          {/* Header */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{
              width: 48, height: 48, background: '#111118',
              border: '1px solid rgba(242,242,244,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 16, boxShadow: '0 0 20px rgba(0,255,135,0.06)',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M4 12H20M20 12L14 6M20 12L14 18" stroke="#00FF87" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" />
              </svg>
            </div>
            <span style={{
              fontFamily: "'Azeret Mono', monospace", fontSize: 11, lineHeight: 1,
              letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(242,242,244,0.28)',
            }}>
              Scan.subsrf.dev
            </span>
            <h2 style={{
              fontFamily: "'Manrope', sans-serif", fontSize: 22, fontWeight: 500,
              lineHeight: 1.3, letterSpacing: '-0.3px', color: '#F2F2F4',
            }}>
              Welcome back
            </h2>
          </div>

          {/* Login button */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <button
              onClick={handleGoogleLogin}
              style={{
                width: '100%', background: '#00FF87', color: '#050508',
                fontFamily: "'Azeret Mono', monospace", fontSize: 13, fontWeight: 700,
                lineHeight: 1.8, padding: '14px 32px',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#60ff98'}
              onMouseLeave={e => e.currentTarget.style.background = '#00FF87'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.8 }}>
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#050508" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#050508" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#050508" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#050508" />
              </svg>
              Sign in with Google
            </button>
          </div>

          {/* Footer */}
          <div style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 32,
            marginTop: 48, paddingTop: 32,
            borderTop: '1px solid rgba(242,242,244,0.06)',
          }}>
            <a href="#" style={{
              fontFamily: "'Azeret Mono', monospace", fontSize: 10,
              color: 'rgba(242,242,244,0.28)', letterSpacing: '0.2em', textTransform: 'uppercase',
            }}>Terms</a>
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(242,242,244,0.12)' }} />
            <a href="#" style={{
              fontFamily: "'Azeret Mono', monospace", fontSize: 10,
              color: 'rgba(242,242,244,0.28)', letterSpacing: '0.2em', textTransform: 'uppercase',
            }}>Privacy</a>
          </div>
        </div>
      </section>

      <style>{`
        @media (min-width: 768px) {
          .login-left { display: flex !important; }
          .login-right { width: 50% !important; }
        }
      `}</style>
    </div>
  );
}
