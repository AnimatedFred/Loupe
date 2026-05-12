import React from 'react';
import { TopNavBar, Footer } from './App';

const BASE_MCP = { mcpServers: { subsrf: { command: 'npx', args: ['-y', 'subsrf-intelligence', '--endpoint', 'https://api.subsrf.dev'] } } };

export default function PricingPage({ onLogin, loading, session, tier, onLogout, mcpConfig }) {
  const isPaid = tier === 'pro' || tier === 'starter';
  const displayConfig = isPaid && mcpConfig ? mcpConfig : BASE_MCP;
  return (
    <>
      <div className="fixed inset-0 pointer-events-none z-[-1] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-surface-container-low/20 via-void to-void"></div>
      <TopNavBar onLogin={onLogin} loading={loading} session={session} tier={tier} onLogout={onLogout} />

      <main className="max-w-[1080px] mx-auto px-md pt-4xl pb-2xl relative flex-grow w-full">
        {/* Hero Section */}
        <section className="text-center mb-3xl">
          <div className="inline-block px-sm py-xs border border-white-border rounded-full mb-md">
            <span className="font-label-caps text-[10px] text-neon tracking-widest uppercase">Infrastructure Grade Tooling</span>
          </div>
          <h1 className="font-display-lg text-display-lg text-white-primary mb-md">Engineered for your <span className="text-neon">pipeline.</span></h1>
          <p className="max-w-2xl mx-auto text-white-secondary text-subheading font-body">
            Choose the layer of access your workflow requires. From raw DOM inspection to full bidirectional AI-Figma orchestration.
          </p>
        </section>

        {/* Pricing Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-lg mb-4xl">
          {/* Free Tier */}
          <div className="bg-layer border border-white-border p-lg flex flex-col hover:border-white-secondary transition-colors group relative overflow-hidden">
            <div className="mb-xl">
              <h3 className="font-label-caps text-white-secondary mb-sm">FREE</h3>
              <div className="flex items-baseline gap-xs mb-sm">
                <span className="font-display-lg text-heading-md text-white-primary">$0</span>
                <span className="font-mono-data text-white-muted text-label-caps">/MO</span>
              </div>
              <p className="text-white-secondary font-mono-data text-label-caps leading-relaxed">Core capture and raw export. The essential developer toolkit.</p>
            </div>
            <div className="flex-grow space-y-md mb-xl">
              <div className="flex items-start gap-sm">
                <span className="material-symbols-outlined text-neon text-[18px]">check</span>
                <span className="font-mono-data text-white-primary text-label-caps">Smart Click & Region capture</span>
              </div>
              <div className="flex items-start gap-sm">
                <span className="material-symbols-outlined text-neon text-[18px]">check</span>
                <span className="font-mono-data text-white-primary text-label-caps">Raw UI Brief export</span>
              </div>
              <div className="flex items-start gap-sm">
                <span className="material-symbols-outlined text-neon text-[18px]">check</span>
                <span className="font-mono-data text-white-primary text-label-caps">CSS Export Mode</span>
              </div>
              <div className="flex items-start gap-sm">
                <span className="material-symbols-outlined text-status-warn text-[18px]">block</span>
                <span className="font-mono-data text-white-muted text-label-caps">Capped Figma Sync (5 elems)</span>
              </div>
            </div>
            <button onClick={session ? () => window.location.hash = '#dashboard' : onLogin} className="w-full py-md border border-white-border text-white-primary font-mono-data text-label-caps hover:bg-white-primary hover:text-void transition-all">
              {!session ? 'START BUILDING' : tier === 'free' ? 'CURRENT PLAN' : 'DOWNGRADE'}
            </button>
          </div>

          {/* Starter Tier (Recommended) */}
          <div className="bg-layer border-2 border-neon p-lg flex flex-col relative overflow-hidden shadow-[0_0_20px_rgba(0,255,135,0.15)] group">
            <div className="absolute top-0 right-0 bg-neon text-void font-label-caps text-[9px] px-md py-1 translate-x-[34%] translate-y-[100%] rotate-45">RECOMMENDED</div>
            <div className="mb-xl">
              <h3 className="font-label-caps text-neon mb-sm">STARTER</h3>
              <div className="flex items-baseline gap-xs mb-sm">
                <span className="font-display-lg text-heading-md text-white-primary">$9</span>
                <span className="font-mono-data text-white-muted text-label-caps">/MO</span>
              </div>
              <p className="text-white-secondary font-mono-data text-label-caps leading-relaxed">Studio unlocked. AI-assisted analysis for rapid prototyping.</p>
            </div>
            <div className="flex-grow space-y-md mb-xl">
              <div className="flex items-start gap-sm">
                <span className="material-symbols-outlined text-neon text-[18px]">check</span>
                <span className="font-mono-data text-white-primary text-label-caps">Everything in Free</span>
              </div>
              <div className="flex items-start gap-sm">
                <span className="material-symbols-outlined text-neon text-[18px]">check</span>
                <span className="font-mono-data text-white-primary text-label-caps">Subsrf Studio Annotation</span>
              </div>
              <div className="flex items-start gap-sm">
                <span className="material-symbols-outlined text-neon text-[18px]">check</span>
                <span className="font-mono-data text-white-primary text-label-caps">AI Analysis (75 credits/mo)</span>
              </div>
              <div className="flex items-start gap-sm">
                <span className="material-symbols-outlined text-neon text-[18px]">check</span>
                <span className="font-mono-data text-white-primary text-label-caps">Unlimited Figma Sync</span>
              </div>
            </div>
            <button onClick={session ? () => window.location.hash = '#dashboard' : onLogin} className="w-full py-md bg-neon text-void font-mono-data text-label-caps hover:opacity-90 active:scale-[0.98] transition-all">
              {!session ? 'UPGRADE NOW' : tier === 'starter' ? 'CURRENT PLAN' : tier === 'free' ? 'GET STARTER' : 'DOWNGRADE'}
            </button>
          </div>

          {/* Pro Tier */}
          <div className="bg-layer border border-white-border p-lg flex flex-col hover:border-neon transition-colors group relative overflow-hidden">
            <div className="mb-xl">
              <h3 className="font-label-caps text-white-secondary mb-sm">PRO</h3>
              <div className="flex items-baseline gap-xs mb-sm">
                <span className="font-display-lg text-heading-md text-white-primary">$19</span>
                <span className="font-mono-data text-white-muted text-label-caps">/MO</span>
              </div>
              <p className="text-white-secondary font-mono-data text-label-caps leading-relaxed">Full pipeline. Live Claude-to-Figma orchestration bridge.</p>
            </div>
            <div className="flex-grow space-y-md mb-xl">
              <div className="flex items-start gap-sm">
                <span className="material-symbols-outlined text-neon text-[18px]">check</span>
                <span className="font-mono-data text-white-primary text-label-caps">Everything in Starter</span>
              </div>
              <div className="flex items-start gap-sm">
                <span className="material-symbols-outlined text-neon text-[18px]">check</span>
                <span className="font-mono-data text-white-primary text-label-caps">MCP Bridge (Claude/Cursor)</span>
              </div>
              <div className="flex items-start gap-sm">
                <span className="material-symbols-outlined text-neon text-[18px]">check</span>
                <span className="font-mono-data text-white-primary text-label-caps">300 AI Credits / month</span>
              </div>
              <div className="flex items-start gap-sm">
                <span className="material-symbols-outlined text-neon text-[18px]">check</span>
                <span className="font-mono-data text-white-primary text-label-caps">Bidirectional Figma Control</span>
              </div>
            </div>
            <button onClick={session ? () => window.location.hash = '#dashboard' : onLogin} className="w-full py-md border border-white-border text-white-primary font-mono-data text-label-caps hover:bg-white-primary hover:text-void transition-all">
              {!session ? 'GO PRO' : tier === 'pro' ? 'CURRENT PLAN' : tier === 'starter' ? 'UPGRADE TO PRO' : 'GET PRO'}
            </button>
          </div>
        </section>

        {/* Detailed Feature Comparison */}
        <section className="mb-4xl">
          <h2 className="font-heading-sm text-heading-sm text-white-primary mb-xl text-center">Technical Specification</h2>
          <div className="overflow-x-auto border border-white-border">
            <table className="w-full text-left font-mono-data text-label-caps border-collapse">
              <thead>
                <tr className="bg-deep border-b border-white-border">
                  <th className="p-md text-white-muted font-normal">FEATURE</th>
                  <th className="p-md text-center text-white-muted font-normal">FREE</th>
                  <th className="p-md text-center text-white-muted font-normal bg-white-border/5">STARTER</th>
                  <th className="p-md text-center text-white-muted font-normal">PRO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white-border">
                {/* Capture Modes */}
                <tr className="bg-white-border/5">
                  <td className="p-md text-neon" colSpan="4">CAPTURE MODES</td>
                </tr>
                <tr>
                  <td className="p-md text-white-secondary">Smart Click Selection</td>
                  <td className="p-md text-center text-neon"><span className="material-symbols-outlined">check</span></td>
                  <td className="p-md text-center text-neon bg-white-border/5"><span className="material-symbols-outlined">check</span></td>
                  <td className="p-md text-center text-neon"><span className="material-symbols-outlined">check</span></td>
                </tr>
                <tr>
                  <td className="p-md text-white-secondary">Screenshot Capture</td>
                  <td className="p-md text-center text-white-muted text-xs">Watermarked</td>
                  <td className="p-md text-center text-neon bg-white-border/5"><span className="material-symbols-outlined">check</span></td>
                  <td className="p-md text-center text-neon"><span className="material-symbols-outlined">check</span></td>
                </tr>
                <tr>
                  <td className="p-md text-white-secondary">Full Page Capture</td>
                  <td className="p-md text-center text-white-muted text-xs">Watermarked</td>
                  <td className="p-md text-center text-white-secondary bg-white-border/5">5 / day</td>
                  <td className="p-md text-center text-neon">Unlimited</td>
                </tr>
                {/* Studio Editor */}
                <tr className="bg-white-border/5">
                  <td className="p-md text-neon" colSpan="4">STUDIO EDITOR</td>
                </tr>
                <tr>
                  <td className="p-md text-white-secondary">Annotation Canvas</td>
                  <td className="p-md text-center text-white-muted">—</td>
                  <td className="p-md text-center text-neon bg-white-border/5"><span className="material-symbols-outlined">check</span></td>
                  <td className="p-md text-center text-neon"><span className="material-symbols-outlined">check</span></td>
                </tr>
                <tr>
                  <td className="p-md text-white-secondary">Layers & Hierarchy</td>
                  <td className="p-md text-center text-white-muted">—</td>
                  <td className="p-md text-center text-neon bg-white-border/5"><span className="material-symbols-outlined">check</span></td>
                  <td className="p-md text-center text-neon"><span className="material-symbols-outlined">check</span></td>
                </tr>
                {/* AI Analysis */}
                <tr className="bg-white-border/5">
                  <td className="p-md text-neon" colSpan="4">AI ANALYSIS</td>
                </tr>
                <tr>
                  <td className="p-md text-white-secondary">Build Prompt Generation</td>
                  <td className="p-md text-center text-white-muted">—</td>
                  <td className="p-md text-center text-neon bg-white-border/5"><span className="material-symbols-outlined">check</span></td>
                  <td className="p-md text-center text-neon"><span className="material-symbols-outlined">check</span></td>
                </tr>
                {/* Figma Integration */}
                <tr className="bg-white-border/5">
                  <td className="p-md text-neon" colSpan="4">FIGMA INTEGRATION</td>
                </tr>
                <tr>
                  <td className="p-md text-white-secondary">Element Sync Limit</td>
                  <td className="p-md text-center text-white-secondary">5 elements</td>
                  <td className="p-md text-center text-neon bg-white-border/5">Unlimited</td>
                  <td className="p-md text-center text-neon">Unlimited</td>
                </tr>
                <tr>
                  <td className="p-md text-white-secondary">Claude Live Control</td>
                  <td className="p-md text-center text-white-muted">—</td>
                  <td className="p-md text-center text-white-muted bg-white-border/5">—</td>
                  <td className="p-md text-center text-neon"><span className="material-symbols-outlined">check</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-4xl grid md:grid-cols-2 gap-xl">
          <div>
            <h2 className="font-heading-sm text-heading-sm mb-lg">Queries</h2>
            <div className="space-y-lg">
              <div>
                <h4 className="font-mono-data text-white-primary mb-sm">What are credits used for?</h4>
                <p className="text-white-secondary font-body text-body">Credits are required for AI-powered operations like generating implementation briefs and smart prompts. Core functions like capturing, DOM export, and Figma syncing are credit-free.</p>
              </div>
              <div>
                <h4 className="font-mono-data text-white-primary mb-sm">Why do I need a Figma Token?</h4>
                <p className="text-white-secondary font-body text-body">Subsrf utilizes a Bring Your Own Key (BYOK) model for design synchronization. You provide your own Figma Personal Access Token to authenticate the Claude-to-Figma bridge, ensuring secure, direct REST API access to your design files without third-party intermediaries.</p>
              </div>
            </div>
          </div>
          <div className="bg-deep border border-white-border p-xl">
            <h4 className="font-mono-data text-white-primary mb-md">Bridge Configuration (Pro)</h4>
            <div className="bg-void p-md border border-white-border font-mono-data text-xs text-neon-dim overflow-hidden relative">
              <div className="absolute inset-0 z-10 flex items-center justify-center backdrop-blur-[3px] bg-void/30">
                <span className="font-label-caps text-white-primary border border-white-border px-sm py-xs bg-layer rounded">PRO ACCESS REQUIRED</span>
              </div>
              <pre className="text-neon opacity-50 select-none blur-[2px]">{JSON.stringify(displayConfig, null, 2)}</pre>
            </div>
            <p className="mt-md text-white-muted text-label-caps">Connect Claude Desktop, Cursor, or Zed in seconds.</p>
          </div>
        </section>

        {/* CTA Footer Section */}
        <section className="bg-neon p-2xl text-center rounded-xl relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white-primary to-transparent"></div>
          <h2 className="font-display-lg text-heading-md text-void mb-md relative z-10">Deploy the full pipeline today.</h2>
          <p className="text-void/80 text-subheading mb-xl max-w-xl mx-auto relative z-10">Join 2,000+ engineers building high-fidelity interfaces with AI orchestration.</p>
          <div className="flex flex-col sm:flex-row gap-md justify-center relative z-10">
            <button className="bg-void text-neon font-mono-data text-label-caps px-2xl py-md rounded-lg hover:opacity-90 active:scale-95 transition-all">GET STARTED FOR FREE</button>
            <button className="bg-void/10 border border-void/20 text-void font-mono-data text-label-caps px-2xl py-md rounded-lg hover:bg-void/20 transition-all">VIEW DOCUMENTATION</button>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
