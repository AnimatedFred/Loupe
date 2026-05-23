import React, { useState, useEffect } from 'react';
import { TopNavBar, Footer } from './App';

const BASE_MCP = { mcpServers: { subsrf: { command: 'npx', args: ['-y', 'subsrf-intelligence', '--endpoint', 'https://api.subsrf.dev'] } } };

export default function PricingPage({ onLogin, loading, session, tier, onLogout, mcpConfig }) {
  const isPro = tier === 'pro';
  const displayConfig = isPro && mcpConfig ? mcpConfig : BASE_MCP;
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeError, setUpgradeError] = useState(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [cancelScheduled, setCancelScheduled] = useState(false);

  useEffect(() => {
    if (!session?.access_token || !isPro) return;
    fetch('https://api.subsrf.dev/api/stripe/subscription', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.cancelAtPeriodEnd) setCancelScheduled(true); })
      .catch(() => {});
  }, [session?.access_token, isPro]);

  const handleUpgrade = async () => {
    if (!session) return onLogin();
    setUpgrading(true);
    setUpgradeError(null);
    try {
      const res = await fetch('https://api.subsrf.dev/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: 'pro' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start checkout');
      window.location.href = data.url;
    } catch (e) {
      setUpgradeError(e.message);
      setUpgrading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!session) return;
    setPortalLoading(true);
    try {
      const res = await fetch('https://api.subsrf.dev/api/stripe/create-portal-session', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to open billing portal');
      window.location.href = data.url;
    } catch (e) {
      setUpgradeError(e.message);
      setPortalLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 pointer-events-none z-[-1] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-surface-container-low/20 via-void to-void"></div>
      <TopNavBar onLogin={onLogin} loading={loading} session={session} tier={tier} onLogout={onLogout} />

      <main className="max-w-[1080px] mx-auto px-md pt-4xl pb-2xl relative flex-grow w-full">
        {/* Hero */}
        <section className="text-center mb-3xl">
          <div className="inline-block px-sm py-xs border border-white-border rounded-full mb-md">
            <span className="font-label-caps text-[10px] text-neon tracking-widest uppercase">Infrastructure Grade Tooling</span>
          </div>
          <h1 className="font-display-lg text-display-lg text-white-primary mb-md">Engineered for your <span className="text-neon">pipeline.</span></h1>
          <p className="max-w-2xl mx-auto text-white-secondary text-subheading font-body">
            Two tiers. Full access or essential tooling. No in-between complexity.
          </p>
        </section>

        {upgradeError && (
          <div className="mb-xl p-md bg-red-500/10 border border-red-500/20 rounded-DEFAULT font-mono-data text-label-caps text-red-400">
            {upgradeError}
          </div>
        )}

        {/* Pricing Grid — 2 columns */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-lg mb-4xl max-w-[720px] mx-auto">

          {/* Free */}
          <div className="bg-layer border border-white-border p-lg flex flex-col hover:border-white-secondary transition-colors relative overflow-hidden">
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
                <span className="font-mono-data text-white-muted text-label-caps">Capped Figma Sync (5 elements)</span>
              </div>
              <div className="flex items-start gap-sm">
                <span className="material-symbols-outlined text-status-warn text-[18px]">block</span>
                <span className="font-mono-data text-white-muted text-label-caps">Watermarked captures</span>
              </div>
            </div>
            <button
              disabled
              className="w-full py-md border border-white-border text-white-muted font-mono-data text-label-caps opacity-50 cursor-default"
            >
              {!session ? 'FREE FOREVER' : tier === 'free' ? 'CURRENT PLAN' : 'FREE TIER'}
            </button>
          </div>

          {/* Pro */}
          <div className="bg-layer border-2 border-neon p-lg flex flex-col relative overflow-hidden shadow-[0_0_20px_rgba(0,255,135,0.15)]">
            <div className="absolute top-0 right-0 bg-neon text-void font-label-caps text-[9px] px-md py-1 translate-x-[34%] translate-y-[100%] rotate-45">RECOMMENDED</div>
            <div className="mb-xl">
              <h3 className="font-label-caps text-neon mb-sm">PRO</h3>
              <div className="flex items-baseline gap-xs mb-sm">
                <span className="font-display-lg text-heading-md text-white-primary">$19</span>
                <span className="font-mono-data text-white-muted text-label-caps">/MO</span>
              </div>
              <p className="text-white-secondary font-mono-data text-label-caps leading-relaxed">Full pipeline access. 250 AI credits / month.</p>
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
                <span className="font-mono-data text-white-primary text-label-caps">MCP Bridge (Claude / Cursor)</span>
              </div>
              <div className="flex items-start gap-sm">
                <span className="material-symbols-outlined text-neon text-[18px]">check</span>
                <span className="font-mono-data text-white-primary text-label-caps">Unlimited Figma Sync + AI Analysis</span>
              </div>
              <div className="flex items-start gap-sm">
                <span className="material-symbols-outlined text-neon text-[18px]">check</span>
                <span className="font-mono-data text-white-primary text-label-caps">250 AI Credits / month</span>
              </div>
            </div>

            {isPro ? (
              <button
                onClick={handleCancelSubscription}
                disabled={portalLoading || cancelScheduled}
                className="w-full py-md border border-white-border text-white-secondary font-mono-data text-label-caps hover:border-red-500/50 hover:text-red-400 transition-all disabled:opacity-50 disabled:cursor-default"
              >
                {cancelScheduled ? 'CANCELLATION SCHEDULED' : portalLoading ? 'WAIT...' : 'CANCEL SUBSCRIPTION'}
              </button>
            ) : (
              <button
                onClick={handleUpgrade}
                disabled={upgrading}
                className="w-full py-md bg-neon text-void font-mono-data text-label-caps hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-default"
              >
                {upgrading ? 'WAIT...' : !session ? 'GET PRO' : 'GET PRO'}
              </button>
            )}
          </div>
        </section>

        {/* Feature Comparison Table */}
        <section className="mb-4xl">
          <h2 className="font-heading-sm text-heading-sm text-white-primary mb-xl text-center">Technical Specification</h2>
          <div className="overflow-x-auto border border-white-border">
            <table className="w-full text-left font-mono-data text-label-caps border-collapse">
              <thead>
                <tr className="bg-deep border-b border-white-border">
                  <th className="p-md text-white-muted font-normal">FEATURE</th>
                  <th className="p-md text-center text-white-muted font-normal">FREE</th>
                  <th className="p-md text-center text-neon font-normal bg-white-border/5">PRO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white-border">
                <tr className="bg-white-border/5">
                  <td className="p-md text-neon" colSpan="3">CAPTURE MODES</td>
                </tr>
                <tr>
                  <td className="p-md text-white-secondary">Smart Click Selection</td>
                  <td className="p-md text-center text-neon"><span className="material-symbols-outlined">check</span></td>
                  <td className="p-md text-center text-neon bg-white-border/5"><span className="material-symbols-outlined">check</span></td>
                </tr>
                <tr>
                  <td className="p-md text-white-secondary">Screenshot Capture</td>
                  <td className="p-md text-center text-white-muted text-xs">Watermarked</td>
                  <td className="p-md text-center text-neon bg-white-border/5"><span className="material-symbols-outlined">check</span></td>
                </tr>
                <tr>
                  <td className="p-md text-white-secondary">Full Page Capture</td>
                  <td className="p-md text-center text-white-muted text-xs">Watermarked</td>
                  <td className="p-md text-center text-neon bg-white-border/5"><span className="material-symbols-outlined">check</span></td>
                </tr>
                <tr className="bg-white-border/5">
                  <td className="p-md text-neon" colSpan="3">STUDIO EDITOR</td>
                </tr>
                <tr>
                  <td className="p-md text-white-secondary">Annotation Canvas</td>
                  <td className="p-md text-center text-white-muted">—</td>
                  <td className="p-md text-center text-neon bg-white-border/5"><span className="material-symbols-outlined">check</span></td>
                </tr>
                <tr>
                  <td className="p-md text-white-secondary">Layers & Hierarchy</td>
                  <td className="p-md text-center text-white-muted">—</td>
                  <td className="p-md text-center text-neon bg-white-border/5"><span className="material-symbols-outlined">check</span></td>
                </tr>
                <tr className="bg-white-border/5">
                  <td className="p-md text-neon" colSpan="3">AI ANALYSIS</td>
                </tr>
                <tr>
                  <td className="p-md text-white-secondary">Credits / month</td>
                  <td className="p-md text-center text-white-muted">0</td>
                  <td className="p-md text-center text-neon bg-white-border/5">250</td>
                </tr>
                <tr>
                  <td className="p-md text-white-secondary">Build Prompt Generation</td>
                  <td className="p-md text-center text-white-muted">—</td>
                  <td className="p-md text-center text-neon bg-white-border/5"><span className="material-symbols-outlined">check</span></td>
                </tr>
                <tr>
                  <td className="p-md text-white-secondary">Subsrf Compose (Figma)</td>
                  <td className="p-md text-center text-white-muted">—</td>
                  <td className="p-md text-center text-neon bg-white-border/5"><span className="material-symbols-outlined">check</span></td>
                </tr>
                <tr className="bg-white-border/5">
                  <td className="p-md text-neon" colSpan="3">FIGMA INTEGRATION</td>
                </tr>
                <tr>
                  <td className="p-md text-white-secondary">Element Sync Limit</td>
                  <td className="p-md text-center text-white-secondary">5 elements</td>
                  <td className="p-md text-center text-neon bg-white-border/5">Unlimited</td>
                </tr>
                <tr>
                  <td className="p-md text-white-secondary">MCP Bridge (Claude/Cursor)</td>
                  <td className="p-md text-center text-white-muted">—</td>
                  <td className="p-md text-center text-neon bg-white-border/5"><span className="material-symbols-outlined">check</span></td>
                </tr>
                <tr>
                  <td className="p-md text-white-secondary">Claude Live Control</td>
                  <td className="p-md text-center text-white-muted">—</td>
                  <td className="p-md text-center text-neon bg-white-border/5"><span className="material-symbols-outlined">check</span></td>
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
              <div>
                <h4 className="font-mono-data text-white-primary mb-sm">How do I cancel?</h4>
                <p className="text-white-secondary font-body text-body">Pro subscribers can cancel anytime from the pricing page. Your plan stays active until the end of the current billing period — no surprises.</p>
              </div>
            </div>
          </div>
          <div className="bg-deep border border-white-border p-xl">
            <h4 className="font-mono-data text-white-primary mb-md">Bridge Configuration (Pro)</h4>
            <div className="bg-void p-md border border-white-border font-mono-data text-xs text-neon-dim overflow-hidden relative">
              {!isPro && (
                <div className="absolute inset-0 z-10 flex items-center justify-center backdrop-blur-[3px] bg-void/30">
                  <span className="font-label-caps text-white-primary border border-white-border px-sm py-xs bg-layer rounded">PRO ACCESS REQUIRED</span>
                </div>
              )}
              <pre className={`text-neon ${!isPro ? 'opacity-50 select-none blur-[2px]' : ''}`}>{JSON.stringify(displayConfig, null, 2)}</pre>
            </div>
            <p className="mt-md text-white-muted text-label-caps">Connect Claude Desktop, Cursor, or Zed in seconds.</p>
          </div>
        </section>

        {/* CTA Footer */}
        <section className="bg-neon p-2xl text-center rounded-xl relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white-primary to-transparent"></div>
          <h2 className="font-display-lg text-heading-md text-void mb-md relative z-10">Deploy the full pipeline today.</h2>
          <p className="text-void/80 text-subheading mb-xl max-w-xl mx-auto relative z-10">Join 2,000+ engineers building high-fidelity interfaces with AI orchestration.</p>
          <div className="flex flex-col sm:flex-row gap-md justify-center relative z-10">
            <button
              onClick={!session || !isPro ? handleUpgrade : undefined}
              disabled={isPro}
              className="bg-void text-neon font-mono-data text-label-caps px-2xl py-md rounded-lg hover:opacity-90 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-default"
            >
              {isPro ? 'CURRENTLY ON PRO' : 'GET PRO — $19/MO'}
            </button>
            <button
              onClick={() => window.location.href = '/docs'}
              className="bg-void/10 border border-void/20 text-void font-mono-data text-label-caps px-2xl py-md rounded-lg hover:bg-void/20 transition-all"
            >
              VIEW DOCUMENTATION
            </button>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
