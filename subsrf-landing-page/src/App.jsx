import React, { useState, useEffect } from 'react'
import { supabase } from './supabase'
import ExtensionPage from './ExtensionPage'
import PluginPage from './PluginPage'
import PricingPage from './PricingPage'
import DocsPage from './DocsPage'

// ── Auth helpers ──────────────────────────────────────────────────────────────

async function fetchTier(userId) {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('tier')
      .eq('id', userId)
      .single()
    return data?.tier || 'free'
  } catch {
    return 'free'
  }
}

// ── Brand components ──────────────────────────────────────────────────────────

export function LogoMark({ size = 28 }) {
  return (
    <img src="/subsrf-icon.png" width={size} height={size} alt="Subsrf" style={{ borderRadius: size * 0.22, display: 'block', flexShrink: 0 }} />
  )
}

export function Wordmark({ size = 18 }) {
  return (
    <span style={{ fontSize: size, fontWeight: 700, fontFamily: "'Azeret Mono', monospace", letterSpacing: '-0.02em', color: 'var(--t1)' }}>
      subsrf
    </span>
  )
}

function highlightJson(obj) {
  const json = JSON.stringify(obj, null, 2)
  const esc = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return esc.replace(
    /("(?:\\u[0-9a-fA-F]{4}|\\[^u]|[^\\"])*"(?:\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    m => /^"/.test(m) && /:$/.test(m)
      ? `<span style="color:#00FF87">${m}</span>`
      : `<span style="color:#F2F2F4">${m}</span>`
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

export function TopNavBar({ onLogin, loading, session, tier, onLogout }) {
  const scrollToGetStarted = (e) => {
    e.preventDefault();
    if (window.location.hash === '#extension') {
      window.location.hash = '';
      setTimeout(() => {
        document.getElementById('get-started')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      document.getElementById('get-started')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="fixed top-0 w-full z-50 border-b border-white-border flat no shadows bg-void" style={{ backgroundColor: '#050508' }}>
      <div className="flex justify-between items-center max-w-[1080px] mx-auto px-lg h-16">
        <a href="#" className="flex items-center gap-xs hover:opacity-80 transition-opacity">
          <LogoMark size={28} />
          <Wordmark size={18} />
        </a>
        <nav className="hidden md:flex gap-lg">
          <a className="text-white-secondary font-light font-body text-body hover:text-neon transition-colors duration-200 active:scale-95 transition-transform" href="#plugin">Plugin</a>
          <a className="text-white-secondary font-light font-body text-body hover:text-neon transition-colors duration-200 active:scale-95 transition-transform" href="#extension">Extension</a>
          <a className="text-white-secondary font-light font-body text-body hover:text-neon transition-colors duration-200 active:scale-95 transition-transform" href="#pricing">Pricing</a>
          <a className="text-white-secondary font-light font-body text-body hover:text-neon transition-colors duration-200 active:scale-95 transition-transform" href="#docs">Docs</a>
        </nav>
        <div className="flex gap-md">
          {session ? (
            <div className="flex items-center gap-lg">
              <div className="flex items-center gap-md">
                <div className="w-8 h-8 rounded-full bg-deep border border-white-border flex items-center justify-center overflow-hidden">
                  {session.user?.user_metadata?.avatar_url ? (
                    <img src={session.user.user_metadata.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="material-symbols-outlined text-white-secondary text-[18px]" data-icon="person">person</span>
                  )}
                </div>
                <div className="flex flex-col items-start">
                  <div className="flex items-center gap-sm">
                    <span className="font-mono-data text-xs text-white-secondary">{session.user.email}</span>
                    <span className={`px-1.5 py-0.5 border rounded-sm font-label-caps text-[9px] flex items-center gap-1 ${tier === 'pro' ? 'border-neon/30 text-neon' : 'border-white-border text-white-muted'}`}>
                      <span className={`w-1 h-1 rounded-full ${tier === 'pro' ? 'bg-neon' : 'bg-white-muted'}`}></span> {tier === 'pro' ? 'PRO' : 'FREE'}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={onLogout} className="px-md py-sm rounded-DEFAULT border border-white-border text-white-primary hover:bg-white-border transition-all font-body text-body text-sm active:scale-95">Sign Out</button>
            </div>
          ) : (
            <>
              <button className="bg-transparent border border-white-border text-white-primary px-md py-sm rounded-DEFAULT font-label-caps text-label-caps hover:border-neon transition-colors active:scale-95 flex items-center justify-center gap-sm" onClick={onLogin} disabled={loading}>
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="currentColor"></path>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="currentColor"></path>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="currentColor"></path>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="currentColor"></path>
                </svg>
                {loading ? 'Wait...' : 'Login with Google'}
              </button>
              <button className="bg-neon text-void px-md py-sm rounded-DEFAULT font-label-caps text-label-caps hover:opacity-90 transition-opacity active:scale-95" onClick={scrollToGetStarted}>
                Get Started
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="bg-void dark:bg-void w-full py-xl border-t border-white-border flat no shadows mt-auto">
      <div className="flex flex-col md:flex-row justify-between items-center max-w-[1080px] mx-auto px-lg gap-md">
        <div className="font-label-caps text-label-caps text-white-muted">
          subsrf
        </div>
        <div className="flex gap-md font-mono-data text-mono-data text-white-muted">
          <a className="hover:text-white-primary transition-colors opacity-80 hover:opacity-100" href="/terms.html">Terms</a>
          <a className="hover:text-white-primary transition-colors opacity-80 hover:opacity-100" href="/privacy.html">Privacy</a>
        </div>
        <div className="font-mono-data text-mono-data text-neon dark:text-neon text-[10px]">
          © 2026 SUBSRF INFRASTRUCTURE. ALL RIGHTS RESERVED.
        </div>
      </div>
    </footer>
  );
}

function LandingPage({ onLogin, loading, session, tier, onLogout }) {
  const scrollToGetStarted = (e) => {
    e.preventDefault();
    document.getElementById('get-started')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <TopNavBar onLogin={onLogin} loading={loading} session={session} tier={tier} onLogout={onLogout} />

      {/* Hero Section - Fullscreen Background */}
      <section className="relative w-full h-screen overflow-hidden flex flex-col items-center justify-center text-center px-lg pt-32">
        <video 
          autoPlay 
          loop 
          muted 
          playsInline 
          className="absolute inset-0 w-full h-full object-cover z-0 opacity-60 pointer-events-none"
        >
          <source src="/Hero.mp4" type="video/mp4" />
        </video>
        {/* Cinematic gradient overlay for depth and legibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-void/60 via-void/40 to-void z-[1] pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col items-center gap-lg max-w-[1080px] mx-auto">
          <h1 className="font-display-xl text-display-xl text-white-primary max-w-4xl tracking-tighter">
            What lives beneath any interface.
          </h1>
          <p className="font-subheading text-subheading text-white-secondary max-w-2xl">
            Subsrf reads computed state, extracts semantic structure, and pipes raw UI data directly to AI agents and Figma layers. Technical precision for the web's subsurface.
          </p>
          <div className="flex gap-md mt-md">
            <button className="bg-neon text-void px-lg py-md rounded-DEFAULT font-label-caps text-label-caps hover:opacity-90 transition-opacity active:scale-95" onClick={scrollToGetStarted}>Get Started</button>
            <button className="bg-transparent border border-white-border text-white-primary px-lg py-md rounded-DEFAULT font-label-caps text-label-caps hover:border-neon transition-colors active:scale-95 flex items-center gap-xs">
              <span className="material-symbols-outlined text-[16px]">play_arrow</span>
              Watch Demo
            </button>
          </div>
        </div>
      </section>

      {/* Main Canvas */}
      <main className="flex-grow pb-4xl flex flex-col items-center w-full px-lg max-w-[1080px] mx-auto gap-4xl">

        {/* Stats / Social Proof */}
        <section className="w-full flex flex-col items-center gap-md">
          <div className="w-full max-w-[1080px] aspect-video bg-deep border border-white-border rounded-lg relative overflow-hidden group shadow-[0_0_30px_rgba(0,255,135,0.05)]">
            {/* Subtle Neon Glow Overlay */}
            <div className="absolute inset-0 border border-neon/20 pointer-events-none group-hover:border-neon/40 transition-colors duration-500 rounded-lg"></div>
            {/* Center Play Button */}
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <button className="w-20 h-20 bg-neon/10 backdrop-blur-sm border border-neon/30 rounded-full flex items-center justify-center text-neon group-hover:scale-110 transition-transform duration-300 shadow-[0_0_20px_rgba(0,255,135,0.2)]">
                <span className="material-symbols-outlined text-[40px] leading-none fill-1">play_arrow</span>
              </button>
            </div>
            {/* Video Content Placeholder (Dark Gradient) */}
            <div className="w-full h-full bg-gradient-to-br from-void via-surface-container-low to-void opacity-60"></div>
          </div>
          {/* Caption */}
          <div className="font-mono-data text-label-caps text-neon/60 tracking-widest flex items-center gap-sm uppercase">
            <span className="w-1.5 h-1.5 bg-neon rounded-full animate-pulse"></span>
            SUBSURF_STUDIO_DEMO.MP4
          </div>
        </section>

        {/* Features Bento Grid */}
        <section className="w-full flex flex-col gap-2xl">
          <div className="text-center">
            <h2 className="font-heading-md text-heading-md text-white-primary">Capture Mechanisms</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
            {/* Feature Card 1 */}
            <div className="bg-layer border border-white-border p-lg rounded-DEFAULT flex flex-col gap-md relative overflow-hidden">
              <div className="flex items-center gap-sm mb-md">
                <div className="w-2 h-2 bg-neon rounded-full"></div>
                <span className="font-label-caps text-label-caps text-neon uppercase">Plugin</span>
              </div>
              <h3 className="font-heading-sm text-heading-sm text-white-primary">Figma Synchronization</h3>
              <p className="font-body text-body text-white-secondary">
                Captures exact UI data, including deeply nested computed styles, and synchronizes them directly to Figma layers. Preserves exact dimensional and typographic fidelity without manual transcription.
              </p>
              <div className="mt-auto pt-lg">
                <div className="bg-deep border border-white-border p-md rounded-DEFAULT font-mono-data text-mono-data text-white-secondary text-sm overflow-x-auto">
                  <span className="text-neon">const</span> node = figma.currentPage.selection[0];<br/>
                  <span className="text-neon">await</span> subsrf.sync(node, {'{'} computed: true {'}'});
                </div>
              </div>
            </div>

            {/* Feature Card 2 */}
            <div className="bg-layer border border-white-border p-lg rounded-DEFAULT flex flex-col gap-md relative overflow-hidden">
              <div className="flex items-center gap-sm mb-md">
                <div className="w-2 h-2 bg-status-warn rounded-full"></div>
                <span className="font-label-caps text-label-caps text-status-warn uppercase">Extension</span>
              </div>
              <h3 className="font-heading-sm text-heading-sm text-white-primary">Browser Extraction</h3>
              <p className="font-body text-body text-white-secondary">Install the Subsrf extraction tool to begin capturing site metadata.</p>
              <div className="mt-auto pt-lg">
                <div className="bg-deep border border-white-border p-md rounded-DEFAULT font-mono-data text-mono-data text-white-secondary text-sm overflow-x-auto">
                  &gt; subsrf capture --target "div.hero-container"<br/>
                  [SUCCESS] 42 computed properties extracted.
                </div>
              </div>
              <button className="mt-4 w-full bg-white-border border border-white-border text-white-primary px-md py-sm rounded-DEFAULT font-label-caps text-[11px] hover:border-neon transition-all active:scale-95">Download Extension</button>
            </div>
          </div>
        </section>

        {/* ── Subsrf Tokens Section ── */}
        <section className="w-full flex flex-col gap-2xl">
          <div className="flex flex-col items-center text-center gap-md">
            <div className="flex items-center gap-sm">
              <span className="w-1.5 h-1.5 bg-neon rounded-full animate-pulse"></span>
              <span className="font-label-caps text-label-caps text-neon uppercase tracking-widest">New · scan.subsrf.dev</span>
            </div>
            <h2 className="font-heading-md text-heading-md text-white-primary">Extract any design system</h2>
            <p className="font-body text-body text-white-secondary max-w-xl">
              Every live website runs on a design system. Subsrf Scan reads the computed CSS of any URL and surfaces it as clean, exportable tokens — colors, typography, spacing, shadows, and radii.
            </p>
          </div>

          {/* App preview card */}
          <div className="w-full border border-white-border rounded-lg overflow-hidden">

            {/* URL bar */}
            <div className="flex items-center border-b border-white-border bg-layer">
              <span className="font-mono-data text-mono-data text-white-muted px-md py-md border-r border-white-border shrink-0">https://</span>
              <span className="font-mono-data text-mono-data text-white-primary flex-1 px-md py-md">stripe.com</span>
              <div className="flex items-center gap-md px-md shrink-0">
                <span className="font-label-caps text-[9px] text-neon bg-neon/10 border border-neon/20 px-sm py-xs rounded-DEFAULT hidden sm:block">LIVE EXTRACTION</span>
                <span className="font-mono-data text-[10px] text-white-muted">1.4s · 52 tokens</span>
              </div>
            </div>

            {/* Two-panel layout */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_260px]">

              {/* Token panel */}
              <div className="p-lg border-b md:border-b-0 md:border-r border-white-border">
                {/* Category tabs */}
                <div className="flex flex-wrap gap-xs mb-lg">
                  {[
                    { label: 'Colors',     color: '#00FF87', active: true },
                    { label: 'Typography', color: '#818cf8' },
                    { label: 'Spacing',    color: '#38bdf8' },
                    { label: 'Radius',     color: '#fb923c' },
                    { label: 'Shadows',    color: '#e879f9' },
                  ].map(cat => (
                    <span key={cat.label} className={`font-label-caps text-[9px] px-sm py-xs rounded-DEFAULT border cursor-default flex items-center gap-xs ${cat.active ? 'bg-neon/10 border-neon/20 text-neon' : 'border-white-border text-white-muted'}`}>
                      <span className="w-1 h-1 rounded-full shrink-0" style={{ background: cat.color }}></span>
                      {cat.label}
                    </span>
                  ))}
                </div>

                {/* Color swatches */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-sm">
                  {[
                    { name: 'text-primary', value: '#F2F2F4', bg: '#F2F2F4' },
                    { name: 'bg-void',      value: '#050508', bg: '#050508', dim: true },
                    { name: 'bg-surface',   value: '#111118', bg: '#111118' },
                    { name: 'accent',       value: '#00FF87', bg: '#00FF87', glow: true },
                    { name: 'success',      value: '#39D98A', bg: '#39D98A' },
                    { name: 'error',        value: '#FF4D4D', bg: '#FF4D4D' },
                  ].map(s => (
                    <div key={s.name} className="border border-white-border rounded-DEFAULT overflow-hidden">
                      <div className="h-10" style={{
                        background: s.bg,
                        boxShadow: s.glow ? '0 0 16px rgba(0,255,135,0.35)' : undefined,
                        borderBottom: s.dim ? '1px solid rgba(255,255,255,0.06)' : undefined,
                      }}></div>
                      <div className="px-xs py-xs bg-surface">
                        <div className="font-mono-data text-[8px] text-white-secondary truncate">{s.name}</div>
                        <div className="font-mono-data text-[8px] text-white-muted truncate">{s.value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Export panel */}
              <div className="p-lg flex flex-col gap-md">
                <span className="font-label-caps text-[9px] text-white-muted uppercase tracking-widest">Export format</span>
                <div className="flex flex-col gap-xs">
                  {[
                    { abbr: 'CSS', label: 'CSS Variables',    active: true },
                    { abbr: 'TW',  label: 'Tailwind Config' },
                    { abbr: '{}',  label: 'JSON' },
                    { abbr: 'Fig', label: 'Figma Variables' },
                    { abbr: 'AI',  label: 'AI Prompt', badge: '1 credit' },
                  ].map(f => (
                    <div key={f.abbr} className={`flex items-center gap-sm px-sm py-xs rounded-DEFAULT border cursor-default ${f.active ? 'bg-neon/10 border-neon/20' : 'border-white-border'}`}>
                      <span className={`font-mono-data text-[9px] w-6 text-center shrink-0 ${f.active ? 'text-neon' : 'text-white-muted'}`}>{f.abbr}</span>
                      <span className={`font-body text-[11px] flex-1 ${f.active ? 'text-neon' : 'text-white-secondary'}`}>{f.label}</span>
                      {f.badge && <span className="font-mono-data text-[8px] text-white-muted border border-white-border px-xs rounded-DEFAULT">{f.badge}</span>}
                    </div>
                  ))}
                </div>

                {/* Code preview */}
                <div className="bg-void border border-white-border rounded-DEFAULT overflow-hidden">
                  <div className="flex items-center justify-between px-sm py-xs border-b border-white-border">
                    <span className="font-label-caps text-[8px] text-white-muted">CSS</span>
                    <span className="font-mono-data text-[8px] text-neon opacity-60">⎘ copy</span>
                  </div>
                  <pre className="px-sm py-sm font-mono-data text-[9px] leading-relaxed text-white-secondary overflow-x-auto">{`:root {
  --color-accent: #00FF87;
  --color-text:   #F2F2F4;
  --color-bg:     #050508;
  --space-4:      16px;
  --radius-md:    8px;
}`}</pre>
                </div>
              </div>
            </div>
          </div>

          {/* Value prop cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
            <div className="bg-layer border border-white-border p-lg rounded-DEFAULT flex flex-col gap-sm">
              <div className="flex items-center gap-sm">
                <div className="w-2 h-2 bg-neon rounded-full"></div>
                <span className="font-label-caps text-label-caps text-neon uppercase">Any URL</span>
              </div>
              <h3 className="font-heading-sm text-[18px] text-white-primary">No source access required</h3>
              <p className="font-body text-[14px] text-white-secondary">Point at any public URL — your own site, a competitor's, or a reference. Works on any page you can open in a browser.</p>
            </div>
            <div className="bg-layer border border-white-border p-lg rounded-DEFAULT flex flex-col gap-sm">
              <div className="flex items-center gap-sm">
                <div className="w-2 h-2 rounded-full" style={{ background: '#818cf8' }}></div>
                <span className="font-label-caps text-label-caps uppercase" style={{ color: '#818cf8' }}>All formats</span>
              </div>
              <h3 className="font-heading-sm text-[18px] text-white-primary">Export anywhere</h3>
              <p className="font-body text-[14px] text-white-secondary">CSS custom properties, Tailwind config, Style Dictionary, Figma Variables, or a structured AI prompt. One extraction, every format.</p>
            </div>
            <div className="bg-layer border border-white-border p-lg rounded-DEFAULT flex flex-col gap-sm">
              <div className="flex items-center gap-sm">
                <div className="w-2 h-2 rounded-full" style={{ background: '#38bdf8' }}></div>
                <span className="font-label-caps text-label-caps uppercase" style={{ color: '#38bdf8' }}>Pro · MCP Tool</span>
              </div>
              <h3 className="font-heading-sm text-[18px] text-white-primary">Claude reads tokens directly</h3>
              <p className="font-body text-[14px] text-white-secondary">The <code className="font-mono-data text-[11px] text-neon">subsrf_extract_tokens</code> MCP tool lets Claude and Cursor fetch any site's token set and apply it to code — no copy-paste.</p>
            </div>
          </div>

          <div className="flex justify-center">
            <a href="https://scan.subsrf.dev" target="_blank" rel="noopener noreferrer"
              className="bg-neon text-void px-lg py-md rounded-DEFAULT font-label-caps text-label-caps hover:opacity-90 transition-opacity active:scale-95">
              Try Subsrf Scan →
            </a>
          </div>
        </section>

        {/* Pricing Tier */}
        <section id="get-started" className="w-full flex flex-col gap-2xl">
          <div className="text-center flex flex-col gap-xs">
            <span className="font-label-caps text-label-caps text-neon uppercase tracking-widest">Integration Flow</span>
            <h2 className="font-display-lg text-display-lg text-white-primary">Get Started</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md">
            {/* Step 1 */}
            <div className="bg-layer border border-white-border p-lg rounded-DEFAULT flex flex-col gap-md">
              <span className="font-mono-data text-neon text-lg">01</span>
              <h3 className="font-heading-sm text-[20px] text-white-primary">Create account and login</h3>
              <p className="font-body text-sm text-white-secondary">Sign up to begin capturing UI metadata.</p>
              <button onClick={onLogin} disabled={loading} className="mt-4 flex items-center justify-center gap-sm bg-transparent border border-white-border text-white-primary px-md py-sm rounded-DEFAULT font-label-caps text-label-caps hover:border-neon transition-colors">
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="currentColor"></path>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="currentColor"></path>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="currentColor"></path>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="currentColor"></path>
                </svg>
                {loading ? 'Wait...' : 'Login with Google'}
              </button>
            </div>
            {/* Step 2 */}
            <div className="bg-layer border border-white-border p-lg rounded-DEFAULT flex flex-col gap-md">
              <span className="font-mono-data text-neon text-lg">02</span>
              <h3 className="font-heading-sm text-[20px] text-white-primary">Download extension</h3>
              <p className="font-body text-sm text-white-secondary">For individual developers and designers who want AI-powered analysis.</p>
            </div>
            {/* Step 3 */}
            <div className="bg-layer border border-white-border p-lg rounded-DEFAULT flex flex-col gap-md">
              <span className="font-mono-data text-neon text-lg">03</span>
              <h3 className="font-heading-sm text-[20px] text-white-primary">Figma Plugin</h3>
              <p className="font-body text-sm text-white-secondary">For power users and teams who need the full AI-to-canvas pipeline.</p>
              <span className="font-mono-data text-[10px] text-white-muted">*Only available on paid plans</span>
            </div>
            {/* Step 4 */}
            <div className="bg-layer border border-white-border p-lg rounded-DEFAULT flex flex-col gap-md">
              <span className="font-mono-data text-neon text-lg">04</span>
              <h3 className="font-heading-sm text-[20px] text-white-primary">Connect Infrastructure</h3>
              <p className="font-body text-sm text-white-secondary">Add Figma Rest API and MCP server to Claude or Gemini.</p>
            </div>
          </div>
        </section>

        <section className="w-full flex flex-col gap-2xl pt-2xl">
          <div className="text-center">
            <h2 className="font-heading-md text-heading-md text-white-primary">Infrastructure Pricing</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
            {/* Tier 1 */}
            <div className="bg-layer border border-white-border p-lg rounded-DEFAULT flex flex-col gap-lg">
              <div>
                <div className="font-label-caps text-label-caps text-white-muted uppercase mb-xs">Free</div>
                <div className="font-heading-sm text-heading-sm text-white-primary">$0<span className="font-body text-body text-white-secondary font-light">/mo</span></div>
              </div>
              <p className="font-body text-body text-white-secondary border-b border-white-border pb-md">
                Basic element capture for individual developers.
              </p>
              <ul className="flex flex-col gap-sm font-mono-data text-mono-data text-white-secondary">
                <li className="flex items-center gap-sm"><span className="material-symbols-outlined text-neon text-[16px]">check</span> Smart Click &amp; Region Tool</li>
                <li className="flex items-center gap-sm"><span className="material-symbols-outlined text-neon text-[16px]">check</span> Raw UI Brief (Prompt Mode)</li>
                <li className="flex items-center gap-sm"><span className="material-symbols-outlined text-neon text-[16px]">check</span> CSS Export Mode</li>
                <li className="flex items-center gap-sm"><span className="material-symbols-outlined text-neon text-[16px]">check</span> Figma Sync (5 elements max)</li>
              </ul>
              <button className="mt-auto bg-transparent border border-white-border text-white-primary w-full py-sm rounded-DEFAULT font-label-caps text-label-caps hover:bg-white-border transition-colors" onClick={session ? () => window.location.hash = '#dashboard' : onLogin}>
                {!session ? 'Select Free' : tier === 'free' ? 'Current Plan' : 'Downgrade'}
              </button>
            </div>
            {/* Tier 2 (Active/Neon) */}
            <div className="bg-layer border border-neon shadow-[0_0_15px_rgba(0,255,135,0.1)] p-lg rounded-DEFAULT flex flex-col gap-lg relative transform scale-105 z-10">
              <div className="absolute top-0 right-0 bg-neon text-void px-sm py-xs font-label-caps text-[10px] rounded-bl-DEFAULT">RECOMMENDED</div>
              <div>
                <div className="font-label-caps text-label-caps text-neon uppercase mb-xs">Starter</div>
                <div className="font-heading-sm text-heading-sm text-white-primary">$9<span className="font-body text-body text-white-secondary font-light">/mo</span></div>
              </div>
              <p className="font-body text-body text-white-secondary border-b border-white-border pb-md">
                Essential tooling for consistent UI data pipelines.
              </p>
              <ul className="flex flex-col gap-sm font-mono-data text-mono-data text-white-primary">
                <li className="flex items-center gap-sm"><span className="material-symbols-outlined text-neon text-[16px]">check</span> Everything in Free</li>
                <li className="flex items-center gap-sm"><span className="material-symbols-outlined text-neon text-[16px]">check</span> Subsrf Studio Editor</li>
                <li className="flex items-center gap-sm"><span className="material-symbols-outlined text-neon text-[16px]">check</span> AI Analysis (Build Prompt, Audit)</li>
                <li className="flex items-center gap-sm"><span className="material-symbols-outlined text-neon text-[16px]">check</span> 75 Credits / month</li>
                <li className="flex items-center gap-sm"><span className="material-symbols-outlined text-neon text-[16px]">check</span> Unlimited Figma Sync</li>
              </ul>
              <button className="mt-auto bg-neon text-void w-full py-sm rounded-DEFAULT font-label-caps text-label-caps hover:opacity-90 transition-opacity" onClick={session ? () => window.location.hash = '#dashboard' : onLogin}>
                {!session ? 'Select Starter' : tier === 'starter' ? 'Current Plan' : tier === 'free' ? 'Get Starter' : 'Downgrade'}
              </button>
            </div>
            {/* Tier 3 */}
            <div className="bg-layer border border-white-border p-lg rounded-DEFAULT flex flex-col gap-lg">
              <div>
                <div className="font-label-caps text-label-caps text-white-muted uppercase mb-xs">Pro</div>
                <div className="font-heading-sm text-heading-sm text-white-primary">$19<span className="font-body text-body text-white-secondary font-light">/mo</span></div>
              </div>
              <p className="font-body text-body text-white-secondary border-b border-white-border pb-md">
                Unrestricted access for professional teams.
              </p>
              <ul className="flex flex-col gap-sm font-mono-data text-mono-data text-white-secondary">
                <li className="flex items-center gap-sm"><span className="material-symbols-outlined text-neon text-[16px]">check</span> Everything in Starter</li>
                <li className="flex items-center gap-sm"><span className="material-symbols-outlined text-neon text-[16px]">check</span> Full MCP Bridge Integration</li>
                <li className="flex items-center gap-sm"><span className="material-symbols-outlined text-neon text-[16px]">check</span> Claude ↔ Figma Live Control</li>
                <li className="flex items-center gap-sm"><span className="material-symbols-outlined text-neon text-[16px]">check</span> 300 Credits / month</li>
                <li className="flex items-center gap-sm"><span className="material-symbols-outlined text-neon text-[16px]">check</span> Unlimited Full Page Capture</li>
              </ul>
              <button className="mt-auto bg-transparent border border-white-border text-white-primary w-full py-sm rounded-DEFAULT font-label-caps text-label-caps hover:bg-white-border transition-colors" onClick={session ? () => window.location.hash = '#dashboard' : onLogin}>
                {!session ? 'Select Pro' : tier === 'pro' ? 'Current Plan' : tier === 'starter' ? 'Upgrade to Pro' : 'Get Pro'}
              </button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}

function Dashboard({ session, tier, onLogout, paymentStatus, onTierRefresh }) {
  const [tab, setTab] = useState('mcp')
  const [copied, setCopied] = useState(false)
  const [figmaPat, setFigmaPat] = useState('')
  const [patInput, setPatInput] = useState('')
  const [showPatInput, setShowPatInput] = useState(false)
  const [patSaving, setPatSaving] = useState(false)
  const [patStatus, setPatStatus] = useState(null) // 'saved' | 'error' | null
  const [upgrading, setUpgrading] = useState(null) // null | 'starter' | 'pro'
  const [upgradeError, setUpgradeError] = useState(null)
  const [portalLoading, setPortalLoading] = useState(false)

  const isPro = tier === 'pro'
  const user = session.user
  const displayName = user.user_metadata?.full_name || user.email
  const avatar = user.user_metadata?.avatar_url
  const initial = displayName?.[0]?.toUpperCase() || '?'

  const [hasStripeBilling, setHasStripeBilling] = useState(false)
  const [credits, setCredits] = useState(0)

  useEffect(() => {
    supabase
      .from('profiles')
      .select('figma_pat, stripe_customer_id, credits')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.figma_pat) setFigmaPat(data.figma_pat)
        setHasStripeBilling(!!data?.stripe_customer_id)
        if (typeof data?.credits === 'number') setCredits(data.credits)
      })
  }, [user.id])

  useEffect(() => {
    if (paymentStatus === 'success') {
      const t = setTimeout(() => onTierRefresh?.(), 1500)
      return () => clearTimeout(t)
    }
  }, [paymentStatus])

  const handleManageBilling = async () => {
    setPortalLoading(true)
    try {
      const res = await fetch('https://api.subsrf.dev/api/stripe/create-portal-session', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to open billing portal')
      window.location.href = data.url
    } catch (e) {
      setUpgradeError(e.message)
      setPortalLoading(false)
    }
  }

  const handleUpgrade = async (planTier) => {
    setUpgrading(planTier)
    setUpgradeError(null)
    try {
      const res = await fetch('https://api.subsrf.dev/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: planTier }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to start checkout')
      window.location.href = data.url
    } catch (e) {
      setUpgradeError(e.message)
      setUpgrading(null)
    }
  }

  const mcpConfig = figmaPat
    ? { mcpServers: { subsrf: { command: 'npx', args: ['-y', 'subsrf-intelligence', '--endpoint', 'https://api.subsrf.dev'], env: { FIGMA_PAT: figmaPat } } } }
    : { mcpServers: { subsrf: { command: 'npx', args: ['-y', 'subsrf-intelligence', '--endpoint', 'https://api.subsrf.dev'] } } }

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(mcpConfig, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const savePat = async () => {
    const token = patInput.trim()
    if (!token) return
    setPatSaving(true)
    setPatStatus(null)
    const { error } = await supabase
      .from('profiles')
      .update({ figma_pat: token })
      .eq('id', user.id)
    setPatSaving(false)
    if (error) {
      setPatStatus('error')
    } else {
      setFigmaPat(token)
      setPatInput('')
      setShowPatInput(false)
      setPatStatus('saved')
      setTimeout(() => setPatStatus(null), 4000)
    }
  }

  const navItems = [
    { id: 'mcp', label: 'MCP Settings', icon: '⚡' },
    { id: 'account', label: 'Account', icon: '👤' },
    { id: 'upgrade', label: 'Upgrade to Pro', icon: '💎' },
  ]

  return (
    <>
      <div className="fixed inset-0 pointer-events-none z-[-1] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-surface-container-low/20 via-void to-void"></div>
      <TopNavBar session={session} tier={tier} onLogout={onLogout} />

      {/* Main Content Canvas */}
      <main className="flex-grow pt-[100px] pb-3xl px-lg w-full max-w-[1080px] mx-auto flex flex-col gap-xl">
        {/* Header Section */}
        <header className="flex flex-col gap-sm border-b border-white-border pb-lg">
          <h1 className="font-heading-md text-heading-md text-white-primary tracking-tight">Dashboard</h1>
          <p className="font-mono-data text-mono-data text-white-secondary">USER_ID: {user.id.slice(0,18).toUpperCase()} | SESSION_ACTIVE</p>
        </header>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-lg">
          {/* Profile Summary (Spans 4 columns) */}
          <div className="md:col-span-4 bg-layer border border-white-border rounded-lg p-lg flex flex-col gap-md relative overflow-hidden group">
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0),rgba(255,255,255,0)_50%,rgba(0,0,0,0.1)_50%,rgba(0,0,0,0.1))] bg-[length:100%_4px] opacity-20 pointer-events-none"></div>
            <div className="flex items-center gap-md relative z-10">
              <div className="w-12 h-12 rounded-full bg-deep border border-white-border flex items-center justify-center overflow-hidden">
                {avatar ? (
                  <img src={avatar} className="w-full h-full object-cover" alt="" />
                ) : (
                  <span className="material-symbols-outlined text-white-secondary" data-icon="person">person</span>
                )}
              </div>
              <div>
                <h2 className="font-subheading text-subheading text-white-primary truncate max-w-[180px]">{displayName}</h2>
                <p className="font-mono-data text-[11px] text-white-secondary truncate max-w-[180px]">{user.email}</p>
              </div>
            </div>
            <div className="mt-auto pt-md border-t border-white-border flex justify-between items-center relative z-10">
              <span className="font-label-caps text-label-caps text-white-muted">AUTH_PROVIDER</span>
              <span className="font-mono-data text-mono-data text-white-primary flex items-center gap-sm">
                <span className="w-2 h-2 rounded-full bg-status-ok"></span> Google
              </span>
            </div>
          </div>

          {/* Tier Management (Spans 4 columns) */}
          <div className="md:col-span-4 bg-layer border border-white-border rounded-lg p-lg flex flex-col gap-md relative">
            <div className="flex justify-between items-start">
              <span className="font-label-caps text-label-caps text-white-muted">CURRENT PLAN</span>
              <span className={`px-sm py-xs border rounded DEFAULT font-mono-data text-mono-data flex items-center gap-sm ${isPro ? 'border-neon/30 text-neon' : 'border-white-border text-white-muted'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isPro ? 'bg-neon' : 'bg-white-muted'}`}></span> {isPro ? 'PRO' : 'FREE'}
              </span>
            </div>
            <div>
              <h2 className="font-heading-sm text-heading-sm text-white-primary">{isPro ? 'Pro Tier' : 'Free Tier'}</h2>
              <p className="font-mono-data text-mono-data text-white-secondary mt-sm">
                {isPro ? 'Unlimited deep scans & full API access.' : 'Basic element capture for individual developers.'}
              </p>
            </div>
            <div className="mt-auto pt-md flex gap-sm">
              <button 
                className="flex-1 py-sm rounded-DEFAULT bg-transparent border border-white-border text-white-primary hover:bg-white-border transition-colors font-body text-body"
                onClick={handleManageBilling}
                disabled={portalLoading || !hasStripeBilling}
              >
                {portalLoading ? 'Wait...' : 'Manage'}
              </button>
              {isPro ? (
                <button 
                  className="flex-1 py-sm rounded-DEFAULT bg-transparent border border-white-border text-white-primary hover:bg-white-border transition-colors font-body text-body font-medium"
                  onClick={() => { window.location.hash = '#pricing' }}
                >
                  Downgrade
                </button>
              ) : (
                <button 
                  className="flex-1 py-sm rounded-DEFAULT bg-neon text-void hover:opacity-90 transition-opacity font-body text-body font-medium"
                  onClick={() => handleUpgrade('pro')}
                  disabled={upgrading === 'pro'}
                >
                  {upgrading === 'pro' ? 'Wait...' : 'Upgrade'}
                </button>
              )}
            </div>
          </div>

          {/* Credit Balance (Spans 4 columns) */}
          <div className="md:col-span-4 bg-deep border border-neon rounded-lg p-lg flex flex-col gap-md shadow-[0_0_20px_rgba(0,255,135,0.06)] relative">
            <div className="absolute inset-0 bg-neon/10 opacity-20 pointer-events-none rounded-lg"></div>
            <div className="flex justify-between items-start z-10">
              <span className="font-label-caps text-label-caps text-neon">CREDITS</span>
              <span className="material-symbols-outlined text-neon" data-icon="database">database</span>
            </div>
            <div className="z-10 flex items-baseline gap-sm">
              <span className="font-display-lg text-display-lg text-white-primary">{credits}</span>
              <span className="font-mono-data text-mono-data text-white-secondary">CR</span>
            </div>
          </div>

          {/* Settings Section (Spans full 12 columns) */}
          <div className="md:col-span-12 bg-layer border border-white-border rounded-lg p-lg flex flex-col gap-lg mt-xl">
            <header className="flex justify-between items-center border-b border-white-border pb-md">
              <h2 className="font-subheading text-subheading text-white-primary">System Settings</h2>
            </header>

            <div className="flex flex-col md:flex-row gap-lg">
              {/* Tabs Navigation (Left Column) */}
              <div className="md:w-1/4 flex flex-col gap-sm border-r border-white-border pr-md">
                <button 
                  onClick={() => setTab('mcp')}
                  className={`text-left px-md py-sm rounded-DEFAULT font-body text-body transition-colors border-l-2 ${tab === 'mcp' ? 'bg-surface-dim border-neon text-neon' : 'border-transparent text-white-secondary hover:text-white-primary hover:bg-surface-dim'}`}
                >
                  MCP Configuration
                </button>
                <button 
                  onClick={() => setTab('figma')}
                  className={`text-left px-md py-sm rounded-DEFAULT font-body text-body transition-colors border-l-2 ${tab === 'figma' ? 'bg-surface-dim border-neon text-neon' : 'border-transparent text-white-secondary hover:text-white-primary hover:bg-surface-dim'}`}
                >
                  Figma REST API
                </button>
              </div>

              {/* Tab Content (Right Column) */}
              <div className="md:w-3/4 flex flex-col gap-md">
                {tab === 'mcp' && (
                  <div className="animate-fade-in relative">
                    {!isPro && (
                      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center backdrop-blur-sm bg-void/50 rounded-lg border border-white-border">
                        <span className="text-[32px] mb-2">🔒</span>
                        <div className="font-heading-sm text-lg text-white-primary mb-2">Pro Feature</div>
                        <div className="font-body text-sm text-white-secondary text-center max-w-sm mb-4">
                          MCP Bridge access is available on the Pro plan. Upgrade to connect Subsrf to Claude and Cursor.
                        </div>
                        <button className="bg-neon text-void px-md py-sm rounded-DEFAULT font-label-caps text-label-caps hover:opacity-90 transition-opacity" onClick={() => handleUpgrade('pro')}>
                          Upgrade to Pro
                        </button>
                      </div>
                    )}
                    <div className="flex justify-between items-center mb-md">
                      <h3 className="font-body text-body text-white-primary font-medium">Model Context Protocol (MCP)</h3>
                      <span className="px-sm py-xs border border-white-border rounded-DEFAULT font-mono-data text-mono-data text-white-primary flex items-center gap-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-status-ok"></span> CONNECTED
                      </span>
                    </div>
                    <p className="font-mono-data text-mono-data text-white-secondary mb-md">Configure your local MCP server to interface with Subsrf infrastructure.</p>
                    
                    {/* Code Block */}
                    <div className="bg-deep border border-white-border rounded-lg p-md overflow-x-auto">
                      <pre className="font-mono-data text-mono-data text-[13px] leading-relaxed" dangerouslySetInnerHTML={{ __html: highlightJson(mcpConfig) }} />
                    </div>

                    <div className="flex justify-end mt-sm">
                      <button onClick={handleCopy} className="px-md py-sm rounded-DEFAULT border border-white-border text-white-primary hover:bg-white-border transition-colors font-mono-data text-mono-data text-xs flex items-center gap-sm">
                        <span className="material-symbols-outlined text-[16px]" data-icon={copied ? 'check' : 'content_copy'}>{copied ? 'check' : 'content_copy'}</span> 
                        {copied ? 'Copied!' : 'Copy JSON'}
                      </button>
                    </div>
                  </div>
                )}

                {tab === 'figma' && (
                  <div className="animate-fade-in">
                    <div className="flex justify-between items-center mb-md">
                      <h3 className="font-body text-body text-white-primary font-medium">Figma REST API Token</h3>
                      <div className={`px-sm py-xs border rounded-DEFAULT font-mono-data text-mono-data flex items-center gap-sm ${figmaPat ? 'border-status-ok/30 text-status-ok' : 'border-white-border text-white-muted'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${figmaPat ? 'bg-status-ok' : 'bg-white-muted'}`}></span> {figmaPat ? 'ACTIVE' : 'NOT SET'}
                      </div>
                    </div>
                    <p className="font-mono-data text-mono-data text-white-secondary mb-lg">Required for high-fidelity image exports and component analysis.</p>
                    
                    {patStatus === 'saved' && (
                      <div className="mb-md p-sm bg-status-ok/10 border border-status-ok/20 rounded-DEFAULT font-mono-data text-mono-data text-status-ok">
                        Token saved successfully. The MCP config has been updated.
                      </div>
                    )}
                    {patStatus === 'error' && (
                      <div className="mb-md p-sm bg-status-err/10 border border-status-err/20 rounded-DEFAULT font-mono-data text-mono-data text-status-err">
                        Failed to save token. Please try again.
                      </div>
                    )}

                    {!showPatInput ? (
                      <button
                        onClick={() => { setShowPatInput(true); setPatInput('') }}
                        className="bg-transparent border border-white-border text-white-primary px-lg py-sm rounded-DEFAULT font-label-caps text-label-caps hover:bg-white-border transition-colors"
                      >
                        {figmaPat ? 'Update Token' : 'Configure Token'}
                      </button>
                    ) : (
                      <div className="flex flex-col gap-md">
                        <input
                          type="password"
                          value={patInput}
                          onChange={e => setPatInput(e.target.value)}
                          placeholder="figd_..."
                          onKeyDown={e => e.key === 'Enter' && savePat()}
                          className="w-full p-sm bg-white-border/5 border border-white-border rounded-DEFAULT text-white-primary font-mono-data text-mono-data outline-none focus:border-neon transition-colors"
                        />
                        <div className="flex items-center gap-md mt-sm">
                          <button
                            onClick={savePat}
                            disabled={patSaving || !patInput.trim()}
                            className="bg-neon text-void px-lg py-sm rounded-DEFAULT font-label-caps text-label-caps hover:opacity-90 transition-opacity disabled:opacity-50"
                          >
                            {patSaving ? 'Saving...' : 'Save Token'}
                          </button>
                          <button
                            onClick={() => { setShowPatInput(false); setPatInput('') }}
                            className="bg-transparent border border-white-border text-white-primary px-lg py-sm rounded-DEFAULT font-label-caps text-label-caps hover:bg-white-border transition-colors"
                          >
                            Cancel
                          </button>
                          <a
                            href="https://www.figma.com/settings/account#personal-access-tokens"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-auto font-mono-data text-xs text-neon hover:underline"
                          >
                            Get token in Figma Settings ↗
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────

function App() {
  const [session, setSession] = useState(null)
  const [tier, setTier] = useState('free')
  const [authLoading, setAuthLoading] = useState(false)
  const [appReady, setAppReady] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState(null)
  const [currentPath, setCurrentPath] = useState(window.location.hash || '#')

  useEffect(() => {
    const handleHashChange = () => setCurrentPath(window.location.hash || '#')
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const ps = params.get('payment')
    if (ps) {
      setPaymentStatus(ps)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setAppReady(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      setAuthLoading(false)
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        // session updated, tier will re-fetch via the effect below
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) { setTier('free'); return }
    fetchTier(session.user.id).then(setTier)
  }, [session])

  const handleLogin = async () => {
    setAuthLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    })
    if (error) {
      setAuthLoading(false)
      alert('Sign in failed: ' + error.message)
    }
    // On success the browser redirects — loading state resolves in onAuthStateChange
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setTier('free')
  }

  if (!appReady) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--t2)', fontSize: 14, fontFamily: "'Azeret Mono', monospace" }}>Loading...</div>
      </div>
    )
  }

  const handleTierRefresh = async (attempts = 5) => {
    if (!session) return
    const t = await fetchTier(session.user.id)
    setTier(t)
    if (t === 'free' && attempts > 1) {
      setTimeout(() => handleTierRefresh(attempts - 1), 2000)
    }
  }

  if (currentPath === '#extension') {
    return <ExtensionPage onLogin={handleLogin} loading={authLoading} session={session} tier={tier} onLogout={handleLogout} />
  }

  if (currentPath === '#plugin') {
    return <PluginPage onLogin={handleLogin} loading={authLoading} session={session} tier={tier} onLogout={handleLogout} />
  }

  if (currentPath === '#pricing') {
    return <PricingPage onLogin={handleLogin} loading={authLoading} session={session} tier={tier} onLogout={handleLogout} />
  }

  if (currentPath === '#docs') {
    return <DocsPage onLogin={handleLogin} loading={authLoading} session={session} tier={tier} onLogout={handleLogout} />
  }

  // If session exists and no specific page is requested, show dashboard
  if (session && (currentPath === '' || currentPath === '#' || currentPath === '#dashboard')) {
    return <Dashboard session={session} tier={tier} onLogout={handleLogout} paymentStatus={paymentStatus} onTierRefresh={handleTierRefresh} />
  }

  return <LandingPage onLogin={handleLogin} loading={authLoading} session={session} tier={tier} onLogout={handleLogout} />
}

export default App
