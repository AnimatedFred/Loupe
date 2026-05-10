import React, { useState, useEffect } from 'react'
import { supabase } from './supabase'

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

function LogoMark({ size = 28 }) {
  return (
    <img src="/subsrf-icon.png" width={size} height={size} alt="Subsrf" style={{ borderRadius: size * 0.22, display: 'block', flexShrink: 0 }} />
  )
}

function Wordmark({ size = 18 }) {
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

function LandingPage({ onLogin, loading }) {
  const scrollToGetStarted = (e) => {
    e.preventDefault();
    document.getElementById('get-started')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      {/* TopNavBar */}
      <header className="fixed top-0 w-full z-50 border-b border-white-border flat no shadows bg-void" style={{ backgroundColor: '#050508' }}>
        <div className="flex justify-between items-center max-w-[1080px] mx-auto px-lg h-16">
          <div className="font-label-caps text-label-caps tracking-widest text-white-primary">
            subsrf.dev
          </div>
          <nav className="hidden md:flex gap-lg">
            <a className="font-light font-body text-body hover:text-neon transition-colors duration-200 active:scale-95 transition-transform text-neon" href="#">Plugin</a>
            <a className="text-white-secondary font-light font-body text-body hover:text-neon transition-colors duration-200 active:scale-95 transition-transform" href="#">Extension</a>
            <a className="text-white-secondary font-light font-body text-body hover:text-neon transition-colors duration-200 active:scale-95 transition-transform" href="#">Pricing</a>
            <a className="text-white-secondary font-light font-body text-body hover:text-neon transition-colors duration-200 active:scale-95 transition-transform" href="#">Docs</a>
          </nav>
          <div className="flex gap-md">
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
          </div>
        </div>
      </header>

      {/* Main Canvas */}
      <main className="flex-grow pt-3xl pb-4xl flex flex-col items-center w-full px-lg max-w-[1080px] mx-auto gap-4xl">
        {/* Hero Section */}
        <section className="w-full flex flex-col items-center text-center mt-4xl gap-lg">
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
        </section>

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
              <button className="mt-auto bg-transparent border border-white-border text-white-primary w-full py-sm rounded-DEFAULT font-label-caps text-label-caps hover:bg-white-border transition-colors" onClick={onLogin}>Select Free</button>
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
              <button className="mt-auto bg-neon text-void w-full py-sm rounded-DEFAULT font-label-caps text-label-caps hover:opacity-90 transition-opacity" onClick={onLogin}>Select Starter</button>
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
              <button className="mt-auto bg-transparent border border-white-border text-white-primary w-full py-sm rounded-DEFAULT font-label-caps text-label-caps hover:bg-white-border transition-colors" onClick={onLogin}>Select Pro</button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
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

  useEffect(() => {
    supabase
      .from('profiles')
      .select('figma_pat, stripe_customer_id')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.figma_pat) setFigmaPat(data.figma_pat)
        setHasStripeBilling(!!data?.stripe_customer_id)
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
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
      {/* Top bar */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(5, 5, 8, 0.92)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
        padding: '0 32px', height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <LogoMark size={26} />
          <Wordmark size={16} />
          <span style={{ fontSize: 11, fontFamily: "'Azeret Mono', monospace", color: 'var(--t3)', marginLeft: 6, letterSpacing: '0.06em' }}>dashboard</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Tier badge */}
          <div style={{
            padding: '4px 12px', borderRadius: 100, fontSize: 10, fontWeight: 700,
            fontFamily: "'Azeret Mono', monospace", letterSpacing: '0.06em',
            background: isPro ? 'rgba(0,255,135,0.1)' : 'rgba(242,242,244,0.04)',
            color: isPro ? 'var(--acid)' : 'var(--t3)',
            border: `1px solid ${isPro ? 'rgba(0,255,135,0.25)' : 'rgba(242,242,244,0.08)'}`
          }}>
            {isPro ? 'PRO' : 'FREE'}
          </div>
          {/* Avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {avatar
              ? <img src={avatar} width={32} height={32} style={{ borderRadius: '50%', border: '2px solid var(--border)' }} alt="" />
              : <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--layer)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: 'var(--acid)' }}>{initial}</div>
            }
            <span style={{ fontSize: 14, color: 'var(--t2)' }}>{displayName}</span>
          </div>
          <button
            onClick={onLogout}
            style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--t2)', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-main)' }}
          >
            Sign out
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1 }}>
        {/* Sidebar */}
        <aside style={{
          width: 220, flexShrink: 0,
          borderRight: '1px solid var(--border)',
          padding: '32px 16px',
          background: 'rgba(12, 12, 18, 0.5)'
        }}>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              style={{
                width: '100%', padding: '11px 16px', borderRadius: 10, border: 'none',
                background: tab === item.id ? 'rgba(0,255,135,0.07)' : 'transparent',
                color: tab === item.id ? 'var(--acid)' : 'var(--t2)',
                textAlign: 'left', fontWeight: 600, fontSize: 14, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4,
                borderLeft: tab === item.id ? '2px solid var(--acid)' : '2px solid transparent',
                transition: 'all 0.15s', fontFamily: 'var(--font-main)'
              }}
            >
              <span>{item.icon}</span> {item.label}
            </button>
          ))}
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, padding: '48px 56px', maxWidth: 900 }}>

          {/* ── MCP Settings ── */}
          {tab === 'mcp' && (
            <div className="animate-fade-in">
              <h1 style={{ fontSize: 28, marginBottom: 8 }}>MCP Settings</h1>
              <p style={{ color: 'var(--t2)', marginBottom: 40 }}>
                Connect Subsrf to Claude, Cursor, or any MCP-compatible AI using the config below.
              </p>

              {isPro ? (
                <div>
                  {/* Config block */}
                  <div className="glass" style={{ padding: 32, marginBottom: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                      <div>
                        <div style={{ fontWeight: 700, marginBottom: 4 }}>MCP Configuration</div>
                        <div style={{ fontSize: 13, color: 'var(--t2)' }}>Add this to your Claude Desktop or Cursor settings</div>
                      </div>
                      <button
                        onClick={handleCopy}
                        className="btn btn-secondary"
                        style={{ padding: '8px 18px', fontSize: 13 }}
                      >
                        {copied ? '✓ Copied' : 'Copy JSON'}
                      </button>
                    </div>
                    <div style={{ background: '#0C0C12', padding: '20px 24px', borderRadius: 8, fontFamily: "'Azeret Mono', monospace", fontSize: 13, border: '1px solid rgba(255,255,255,0.06)', overflowX: 'auto' }}>
                      <pre style={{ margin: 0, color: 'rgba(242,242,244,0.28)', lineHeight: 1.8 }}
                        dangerouslySetInnerHTML={{ __html: highlightJson(mcpConfig) }}
                      />
                    </div>
                  </div>

                  {/* Endpoint status */}
                  <div className="glass" style={{ padding: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>Cloud Bridge Endpoint</div>
                      <div style={{ fontSize: 13, color: 'var(--t2)', fontFamily: "'Azeret Mono', monospace" }}>https://api.subsrf.dev</div>
                    </div>
                    <div style={{ padding: '5px 12px', background: 'rgba(57,217,138,0.08)', color: 'var(--ok)', borderRadius: 100, fontSize: 11, fontWeight: 600, fontFamily: "'Azeret Mono', monospace", border: '1px solid rgba(57,217,138,0.2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--ok)', display: 'inline-block' }} />
                      ONLINE
                    </div>
                  </div>

                  {/* Figma REST API Token */}
                  <div className="glass" style={{ padding: 32 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                      <div>
                        <div style={{ fontWeight: 700, marginBottom: 4 }}>Figma REST API Token</div>
                        <div style={{ fontSize: 13, color: 'var(--t2)' }}>Required for high-fidelity image exports and component analysis.</div>
                      </div>
                      <div style={{
                        padding: '5px 12px', borderRadius: 100, fontSize: 11, fontWeight: 600,
                        fontFamily: "'Azeret Mono', monospace",
                        background: figmaPat ? 'rgba(57,217,138,0.08)' : 'rgba(242,242,244,0.04)',
                        color: figmaPat ? 'var(--ok)' : 'var(--t3)',
                        border: `1px solid ${figmaPat ? 'rgba(57,217,138,0.2)' : 'rgba(242,242,244,0.08)'}`,
                        display: 'flex', alignItems: 'center', gap: 6
                      }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: figmaPat ? 'var(--ok)' : 'var(--t3)', display: 'inline-block' }} />
                        {figmaPat ? 'ACTIVE' : 'NOT SET'}
                      </div>
                    </div>

                    {patStatus === 'saved' && (
                      <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(57,217,138,0.08)', border: '1px solid rgba(57,217,138,0.2)', borderRadius: 8, fontSize: 13, color: 'var(--ok)' }}>
                        Token saved successfully. The MCP config above has been updated.
                      </div>
                    )}
                    {patStatus === 'error' && (
                      <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(255,77,77,0.08)', border: '1px solid rgba(255,77,77,0.2)', borderRadius: 8, fontSize: 13, color: 'var(--err)' }}>
                        Failed to save token. Please try again.
                      </div>
                    )}

                    {!showPatInput ? (
                      <button
                        onClick={() => { setShowPatInput(true); setPatInput('') }}
                        className="btn btn-secondary"
                        style={{ padding: '9px 20px', fontSize: 13 }}
                      >
                        {figmaPat ? 'Update Token' : 'Configure Token'}
                      </button>
                    ) : (
                      <div>
                        <input
                          type="password"
                          value={patInput}
                          onChange={e => setPatInput(e.target.value)}
                          placeholder="figd_..."
                          onKeyDown={e => e.key === 'Enter' && savePat()}
                          style={{
                            width: '100%', padding: '10px 14px',
                            background: 'rgba(242,242,244,0.03)',
                            border: '1px solid var(--border)', borderRadius: 8,
                            color: 'var(--t1)', fontSize: 13, fontFamily: "'Azeret Mono', monospace",
                            marginBottom: 12, outline: 'none'
                          }}
                        />
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <button
                            onClick={savePat}
                            disabled={patSaving || !patInput.trim()}
                            className="btn btn-primary"
                            style={{ padding: '9px 20px', fontSize: 13 }}
                          >
                            {patSaving ? 'Saving...' : 'Save Token'}
                          </button>
                          <button
                            onClick={() => { setShowPatInput(false); setPatInput('') }}
                            className="btn btn-secondary"
                            style={{ padding: '9px 16px', fontSize: 13 }}
                          >
                            Cancel
                          </button>
                          <a
                            href="https://www.figma.com/settings/account#personal-access-tokens"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ marginLeft: 8, fontSize: 12, color: 'var(--acid)', textDecoration: 'none', fontWeight: 600 }}
                          >
                            Get token in Figma Settings ↗
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Locked state for free tier */
                <div style={{ position: 'relative' }}>
                  <div style={{ filter: 'blur(4px)', pointerEvents: 'none', userSelect: 'none', opacity: 0.5 }}>
                    <div className="glass" style={{ padding: 32, marginBottom: 24 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <div>
                          <div style={{ fontWeight: 700, marginBottom: 4 }}>MCP Configuration</div>
                          <div style={{ fontSize: 13, color: 'var(--t2)' }}>Add this to your Claude Desktop or Cursor settings</div>
                        </div>
                        <div className="btn btn-secondary" style={{ padding: '8px 18px', fontSize: 13 }}>Copy JSON</div>
                      </div>
                      <div style={{ background: '#0C0C12', padding: '20px 24px', borderRadius: 8, fontFamily: "'Azeret Mono', monospace", fontSize: 13, border: '1px solid rgba(255,255,255,0.06)' }}>
                        <pre style={{ margin: 0, color: 'rgba(242,242,244,0.28)', lineHeight: 1.8 }}
                          dangerouslySetInnerHTML={{ __html: highlightJson(mcpConfig) }}
                        />
                      </div>
                    </div>
                    <div className="glass" style={{ padding: 24 }}>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>Cloud Bridge Endpoint</div>
                      <div style={{ fontSize: 13, color: 'var(--t2)', fontFamily: "'Azeret Mono', monospace" }}>https://api.subsrf.dev</div>
                    </div>
                  </div>
                  {/* Lock overlay */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: 16
                  }}>
                    <div style={{ fontSize: 48 }}>🔒</div>
                    <div style={{ fontWeight: 700, fontSize: 20 }}>Pro Feature</div>
                    <div style={{ color: 'var(--t2)', fontSize: 14, textAlign: 'center', maxWidth: 320 }}>
                      MCP Bridge access is available on the Pro plan. Upgrade to connect Subsrf to Claude and Cursor.
                    </div>
                    <button className="btn btn-primary" onClick={() => setTab('upgrade')} style={{ marginTop: 8 }}>
                      Upgrade to Pro — $19/mo
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Account ── */}
          {tab === 'account' && (
            <div className="animate-fade-in">
              <h1 style={{ fontSize: 28, marginBottom: 8 }}>Account</h1>
              <p style={{ color: 'var(--t2)', marginBottom: 40 }}>Your profile and plan details.</p>

              <div className="glass" style={{ padding: 32, marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32 }}>
                  {avatar
                    ? <img src={avatar} width={64} height={64} style={{ borderRadius: '50%', border: '2px solid rgba(0,255,135,0.3)' }} alt="" />
                    : <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--layer)', border: '1px solid rgba(0,255,135,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 24, color: 'var(--acid)' }}>{initial}</div>
                  }
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 700 }}>{displayName}</div>
                    <div style={{ fontSize: 14, color: 'var(--t2)' }}>{user.email}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div style={{ background: 'var(--layer)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 10, fontWeight: 600, fontFamily: "'Azeret Mono', monospace", color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Current Plan</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: isPro ? 'var(--acid)' : 'var(--t1)' }}>
                      {isPro ? 'Pro' : 'Free'}
                    </div>
                  </div>
                  <div style={{ background: 'var(--layer)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 10, fontWeight: 600, fontFamily: "'Azeret Mono', monospace", color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>MCP Access</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: isPro ? 'var(--ok)' : 'var(--err)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: isPro ? 'var(--ok)' : 'var(--err)', display: 'inline-block' }} />
                      {isPro ? 'Active' : 'Locked'}
                    </div>
                  </div>
                  <div style={{ background: 'var(--layer)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 10, fontWeight: 600, fontFamily: "'Azeret Mono', monospace", color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Figma REST API</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: figmaPat ? 'var(--ok)' : 'var(--t3)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: figmaPat ? 'var(--ok)' : 'var(--t3)', display: 'inline-block' }} />
                      {figmaPat ? 'Active' : 'Not set'}
                    </div>
                  </div>
                </div>
              </div>

              {!isPro && (
                <div className="glass" style={{ padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderColor: 'rgba(0,255,135,0.2)', background: 'rgba(0,255,135,0.03)' }}>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>Unlock the full Subsrf experience</div>
                    <div style={{ fontSize: 13, color: 'var(--t2)' }}>Upgrade to Pro for MCP access, unlimited captures, and more.</div>
                  </div>
                  <button className="btn btn-primary" onClick={() => setTab('upgrade')} style={{ whiteSpace: 'nowrap', marginLeft: 24 }}>
                    Upgrade — $19/mo
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Upgrade ── */}
          {tab === 'upgrade' && (
            <div className="animate-fade-in">
              <h1 style={{ fontSize: 28, marginBottom: 8 }}>Upgrade to Pro</h1>
              <p style={{ color: 'var(--t2)', marginBottom: 40 }}>Unlock the full Subsrf intelligence suite.</p>

              {paymentStatus === 'success' && (
                <div style={{ marginBottom: 24, padding: '14px 20px', background: 'rgba(57,217,138,0.08)', border: '1px solid rgba(57,217,138,0.2)', borderRadius: 10, fontSize: 14, color: 'var(--ok)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>✓ Payment successful — your subscription has been activated!</span>
                  {tier === 'free' && (
                    <button onClick={() => window.location.reload()} style={{ background: 'transparent', border: '1px solid rgba(57,217,138,0.4)', color: 'var(--ok)', padding: '4px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-main)', fontWeight: 600 }}>
                      Refresh
                    </button>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: 24, maxWidth: 760 }}>
                {/* Starter */}
                <div className="glass" style={{ flex: 1, padding: 40, textAlign: 'left' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, fontFamily: "'Azeret Mono', monospace", color: 'var(--t3)', marginBottom: 8, letterSpacing: '0.08em', textTransform: 'uppercase' }}>STARTER</div>
                  <div style={{ fontSize: 40, fontWeight: 800, marginBottom: 24 }}>$9<span style={{ fontSize: 16, color: 'var(--t2)' }}>/mo</span></div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
                    {['75 AI credits/month', 'MCP Bridge access', 'Full-page capture', 'Advanced Figma sync'].map((f, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, fontSize: 14 }}><span style={{ color: 'var(--ok)' }}>✓</span>{f}</div>
                    ))}
                  </div>
                  <button
                    className="btn btn-secondary"
                    style={{ width: '100%' }}
                    onClick={() => handleUpgrade('starter')}
                    disabled={!!upgrading || (hasStripeBilling && tier === 'starter')}
                  >
                    {upgrading === 'starter' ? 'Redirecting...' : (hasStripeBilling && tier === 'starter') ? 'Current plan' : 'Get Starter'}
                  </button>
                </div>

                {/* Pro */}
                <div className="glass" style={{ flex: 1, padding: 40, textAlign: 'left', border: '1px solid rgba(0,255,135,0.25)', background: 'rgba(0,255,135,0.03)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, fontFamily: "'Azeret Mono', monospace", color: 'var(--acid)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>PRO</div>
                    <div style={{ fontSize: 9, fontWeight: 700, fontFamily: "'Azeret Mono', monospace", background: 'var(--acid)', color: 'var(--void)', padding: '3px 8px', borderRadius: 100, letterSpacing: '0.06em' }}>POPULAR</div>
                  </div>
                  <div style={{ fontSize: 40, fontWeight: 800, marginBottom: 24 }}>$19<span style={{ fontSize: 16, color: 'var(--t2)' }}>/mo</span></div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
                    {['300 AI credits/month', 'MCP Bridge access', 'Full-page capture', 'Advanced Figma sync', 'Priority support'].map((f, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, fontSize: 14 }}><span style={{ color: 'var(--ok)' }}>✓</span>{f}</div>
                    ))}
                  </div>
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                    onClick={() => handleUpgrade('pro')}
                    disabled={!!upgrading || (hasStripeBilling && tier === 'pro')}
                  >
                    {upgrading === 'pro' ? 'Redirecting...' : (hasStripeBilling && tier === 'pro') ? 'Current plan' : 'Upgrade to Pro'}
                  </button>
                </div>
              </div>

              {upgradeError && (
                <div style={{ marginTop: 16, fontSize: 13, color: 'var(--err)' }}>{upgradeError}</div>
              )}
              <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 16 }}>
                Cancel anytime · Billed monthly
              </div>

              {hasStripeBilling && (
                <div style={{ marginTop: 32, paddingTop: 32, borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Manage subscription</div>
                  <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 16 }}>
                    Cancel, switch plans, or update your payment method via the Stripe billing portal.
                  </div>
                  <button
                    className="btn btn-secondary"
                    onClick={handleManageBilling}
                    disabled={portalLoading}
                    style={{ padding: '9px 20px', fontSize: 13 }}
                  >
                    {portalLoading ? 'Opening portal...' : 'Manage billing →'}
                  </button>
                </div>
              )}
            </div>
          )}

        </main>
      </div>
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────

function App() {
  const [session, setSession] = useState(null)
  const [tier, setTier] = useState('free')
  const [authLoading, setAuthLoading] = useState(false)
  const [appReady, setAppReady] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState(null)

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

  if (session) {
    const handleTierRefresh = async (attempts = 5) => {
      const t = await fetchTier(session.user.id)
      setTier(t)
      if (t === 'free' && attempts > 1) {
        setTimeout(() => handleTierRefresh(attempts - 1), 2000)
      }
    }
    return <Dashboard session={session} tier={tier} onLogout={handleLogout} paymentStatus={paymentStatus} onTierRefresh={handleTierRefresh} />
  }

  return <LandingPage onLogin={handleLogin} loading={authLoading} />
}

export default App
