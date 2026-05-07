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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/loupe-icon.png" width={32} height={32} style={{ borderRadius: 8 }} alt="Loupe" />
          <span style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-heading)' }}>Loupe</span>
        </div>
        <div style={{ display: 'flex', gap: 32, fontSize: 14, fontWeight: 500, color: 'var(--text-dim)' }}>
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
        <div className="glass" style={{ display: 'inline-block', padding: '6px 16px', borderRadius: 100, fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 24, border: '1px solid var(--accent)' }}>
          Introducing Loupe v2.8 — Design Intelligence
        </div>
        <h1 className="gradient-text">Design Intelligence<br />for the AI Era</h1>
        <p>Loupe is the ultimate bridge for AI-driven design. Capture live UI components and instantly synthesize them into high-fidelity Knowledge Briefs for your favorite LLMs.</p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
          <button className="btn btn-primary" onClick={onLogin}>Get Started Free</button>
          <button className="btn btn-secondary">Watch Demo</button>
        </div>
        <div className="hero-mockup">
          <img src="/images/hero.png" alt="Loupe Interface" style={{ width: '100%', display: 'block' }} />
          <div className="glass" style={{ position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)', padding: '24px 40px', width: '80%', display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 24, fontWeight: 700 }}>99%</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Reconstruction Accuracy</div>
            </div>
            <div style={{ width: 1, height: 40, background: 'var(--border)' }} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 24, fontWeight: 700 }}>2s</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Average Sync Time</div>
            </div>
            <div style={{ width: 1, height: 40, background: 'var(--border)' }} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 24, fontWeight: 700 }}>10k+</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Elements Synced Daily</div>
            </div>
          </div>
        </div>
      </header>

      {/* Features */}
      <section id="features" className="container" style={{ padding: '100px 0' }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <h2 style={{ fontSize: 40, marginBottom: 16 }}>Built for Modern Designers</h2>
          <p style={{ color: 'var(--text-dim)', maxWidth: 500, margin: '0 auto' }}>Everything you need to turn inspiration into production-ready design assets.</p>
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
          <h2 style={{ fontSize: 48, marginBottom: 24 }}>The Bridge Between<br /><span style={{ color: 'var(--accent)' }}>Dev & Design</span></h2>
          <p style={{ fontSize: 18, color: 'var(--text-dim)', marginBottom: 32 }}>Loupe uses a specialized MCP (Model Context Protocol) bridge to securely stream live UI data from your browser to your local Figma plugin and AI environment.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {[
              { t: 'Local-First Security', d: 'Your design data never leaves your machine. The bridge runs entirely on your local network.' },
              { t: 'High-Fidelity Rendering', d: "Computed styles, SVGs, and images are reconstructed using Figma's native API." },
              { t: 'Real-Time Sync', d: 'Changes in the browser reflect in Figma in under 2 seconds.' },
            ].map((f, i) => (
              <div key={i} style={{ display: 'flex', gap: 16 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12 }}>✓</div>
                <div>
                  <div style={{ fontWeight: 600 }}>{f.t}</div>
                  <div style={{ fontSize: 14, color: 'var(--text-dim)' }}>{f.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div className="glass" style={{ padding: 20, borderRadius: 40 }}>
            <img src="/images/bridge.png" alt="Loupe Bridge" style={{ width: '100%', borderRadius: 24 }} />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="container" style={{ padding: '100px 0', textAlign: 'center' }}>
        <h2 style={{ fontSize: 40, marginBottom: 16 }}>Simple Pricing</h2>
        <p style={{ color: 'var(--text-dim)', marginBottom: 60 }}>Start free. Upgrade when you're ready to go pro.</p>
        <div style={{ display: 'flex', gap: 24, justifyContent: 'center', maxWidth: 800, margin: '0 auto' }}>
          {/* Free */}
          <div className="glass" style={{ flex: 1, padding: 40, textAlign: 'left' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dim)', marginBottom: 8 }}>FREE</div>
            <div style={{ fontSize: 40, fontWeight: 800, marginBottom: 24 }}>$0<span style={{ fontSize: 16, color: 'var(--text-dim)' }}>/mo</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
              {['Up to 5 elements per capture', 'Screenshot editor', 'Figma sync (basic)', 'AI Knowledge Briefs'].map((f, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, fontSize: 14 }}><span style={{ color: '#10b981' }}>✓</span>{f}</div>
              ))}
              {['MCP Bridge access', 'Full-page capture', 'Priority support'].map((f, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, fontSize: 14, opacity: 0.4 }}><span>✗</span>{f}</div>
              ))}
            </div>
            <button className="btn btn-secondary" onClick={onLogin} style={{ width: '100%' }}>Get Started</button>
          </div>
          {/* Pro */}
          <div className="glass" style={{ flex: 1, padding: 40, textAlign: 'left', border: '1px solid var(--accent)', background: 'rgba(99,102,241,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>PRO</div>
              <div style={{ fontSize: 10, fontWeight: 700, background: 'var(--accent)', color: 'white', padding: '3px 8px', borderRadius: 100 }}>POPULAR</div>
            </div>
            <div style={{ fontSize: 40, fontWeight: 800, marginBottom: 24 }}>$19<span style={{ fontSize: 16, color: 'var(--text-dim)' }}>/mo</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
              {['Unlimited elements per capture', 'Screenshot editor', 'Figma sync (advanced)', 'AI Knowledge Briefs', 'MCP Bridge access', 'Full-page capture', 'Priority support'].map((f, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, fontSize: 14 }}><span style={{ color: '#10b981' }}>✓</span>{f}</div>
              ))}
            </div>
            <button className="btn btn-primary" onClick={onLogin} style={{ width: '100%' }}>Upgrade to Pro</button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="container" style={{ padding: '80px 0 40px', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
        <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Loupe</div>
        <p style={{ color: 'var(--text-dim)', marginBottom: 32 }}>Engineered for designers who move fast.</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 40, color: 'var(--text-dim)', fontSize: 14 }}>
          <span>© 2026 Loupe Intelligence Suite</span>
          <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Privacy</a>
          <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Terms</a>
        </div>
      </footer>
    </div>
  )
}

function Dashboard({ session, tier, onLogout }) {
  const [tab, setTab] = useState('mcp')
  const [copied, setCopied] = useState(false)
  const [figmaPat, setFigmaPat] = useState('')
  const [patInput, setPatInput] = useState('')
  const [showPatInput, setShowPatInput] = useState(false)
  const [patSaving, setPatSaving] = useState(false)
  const [patStatus, setPatStatus] = useState(null) // 'saved' | 'error' | null

  const isPro = tier === 'pro'
  const user = session.user
  const displayName = user.user_metadata?.full_name || user.email
  const avatar = user.user_metadata?.avatar_url
  const initial = displayName?.[0]?.toUpperCase() || '?'

  // Load existing Figma PAT from Supabase on mount
  useEffect(() => {
    supabase
      .from('profiles')
      .select('figma_pat')
      .eq('id', user.id)
      .single()
      .then(({ data }) => { if (data?.figma_pat) setFigmaPat(data.figma_pat) })
  }, [user.id])

  const mcpConfig = figmaPat
    ? { mcpServers: { loupe: { command: 'npx', args: ['-y', 'loupe-intelligence', '--endpoint', 'https://web-production-9cce.up.railway.app'], env: { FIGMA_PAT: figmaPat } } } }
    : { mcpServers: { loupe: { command: 'npx', args: ['-y', 'loupe-intelligence', '--endpoint', 'https://web-production-9cce.up.railway.app'] } } }

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
        background: 'rgba(3, 7, 18, 0.9)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
        padding: '0 32px', height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/loupe-icon.png" width={32} height={32} style={{ borderRadius: 8 }} alt="Loupe" />
          <span style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-heading)' }}>Loupe</span>
          <span style={{ fontSize: 12, color: 'var(--text-dim)', marginLeft: 4 }}>Dashboard</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Tier badge */}
          <div style={{
            padding: '4px 12px', borderRadius: 100, fontSize: 11, fontWeight: 700,
            background: isPro ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.06)',
            color: isPro ? 'var(--accent)' : 'var(--text-dim)',
            border: `1px solid ${isPro ? 'var(--accent)' : 'rgba(255,255,255,0.1)'}`
          }}>
            {isPro ? '⚡ PRO' : 'FREE'}
          </div>
          {/* Avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {avatar
              ? <img src={avatar} width={32} height={32} style={{ borderRadius: '50%', border: '2px solid var(--border)' }} alt="" />
              : <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>{initial}</div>
            }
            <span style={{ fontSize: 14, color: 'var(--text-dim)' }}>{displayName}</span>
          </div>
          <button
            onClick={onLogout}
            style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-dim)', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
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
          background: 'rgba(15, 23, 42, 0.4)'
        }}>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              style={{
                width: '100%', padding: '11px 16px', borderRadius: 10, border: 'none',
                background: tab === item.id ? 'rgba(99,102,241,0.15)' : 'transparent',
                color: tab === item.id ? 'var(--accent)' : 'var(--text-dim)',
                textAlign: 'left', fontWeight: 600, fontSize: 14, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4,
                borderLeft: tab === item.id ? '2px solid var(--accent)' : '2px solid transparent',
                transition: 'all 0.15s'
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
              <p style={{ color: 'var(--text-dim)', marginBottom: 40 }}>
                Connect Loupe to Claude, Cursor, or any MCP-compatible AI using the config below.
              </p>

              {isPro ? (
                <div>
                  {/* Config block */}
                  <div className="glass" style={{ padding: 32, marginBottom: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                      <div>
                        <div style={{ fontWeight: 700, marginBottom: 4 }}>MCP Configuration</div>
                        <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Add this to your Claude Desktop or Cursor settings</div>
                      </div>
                      <button
                        onClick={handleCopy}
                        className="btn btn-secondary"
                        style={{ padding: '8px 18px', fontSize: 13 }}
                      >
                        {copied ? '✓ Copied' : 'Copy JSON'}
                      </button>
                    </div>
                    <div style={{ background: '#000', padding: 24, borderRadius: 12, fontFamily: 'monospace', fontSize: 13, border: '1px solid var(--border)', overflowX: 'auto' }}>
                      <pre style={{ margin: 0, color: '#94a3b8', lineHeight: 1.7 }}>
                        {JSON.stringify(mcpConfig, null, 2)}
                      </pre>
                    </div>
                  </div>

                  {/* Endpoint status */}
                  <div className="glass" style={{ padding: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>Cloud Bridge Endpoint</div>
                      <div style={{ fontSize: 13, color: 'var(--text-dim)', fontFamily: 'monospace' }}>https://web-production-9cce.up.railway.app</div>
                    </div>
                    <div style={{ padding: '6px 14px', background: 'rgba(16,185,129,0.1)', color: '#10b981', borderRadius: 8, fontSize: 12, fontWeight: 700 }}>● ONLINE</div>
                  </div>

                  {/* Figma REST API Token */}
                  <div className="glass" style={{ padding: 32 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                      <div>
                        <div style={{ fontWeight: 700, marginBottom: 4 }}>Figma REST API Token</div>
                        <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Required for high-fidelity image exports and component analysis.</div>
                      </div>
                      <div style={{
                        padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                        background: figmaPat ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.06)',
                        color: figmaPat ? '#10b981' : 'var(--text-dim)'
                      }}>
                        {figmaPat ? '● ACTIVE' : '● NOT CONFIGURED'}
                      </div>
                    </div>

                    {patStatus === 'saved' && (
                      <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, fontSize: 13, color: '#10b981' }}>
                        Token saved successfully. The MCP config above has been updated.
                      </div>
                    )}
                    {patStatus === 'error' && (
                      <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, fontSize: 13, color: '#ef4444' }}>
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
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid var(--border)', borderRadius: 8,
                            color: 'var(--text)', fontSize: 13, fontFamily: 'monospace',
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
                            style={{ marginLeft: 8, fontSize: 12, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}
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
                  {/* Blurred preview */}
                  <div style={{ filter: 'blur(4px)', pointerEvents: 'none', userSelect: 'none', opacity: 0.5 }}>
                    <div className="glass" style={{ padding: 32, marginBottom: 24 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <div>
                          <div style={{ fontWeight: 700, marginBottom: 4 }}>MCP Configuration</div>
                          <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Add this to your Claude Desktop or Cursor settings</div>
                        </div>
                        <div className="btn btn-secondary" style={{ padding: '8px 18px', fontSize: 13 }}>Copy JSON</div>
                      </div>
                      <div style={{ background: '#000', padding: 24, borderRadius: 12, fontFamily: 'monospace', fontSize: 13, border: '1px solid var(--border)' }}>
                        <pre style={{ margin: 0, color: '#94a3b8', lineHeight: 1.7 }}>
                          {JSON.stringify(mcpConfig, null, 2)}
                        </pre>
                      </div>
                    </div>
                    <div className="glass" style={{ padding: 24 }}>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>Cloud Bridge Endpoint</div>
                      <div style={{ fontSize: 13, color: 'var(--text-dim)', fontFamily: 'monospace' }}>https://web-production-9cce.up.railway.app</div>
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
                    <div style={{ color: 'var(--text-dim)', fontSize: 14, textAlign: 'center', maxWidth: 320 }}>
                      MCP Bridge access is available on the Pro plan. Upgrade to connect Loupe to Claude and Cursor.
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
              <p style={{ color: 'var(--text-dim)', marginBottom: 40 }}>Your profile and plan details.</p>

              <div className="glass" style={{ padding: 32, marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32 }}>
                  {avatar
                    ? <img src={avatar} width={64} height={64} style={{ borderRadius: '50%', border: '3px solid var(--accent)' }} alt="" />
                    : <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 24 }}>{initial}</div>
                  }
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 700 }}>{displayName}</div>
                    <div style={{ fontSize: 14, color: 'var(--text-dim)' }}>{user.email}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div style={{ background: 'var(--surface)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Current Plan</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: isPro ? 'var(--accent)' : 'var(--text)' }}>
                      {isPro ? '⚡ Pro' : 'Free'}
                    </div>
                  </div>
                  <div style={{ background: 'var(--surface)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>MCP Access</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: isPro ? '#10b981' : '#ef4444' }}>
                      {isPro ? '● Active' : '● Locked'}
                    </div>
                  </div>
                  <div style={{ background: 'var(--surface)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Figma REST API</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: figmaPat ? '#10b981' : 'var(--text-dim)' }}>
                      {figmaPat ? '● Active' : '● Not set'}
                    </div>
                  </div>
                </div>
              </div>

              {!isPro && (
                <div className="glass" style={{ padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderColor: 'rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.04)' }}>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>Unlock the full Loupe experience</div>
                    <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Upgrade to Pro for MCP access, unlimited captures, and more.</div>
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
              <p style={{ color: 'var(--text-dim)', marginBottom: 40 }}>Unlock the full Loupe intelligence suite.</p>

              <div className="glass" style={{ padding: 48, maxWidth: 480, background: 'radial-gradient(circle at top right, rgba(99,102,241,0.08) 0%, transparent 60%)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', marginBottom: 12 }}>PRO PLAN</div>
                <div style={{ fontSize: 52, fontWeight: 800, marginBottom: 32 }}>$19<span style={{ fontSize: 20, color: 'var(--text-dim)', fontWeight: 400 }}>/mo</span></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 40 }}>
                  {[
                    'Unlimited elements per capture',
                    'MCP Bridge — connect to Claude & Cursor',
                    'Full-page scroll capture',
                    'Advanced Figma reconstruction',
                    'Priority support',
                  ].map((f, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, fontSize: 15 }}>
                      <span style={{ color: '#10b981', flexShrink: 0 }}>✓</span> {f}
                    </div>
                  ))}
                </div>
                <button className="btn btn-primary" style={{ width: '100%', fontSize: 16 }}>
                  Upgrade Now
                </button>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', textAlign: 'center', marginTop: 16 }}>
                  Cancel anytime · Billed monthly
                </div>
              </div>
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
        <div style={{ color: 'var(--text-dim)', fontSize: 14 }}>Loading...</div>
      </div>
    )
  }

  if (session) {
    return <Dashboard session={session} tier={tier} onLogout={handleLogout} />
  }

  return <LandingPage onLogin={handleLogin} loading={authLoading} />
}

export default App
