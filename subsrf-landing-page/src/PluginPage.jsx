import React from 'react';
import { TopNavBar, Footer } from './App';

export default function PluginPage({ onLogin, loading, session, tier, onLogout }) {
  return (
    <>
      <div className="fixed inset-0 pointer-events-none z-[-1] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-surface-container-low/20 via-void to-void"></div>
      <TopNavBar onLogin={onLogin} loading={loading} session={session} tier={tier} onLogout={onLogout} />

      <main className="flex-grow pt-4xl pb-xl w-full">
        <div className="max-w-[1080px] mx-auto px-lg flex flex-col gap-2xl">
          {/* Hero Section */}
          <header className="flex flex-col gap-lg border-b border-white-border pb-xl text-center items-center">
            <div className="flex flex-col gap-sm items-center">
              <span className="font-label-caps text-label-caps text-neon uppercase flex items-center gap-xs">
                <span className="w-2 h-2 rounded-full bg-neon"></span>
                Platform Infrastructure
              </span>
              <h1 className="font-display-lg text-display-lg text-white-primary">Figma Plugin</h1>
              <p className="font-subheading text-subheading text-white-secondary max-w-2xl">
                The definitive bridge connecting your browser context to the design canvas, and empowering AI to interface directly with your Figma files.
              </p>
            </div>
            <div className="flex gap-md mt-md">
              <button className="font-mono-data text-mono-data text-void bg-neon px-lg py-md rounded active:scale-95 transition-transform hover:opacity-90 flex items-center gap-sm">
                <span className="material-symbols-outlined text-[18px]">download</span>
                Get from Figma Community
              </button>
            </div>
          </header>
          {/* Media Space */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-lg">
            <div className="bg-layer border border-white-border p-md rounded-lg flex flex-col gap-md relative group overflow-hidden">
              <div className="absolute inset-0 bg-neon opacity-0 group-hover:opacity-5 transition-opacity duration-300 pointer-events-none"></div>
              <div className="flex items-center justify-between border-b border-white-border pb-sm">
                <span className="font-label-caps text-label-caps text-white-secondary">Plugin Interface</span>
              </div>
              <div className="aspect-video bg-deep rounded border border-white-border flex items-center justify-center overflow-hidden">
                <img alt="Plugin Screenshot" className="w-full h-full object-cover opacity-80" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC5fvap01UTsnaNWA_meQtcI7egxqkRmapyqm42qNVAOVqAeeKsUZqbMNNDVCwcLfm9z8WAngRKzFZ7H8w2NstumtqDbYPepKSS-ehH_Tp9yss6M9G2P4Fm9LM_caqudraoodsc4Wfm5l-Xu2r7jQaOpG65pR_cn2BEenPl6bMgHs5MJifkKx-nDxlDmZDsU6meLc9FtJtDnfBZQ4Iamw5HXtL_kVDqa_HA5cPyim8zvqQTWl3wiIQ_DCk7-6Hik22D2eidnHAUiw"/>
              </div>
            </div>
            <div className="bg-layer border border-white-border p-md rounded-lg flex flex-col gap-md relative group overflow-hidden">
              <div className="absolute inset-0 bg-neon opacity-0 group-hover:opacity-5 transition-opacity duration-300 pointer-events-none"></div>
              <div className="flex items-center justify-between border-b border-white-border pb-sm">
                <span className="font-label-caps text-label-caps text-white-secondary">Live Demo</span>
              </div>
              <div className="aspect-video bg-deep rounded border border-white-border flex items-center justify-center relative cursor-pointer group-hover:border-neon transition-colors duration-300">
                <span className="material-symbols-outlined text-[48px] text-white-secondary group-hover:text-neon transition-colors duration-300">play_circle</span>
                <div className="absolute bottom-sm right-sm font-mono-data text-[10px] text-white-muted bg-void px-2 py-1 rounded">2:45</div>
              </div>
            </div>
          </section>
          {/* Two Column Features */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-xl">
            {/* Feature 1: MCP Bridge */}
            <article className="flex flex-col gap-md">
              <div className="flex items-center gap-md border-b border-white-border pb-md">
                <div className="w-10 h-10 rounded-full bg-surface border border-white-border flex items-center justify-center text-neon">
                  <span className="material-symbols-outlined">sync_alt</span>
                </div>
                <h2 className="font-heading-sm text-heading-sm text-white-primary">Browser to Figma Bridge</h2>
              </div>
              <p className="font-body text-body text-white-secondary">
                The ultimate connection between the Subsrf Chrome Extension and Figma. Seamlessly transport live web elements straight to your design canvas.
              </p>
              <ul className="flex flex-col gap-sm font-body text-body text-white-secondary mt-sm">
                <li className="flex items-start gap-sm">
                  <span className="material-symbols-outlined text-neon text-[20px] mt-1">check</span>
                  <span>Mark elements in any live browser tab using the extension.</span>
                </li>
                <li className="flex items-start gap-sm">
                  <span className="material-symbols-outlined text-neon text-[20px] mt-1">check</span>
                  <span>Hit 'Sync to Figma' to instantly recreate complex structures.</span>
                </li>
                <li className="flex items-start gap-sm">
                  <span className="material-symbols-outlined text-neon text-[20px] mt-1">check</span>
                  <span>Preserves layout, typography, and computed CSS properties accurately.</span>
                </li>
              </ul>
              <div className="bg-deep border border-white-border p-md mt-auto rounded">
                <div className="font-mono-data text-mono-data text-white-secondary text-[11px] mb-xs">Workflow:</div>
                <div className="flex items-center gap-sm text-[12px] font-mono-data text-white-primary">
                  <span className="bg-surface px-2 py-1 rounded border border-white-border">Browser</span>
                  <span className="text-neon-dim">→</span>
                  <span className="bg-surface px-2 py-1 rounded border border-white-border">Extension</span>
                  <span className="text-neon-dim">→</span>
                  <span className="bg-surface px-2 py-1 rounded border border-neon text-neon">Figma</span>
                </div>
              </div>
            </article>
            {/* Feature 2: AI Bridge */}
            <article className="flex flex-col gap-md">
              <div className="flex items-center gap-md border-b border-white-border pb-md">
                <div className="w-10 h-10 rounded-full bg-surface border border-white-border flex items-center justify-center text-tertiary-fixed-dim">
                  <span className="material-symbols-outlined">smart_toy</span>
                </div>
                <h2 className="font-heading-sm text-heading-sm text-white-primary">Figma to AI Bridge</h2>
              </div>
              <p className="font-body text-body text-white-secondary">
                Unlock programmatic design capabilities by connecting LLMs directly to your Figma files. One of the most powerful intelligence bridges available for designers.
              </p>
              <ul className="flex flex-col gap-sm font-body text-body text-white-secondary mt-sm">
                <li className="flex items-start gap-sm">
                  <span className="material-symbols-outlined text-tertiary-fixed-dim text-[20px] mt-1">check</span>
                  <span>Connect via MCP or Figma REST API.</span>
                </li>
                <li className="flex items-start gap-sm">
                  <span className="material-symbols-outlined text-tertiary-fixed-dim text-[20px] mt-1">check</span>
                  <span>Compatible with Claude, Cursor, Antigravity, and custom agents.</span>
                </li>
                <li className="flex items-start gap-sm">
                  <span className="material-symbols-outlined text-tertiary-fixed-dim text-[20px] mt-1">check</span>
                  <span>Enable AI to read document structure and generate native Figma nodes.</span>
                </li>
              </ul>
              <div className="bg-deep border border-white-border p-md mt-auto rounded overflow-hidden">
                <div className="font-mono-data text-mono-data text-white-secondary text-[11px] mb-xs">Example Prompt:</div>
                <div className="font-mono-data text-mono-data text-white-primary text-[12px] opacity-80">
                  "Analyze the selected frame and generate a dark mode variant using the current color variables."
                </div>
              </div>
            </article>
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}
