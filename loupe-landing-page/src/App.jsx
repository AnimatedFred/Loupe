import React, { useState, useEffect } from 'react'

function App() {
  const [view, setView] = useState('landing'); // 'landing' or 'dashboard'
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [cloudStatus, setCloudStatus] = useState('active'); // active, syncing, offline

  const mcpConfig = {
    "mcpServers": {
      "loupe": {
        "command": "npx",
        "args": ["-y", "loupe-cloud-bridge", "--endpoint", "https://loupe-bridge.up.railway.app", "--key", "LOUPE_PRO_KEY_XXXX"]
      }
    }
  };
  return (
    <div className="landing-page">
      {/* Navigation */}
      <nav className="glass" style={{ position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: 1200, zIndex: 1000, padding: '12px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, background: 'var(--accent)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>L</div>
          <span style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-heading)' }}>Loupe</span>
        </div>
        <div style={{ display: 'flex', gap: 32, fontSize: 14, fontWeight: 500, color: 'var(--text-dim)' }}>
          <a href="#" onClick={() => setView('landing')} style={{ color: view === 'landing' ? 'var(--text)' : 'inherit', textDecoration: 'none' }}>Product</a>
          <a href="#features" style={{ color: 'inherit', textDecoration: 'none' }}>Features</a>
          <a href="#" onClick={() => setView('dashboard')} style={{ color: view === 'dashboard' ? 'var(--text)' : 'inherit', textDecoration: 'none' }}>Cloud Console</a>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {!isLoggedIn ? (
            <button className="btn btn-secondary" onClick={() => setIsLoggedIn(true)} style={{ padding: '8px 20px', fontSize: 14 }}>Log In</button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
               <span style={{ fontSize: 12, color: '#10b981' }}>● Cloud Active</span>
               <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surface-light)', border: '1px solid var(--border)' }}></div>
            </div>
          )}
          <button className="btn btn-primary" onClick={() => setView('dashboard')} style={{ padding: '8px 20px', fontSize: 14 }}>
            Get Pro
          </button>
        </div>
      </nav>

      {view === 'landing' ? (
        <>
          {/* Hero Section */}
          <header className="hero container animate-fade-in">
            <div className="glass" style={{ display: 'inline-block', padding: '6px 16px', borderRadius: 100, fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 24, border: '1px solid var(--accent)' }}>
              Introducing Loupe v2.8 — Design Intelligence
            </div>
            <h1 className="gradient-text">Design Intelligence <br />for the AI Era</h1>
            <p>Loupe is the ultimate bridge for AI-driven design. Capture live UI components and instantly synthesize them into high-fidelity "Knowledge Briefs" for your favorite LLMs.</p>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={() => setView('dashboard')}>Get Started for Free</button>
              <button className="btn btn-secondary">Watch Demo</button>
            </div>

            <div className="hero-mockup">
              <img src="/images/hero.png" alt="Loupe Interface" style={{ width: '100%', display: 'block' }} />
              <div className="glass" style={{ position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)', padding: '24px 40px', width: '80%', display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                 <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 24, fontWeight: 700 }}>99%</div>
                    <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Reconstruction Accuracy</div>
                 </div>
                 <div style={{ width: 1, height: 40, background: 'var(--border)' }}></div>
                 <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 24, fontWeight: 700 }}>2s</div>
                    <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Average Sync Time</div>
                 </div>
                 <div style={{ width: 1, height: 40, background: 'var(--border)' }}></div>
                 <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 24, fontWeight: 700 }}>10k+</div>
                    <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Elements Synced Daily</div>
                 </div>
              </div>
            </div>
          </header>

          {/* Features Section */}
          <section id="features" className="container" style={{ padding: '100px 0' }}>
            <div style={{ textAlign: 'center', marginBottom: 60 }}>
              <h2 style={{ fontSize: 40, marginBottom: 16 }}>Built for Modern Designers</h2>
              <p style={{ color: 'var(--text-dim)', maxWidth: 500, margin: '0 auto' }}>Everything you need to turn inspiration into production-ready design assets.</p>
            </div>

            <div className="features-grid">
              <div className="feature-card glass">
                <div className="feature-tag">AI Intelligence</div>
                <h3>Knowledge Briefs</h3>
                <p>Automatically synthesize captured UI into structured JSON briefs optimized for Claude and GPT prompts.</p>
              </div>
              <div className="feature-card glass">
                <div className="feature-tag">Local-First</div>
                <h3>MCP Design Bridge</h3>
                <p>Bring your own AI. Securely stream live UI data via the Model Context Protocol to your local environment.</p>
              </div>
              <div className="feature-card glass">
                <div className="feature-tag">Seamless Sync</div>
                <h3>Figma Pro Bridge</h3>
                <p>One-click bi-directional sync that reconstructs production-ready layers directly on your Figma canvas.</p>
              </div>
              <div className="feature-card glass">
                <div className="feature-tag">Precision Tools</div>
                <h3>Canvas Image Editor</h3>
                <p>Edit, crop, and annotate captures in a dedicated precision environment before syncing to your suite.</p>
              </div>
              <div className="feature-card glass">
                <div className="feature-tag">High Fidelity</div>
                <h3>Full-Page Capture</h3>
                <p>Advanced scrolling capture engine that extracts entire pages with pixel-perfect style and image fidelity.</p>
              </div>
              <div className="feature-card glass">
                <div className="feature-tag">Extraction</div>
                <h3>Smart DOM Mapping</h3>
                <p>Intelligently maps computed CSS and hierarchy to ensure design-token accuracy during reconstruction.</p>
              </div>
            </div>
          </section>

          {/* AI Prompting Section */}
          <section id="ai-prompting" className="container" style={{ padding: '100px 0', background: 'radial-gradient(circle at right, rgba(99, 102, 241, 0.05) 0%, transparent 50%)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 60, flexDirection: 'row-reverse' }}>
              <div style={{ flex: 1 }}>
                <div className="glass" style={{ display: 'inline-block', padding: '6px 12px', borderRadius: 8, fontSize: 10, fontWeight: 700, color: 'var(--accent)', marginBottom: 16, border: '1px solid var(--accent)', textTransform: 'uppercase' }}>Core Feature</div>
                <h2 style={{ fontSize: 48, marginBottom: 24 }}>Synthesize UI <br /><span style={{ color: 'var(--accent)' }}>Intelligence</span></h2>
                <p style={{ fontSize: 18, color: 'var(--text-dim)', marginBottom: 32 }}>Stop copying code. Loupe analyzes the entire computed state of your selection—styles, structure, and hierarchy—and generates a structured **Knowledge Brief** optimized for Claude, GPT, and Figma AI.</p>
                
                <div style={{ background: 'var(--surface)', padding: 24, borderRadius: 20, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>🤖</span>
                    "Analyze this component and suggest 3 modern variations..."
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-dim)', fontStyle: 'italic' }}>
                    Loupe provides the perfect context. The AI provides the design magic.
                  </div>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                 <div className="glass" style={{ padding: 20, borderRadius: 40, position: 'relative' }}>
                    <img src="/images/prompt.png" alt="Loupe Knowledge Brief UI" style={{ width: '100%', borderRadius: 24, boxShadow: '0 20px 50px rgba(99, 102, 241, 0.2)' }} />
                    <div className="glass" style={{ position: 'absolute', top: -20, right: -20, padding: '12px 20px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
                      ✨ AI Ready Context
                    </div>
                 </div>
              </div>
            </div>
          </section>
        </>
      ) : (
        <div className="container animate-fade-in" style={{ padding: '160px 0 100px' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <h1 className="gradient-text">Cloud Console</h1>
            <p>Manage your design intelligence assets across all devices.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 40 }}>
            <div className="glass" style={{ padding: 32 }}>
              <h2 style={{ fontSize: 18, marginBottom: 24 }}>System Identity</h2>
              
              <div style={{ marginBottom: 32 }}>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>PERSONAL API KEY</div>
                <div style={{ background: '#000', padding: 12, borderRadius: 8, fontFamily: 'monospace', fontSize: 12, border: '1px solid var(--border)', position: 'relative', color: 'var(--accent)' }}>
                  lp_live_49k28sm1z9...
                  <button style={{ position: 'absolute', right: 8, top: 8, background: 'var(--surface-light)', border: 'none', color: 'var(--text)', padding: '4px 8px', borderRadius: 4, fontSize: 10, cursor: 'pointer' }}>Reveal</button>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 8 }}>Use this key to authorize your Extension and Figma Plugin.</div>
              </div>

              <div className="glass" style={{ padding: 20, background: 'rgba(255,255,255,0.02)' }}>
                 <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Cloud Vault Status</div>
                 <div style={{ fontSize: 12, color: '#10b981' }}>Active • 1.2GB / 10GB used</div>
                 <div style={{ width: '100%', height: 4, background: 'var(--surface-light)', borderRadius: 2, marginTop: 12 }}>
                    <div style={{ width: '12%', height: '100%', background: 'var(--accent)', borderRadius: 2 }}></div>
                 </div>
              </div>
            </div>

            <div className="glass" style={{ padding: 32 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2 style={{ fontSize: 18 }}>Recent Syncs</h2>
                <button style={{ background: 'transparent', border: 'none', color: 'var(--accent)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>View All</button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { n: 'Hero Section Grid', t: '2 mins ago', s: 'Chrome' },
                  { n: 'Navigation Component', t: '14 mins ago', s: 'Edge' },
                  { n: 'Feature Bento Cards', t: '1 hour ago', s: 'Chrome' },
                  { n: 'Footer Metadata', t: '3 hours ago', s: 'Safari' }
                ].map((item, i) => (
                  <div key={i} className="glass" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{item.n}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{item.s} • {item.t}</div>
                    </div>
                    <button className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: 11 }}>View Brief</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="glass" style={{ marginTop: 40, padding: 40 }}>
             <h2 style={{ fontSize: 24, marginBottom: 32 }}>AI Integration (MCP)</h2>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60 }}>
                <div>
                   <p style={{ fontSize: 14, color: 'var(--text-dim)', marginBottom: 24 }}>To enable Loupe design intelligence in Claude or GPT, use our global MCP proxy. This allows the AI to fetch your cloud captures instantly.</p>
                   <button className="btn btn-primary" style={{ width: '100%' }}>Copy MCP Configuration</button>
                </div>
                <div style={{ background: '#000', padding: 20, borderRadius: 12, fontFamily: 'monospace', fontSize: 12, border: '1px solid var(--border)', overflowX: 'auto' }}>
                  <pre style={{ margin: 0, color: '#94a3b8' }}>
                    {JSON.stringify(mcpConfig, null, 2)}
                  </pre>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Bridge Section */}
      <section id="how-it-works" className="container" style={{ padding: '100px 0', display: 'flex', alignItems: 'center', gap: 60 }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 48, marginBottom: 24 }}>The Bridge Between <br /><span style={{ color: 'var(--accent)' }}>Dev & Design</span></h2>
          <p style={{ fontSize: 18, color: 'var(--text-dim)', marginBottom: 32 }}>Loupe uses a specialized MCP (Model Context Protocol) bridge to securely stream live UI data from your browser to your local Figma plugin.</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {[
              { t: 'Local-First Security', d: 'Your design data never leaves your machine. The bridge runs entirely on your local network.' },
              { t: 'High-Fidelity Rendering', d: 'Computed styles, SVGs, and images are reconstructed using Figma’s native API.' },
              { t: 'Real-Time Sync', d: 'Changes in the browser reflect in Figma in under 2 seconds.' }
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
              <img src="/images/bridge.png" alt="Loupe Bridge illustration" style={{ width: '100%', borderRadius: 24 }} />
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
          <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Twitter</a>
        </div>
      </footer>
    </div>
  )
}

export default App
