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
  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Nav */}
      <nav className="glass" style={{
        position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)',
        width: '90%', maxWidth: 1200, zIndex: 1000,
        padding: '12px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <LogoMark size={28} />
          <Wordmark size={18} />
        </div>
        <div style={{ display: 'flex', gap: 32, fontSize: 14, fontWeight: 500, color: 'var(--t2)' }}>
          <a href="#features" style={{ color: 'inherit', textDecoration: 'none' }}>Features</a>
          <a href="#how-it-works" style={{ color: 'inherit', textDecoration: 'none' }}>How It Works</a>
          <a href="#pricing" style={{ color: 'inherit', textDecoration: 'none' }}>Pricing</a>
        </div>
        <button
          className="btn btn-secondary"
          onClick={onLogin}
          disabled={loading}
          style={{ padding: '8px 20px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="16" alt="" />
          {loading ? 'Redirecting...' : 'Sign in with Google'}
        </button>
      </nav>

      {/* Hero */}
      <header className="hero container animate-fade-in">
        <div style={{
          display: 'inline-block', padding: '5px 14px', borderRadius: 100,
          fontSize: 11, fontWeight: 500, fontFamily: "'Azeret Mono', monospace",
          color: 'var(--acid)', marginBottom: 24,
          border: '1px solid rgba(0, 255, 135, 0.3)',
          background: 'rgba(0, 255, 135, 0.05)',
          letterSpacing: '0.06em', textTransform: 'uppercase'
        }}>
          Introducing Subsrf v2.8 — Design Intelligence
        </div>
        <h1 className="gradient-text">Design Intelligence<br />for the AI Era</h1>
        <p>Subsrf is the ultimate bridge for AI-driven design. Capture live UI components and instantly synthesize them into high-fidelity Knowledge Briefs for your favorite LLMs.</p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
          <button className="btn btn-primary" onClick={onLogin}>Get Started Free</button>
          <button className="btn btn-secondary">Watch Demo</button>
        </div>
        <div className="hero-mockup">
          <img src="/images/hero.png" alt="Subsrf Interface" style={{ width: '100%', display: 'block' }} />
          <div className="glass" style={{ position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)', padding: '24px 40px', width: '80%', display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 24, fontWeight: 700 }}>99%</div>
              <div style={{ fontSize: 12, color: 'var(--t2)' }}>Reconstruction Accuracy</div>
            </div>
            <div style={{ width: 1, height: 40, background: 'var(--border)' }} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 24, fontWeight: 700 }}>2s</div>
              <div style={{ fontSize: 12, color: 'var(--t2)' }}>Average Sync Time</div>
            </div>
            <div style={{ width: 1, height: 40, background: 'var(--border)' }} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 24, fontWeight: 700 }}>10k+</div>
              <div style={{ fontSize: 12, color: 'var(--t2)' }}>Elements Synced Daily</div>
            </div>
          </div>
        </div>
      </header>

      {/* Features */}
      <section id="features" className="container" style={{ padding: '100px 0' }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <div style={{ fontFamily: "'Azeret Mono', monospace", fontSize: 10, fontWeight: 500, color: 'var(--acid)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>Capabilities</div>
          <h2 style={{ fontSize: 40, marginBottom: 16 }}>Built for Modern Designers</h2>
          <p style={{ color: 'var(--t2)', maxWidth: 500, margin: '0 auto' }}>Everything you need to turn inspiration into production-ready design assets.</p>
        </div>
        <div className="features-grid">
          {[
            { tag: 'AI Intelligence', title: 'Knowledge Briefs', desc: 'Automatically synthesize captured UI into structured JSON briefs optimized for Claude and GPT prompts.' },
            { tag: 'Local-First', title: 'MCP Design Bridge', desc: 'Bring your own AI. Securely stream live UI data via the Model Context Protocol to your local environment.' },
            { tag: 'Seamless Sync', title: 'Figma Pro Bridge', desc: 'One-click bi-directional sync that reconstructs production-ready layers directly on your Figma canvas.' },
            { tag: 'Precision Tools', title: 'Canvas Image Editor', desc: 'Edit, crop, and annotate captures in a dedicated precision environment before syncing to your suite.' },
            { tag: 'High Fidelity', title: 'Full-Page Capture', desc: 'Advanced scrolling capture engine that extracts entire pages with pixel-perfect style and image fidelity.' },
            { tag: 'Extraction', title: 'Smart DOM Mapping', desc: 'Intelligently maps computed CSS and hierarchy to ensure design-token accuracy during reconstruction.' },
          ].map((f, i) => (
            <div key={i} className="feature-card glass">
              <div className="feature-tag">{f.tag}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="container" style={{ padding: '100px 0', display: 'flex', alignItems: 'center', gap: 60 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Azeret Mono', monospace", fontSize: 10, fontWeight: 500, color: 'var(--acid)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>Architecture</div>
          <h2 style={{ fontSize: 48, marginBottom: 24 }}>The Bridge Between<br /><span style={{ color: 'var(--acid)' }}>Dev & Design</span></h2>
          <p style={{ fontSize: 18, color: 'var(--t2)', marginBottom: 32 }}>Subsrf uses a specialized MCP (Model Context Protocol) bridge to securely stream live UI data from your browser to your local Figma plugin and AI environment.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {[
              { t: 'Local-First Security', d: 'Your design data never leaves your machine. The bridge runs entirely on your local network.' },
              { t: 'High-Fidelity Rendering', d: "Computed styles, SVGs, and images are reconstructed using Figma's native API." },
              { t: 'Real-Time Sync', d: 'Changes in the browser reflect in Figma in under 2 seconds.' },
            ].map((f, i) => (
              <div key={i} style={{ display: 'flex', gap: 16 }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,255,135,0.12)', border: '1px solid rgba(0,255,135,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 11, color: 'var(--acid)', fontWeight: 700 }}>✓</div>
                <div>
                  <div style={{ fontWeight: 600 }}>{f.t}</div>
                  <div style={{ fontSize: 14, color: 'var(--t2)' }}>{f.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div className="glass" style={{ padding: 20, borderRadius: 40 }}>
            <img src="/images/bridge.png" alt="Subsrf Bridge" style={{ width: '100%', borderRadius: 24 }} />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="container" style={{ padding: '100px 0', textAlign: 'center' }}>
        <div style={{ fontFamily: "'Azeret Mono', monospace", fontSize: 10, fontWeight: 500, color: 'var(--acid)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>Pricing</div>
        <h2 style={{ fontSize: 40, marginBottom: 16 }}>Simple Pricing</h2>
        <p style={{ color: 'var(--t2)', marginBottom: 60 }}>Start free. Upgrade when you're ready to go pro.</p>
        <div style={{ display: 'flex', gap: 24, justifyContent: 'center', maxWidth: 800, margin: '0 auto' }}>
          {/* Free */}
          <div className="glass" style={{ flex: 1, padding: 40, textAlign: 'left' }}>
            <div style={{ fontSize: 11, fontWeight: 700, fontFamily: "'Azeret Mono', monospace", color: 'var(--t3)', marginBottom: 8, letterSpacing: '0.08em', textTransform: 'uppercase' }}>FREE</div>
            <div style={{ fontSize: 40, fontWeight: 800, marginBottom: 24 }}>$0<span style={{ fontSize: 16, color: 'var(--t2)' }}>/mo</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
              {['Up to 5 elements per capture', 'Screenshot editor', 'Figma sync (basic)', 'AI Knowledge Briefs'].map((f, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, fontSize: 14 }}><span style={{ color: 'var(--ok)' }}>✓</span>{f}</div>
              ))}
              {['MCP Bridge access', 'Full-page capture', 'Priority support'].map((f, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, fontSize: 14, opacity: 0.35 }}><span>✗</span>{f}</div>
              ))}
            </div>
            <button className="btn btn-secondary" onClick={onLogin} style={{ width: '100%' }}>Get Started</button>
          </div>
          {/* Pro */}
          <div className="glass" style={{ flex: 1, padding: 40, textAlign: 'left', border: '1px solid rgba(0,255,135,0.25)', background: 'rgba(0,255,135,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, fontFamily: "'Azeret Mono', monospace", color: 'var(--acid)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>PRO</div>
              <div style={{ fontSize: 9, fontWeight: 700, fontFamily: "'Azeret Mono', monospace", background: 'var(--acid)', color: 'var(--void)', padding: '3px 8px', borderRadius: 100, letterSpacing: '0.06em' }}>POPULAR</div>
            </div>
            <div style={{ fontSize: 40, fontWeight: 800, marginBottom: 24 }}>$19<span style={{ fontSize: 16, color: 'var(--t2)' }}>/mo</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
              {['Unlimited elements per capture', 'Screenshot editor', 'Figma sync (advanced)', 'AI Knowledge Briefs', 'MCP Bridge access', 'Full-page capture', 'Priority support'].map((f, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, fontSize: 14 }}><span style={{ color: 'var(--ok)' }}>✓</span>{f}</div>
              ))}
            </div>
            <button className="btn btn-primary" onClick={onLogin} style={{ width: '100%' }}>Upgrade to Pro</button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="container" style={{ padding: '80px 0 40px', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 }}>
          <LogoMark size={24} />
          <Wordmark size={16} />
        </div>
        <p style={{ color: 'var(--t2)', marginBottom: 32 }}>Engineered for designers who move fast.</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 40, color: 'var(--t3)', fontSize: 14 }}>
          <span>© 2026 Subsrf Intelligence Suite</span>
          <a href="/privacy.html" style={{ color: 'inherit', textDecoration: 'none' }}>Privacy</a>
          <a href="/terms.html" style={{ color: 'inherit', textDecoration: 'none' }}>Terms</a>
        </div>
      </footer>
    </div>
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
