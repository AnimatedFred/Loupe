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
          <section className="border-b border-white-border pb-4xl w-full">
            <div className="bg-layer border border-white-border p-md rounded-lg flex flex-col gap-md relative group overflow-hidden">
              <div className="absolute inset-0 bg-neon opacity-0 group-hover:opacity-5 transition-opacity duration-300 pointer-events-none"></div>
              <div className="flex items-center justify-between border-b border-white-border pb-sm">
                <span className="font-label-caps text-label-caps text-white-secondary">Product Walkthrough</span>
              </div>
              <div className="aspect-video bg-deep rounded border border-white-border flex items-center justify-center relative cursor-pointer group-hover:border-neon transition-colors duration-300">
                <span className="material-symbols-outlined text-[64px] text-white-secondary group-hover:text-neon transition-colors duration-300">play_circle</span>
                <div className="absolute bottom-md right-md font-mono-data text-[12px] text-white-muted bg-void px-3 py-1.5 rounded">2:45</div>
              </div>
            </div>
          </section>

          {/* Features Stacked Layout */}
          <section className="flex flex-col gap-4xl pt-xl">
            {/* Feature 1: MCP Bridge (Text Left, Media Right) */}
            <article className="grid grid-cols-1 lg:grid-cols-2 gap-2xl items-center">
              <div className="flex flex-col gap-lg order-2 lg:order-1">
                <div className="flex flex-col gap-sm">
                  <div className="w-12 h-12 rounded-full bg-surface border border-white-border flex items-center justify-center text-neon mb-sm">
                    <span className="material-symbols-outlined text-[24px]">sync_alt</span>
                  </div>
                  <div className="font-label-caps text-label-caps text-neon uppercase tracking-widest mb-1">Live Sync Module</div>
                  <h2 className="font-heading-md text-heading-md text-white-primary">Browser to Figma Bridge</h2>
                </div>
                <p className="font-subheading text-subheading text-white-secondary leading-relaxed">
                  The ultimate connection between the Subsrf Chrome Extension and Figma. Seamlessly transport live web elements straight to your design canvas.
                </p>
                <ul className="flex flex-col gap-md font-body text-body text-white-secondary mt-sm">
                  <li className="flex items-start gap-md">
                    <span className="material-symbols-outlined text-neon text-[24px]">check_circle</span>
                    <span className="">Mark elements in any live browser tab using the extension.</span>
                  </li>
                  <li className="flex items-start gap-md">
                    <span className="material-symbols-outlined text-neon text-[24px]">check_circle</span>
                    <span className="">Hit 'Sync  Selection to Figma' to instantly recreate complex structures.</span>
                  </li>
                  <li className="flex items-start gap-md">
                    <span className="material-symbols-outlined text-neon text-[24px]">check_circle</span>
                    <span className="">Preserves layout, typography, and computed CSS properties accurately.</span>
                  </li>
                </ul>
                <div className="bg-deep border border-white-border p-md mt-md rounded w-full lg:w-max max-w-full overflow-hidden">
                  <div className="font-mono-data text-mono-data text-white-secondary text-[11px] mb-xs uppercase tracking-widest">Workflow Metadata</div>
                  <div className="flex flex-wrap items-center gap-md text-[13px] font-mono-data text-white-primary">
                    <span className="bg-surface px-3 py-1.5 rounded border border-white-border flex items-center gap-2"><span className="material-symbols-outlined text-[16px]">public</span> Browser</span>
                    <span className="text-neon-dim material-symbols-outlined text-[16px]">arrow_forward</span>
                    <span className="bg-surface px-3 py-1.5 rounded border border-white-border flex items-center gap-2"><span className="material-symbols-outlined text-[16px]">extension</span> Extension</span>
                    <span className="text-neon-dim material-symbols-outlined text-[16px]">arrow_forward</span>
                    <span className="bg-surface px-3 py-1.5 rounded border border-neon text-neon flex items-center gap-2"><span className="material-symbols-outlined text-[16px]">design_services</span> Figma</span>
                  </div>
                </div>
              </div>
              <div className="order-1 lg:order-2 bg-layer border border-white-border p-md rounded-lg aspect-square lg:aspect-auto lg:h-[600px] flex items-center justify-center relative overflow-hidden group min-w-0">
                <div className="absolute inset-0 bg-neon opacity-0 group-hover:opacity-5 transition-opacity duration-300 pointer-events-none z-20"></div>
                <img alt="Browser to Figma Screenshot" className="w-full h-full object-cover opacity-60 mix-blend-luminosity hover:mix-blend-normal transition-all duration-500 rounded relative z-0" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBvpfjjHXgsP7LWE9K7cLJer7oVWTU3PuvqeteRIyh1NSLNMDLhFDLl2-5UUOd-LIDvmvS5_j9JHWiOXmvBgx3F-QKZx8Trmymui8nQLz84qraBR710wRKA5sHNj_LRPOJlP7VcKq-laZsR7NRv0_jFP4L9gm8_074g64r_rXPBeq2kSmqLTQy3qgFM4DiyqgmWsbzzlY_KdqVWzovSWPcCnLwU07dYSc61SNRnj3oGy0KJIEIyjHrYRFj26B5Pven8j7fUASbivA"/>
                <div className="absolute bottom-md left-md right-md z-10 bg-void/80 backdrop-blur border border-white-border p-sm rounded font-mono-data text-mono-data text-white-primary flex justify-between items-center">
                  <span className="text-white-muted">src/modules/sync.ts</span>
                  <span className="text-neon flex items-center gap-xs"><span className="material-symbols-outlined text-[14px]">bolt</span> ACTIVE</span>
                </div>
              </div>
            </article>

            {/* Feature 2: AI Bridge (Media Left, Text Right) */}
            <article className="grid grid-cols-1 lg:grid-cols-2 gap-2xl items-center">
              <div className="order-1 lg:order-1 bg-layer border border-white-border p-md rounded-lg aspect-square lg:aspect-auto lg:h-[600px] flex items-center justify-center relative overflow-hidden group min-w-0">
                <div className="absolute inset-0 bg-tertiary-fixed-dim opacity-0 group-hover:opacity-5 transition-opacity duration-300 pointer-events-none z-20"></div>
                <video autoPlay loop muted playsInline className="w-full h-full object-cover opacity-60 mix-blend-luminosity hover:mix-blend-normal transition-all duration-500 rounded relative z-0" src="/FigmaBridge.mov"/>
                <div className="absolute top-md left-md z-10 bg-void/80 backdrop-blur border border-white-border p-sm rounded font-mono-data text-mono-data text-white-primary flex flex-col gap-1">
                  <span className="text-tertiary-fixed-dim flex items-center gap-xs"><span className="material-symbols-outlined text-[14px]">network_node</span> NODE CONNECTED</span>
                  <span className="text-white-muted text-[11px]">ws://localhost:3000/mcp</span>
                </div>
              </div>
              <div className="flex flex-col gap-lg order-2 lg:order-2">
                <div className="flex flex-col gap-sm">
                  <div className="w-12 h-12 rounded-full bg-surface border border-white-border flex items-center justify-center text-tertiary-fixed-dim mb-sm">
                    <span className="material-symbols-outlined text-[24px]">smart_toy</span>
                  </div>
                  <div className="font-label-caps text-label-caps text-tertiary-fixed-dim uppercase tracking-widest mb-1">Intelligence Protocol</div>
                  <h2 className="font-heading-md text-heading-md text-white-primary">Figma to AI Bridge</h2>
                </div>
                <p className="font-subheading text-subheading text-white-secondary leading-relaxed">
                  Unlock programmatic design capabilities by connecting LLMs directly to your Figma files. One of the most powerful intelligence bridges available for designers.
                </p>
                <ul className="flex flex-col gap-md font-body text-body text-white-secondary mt-sm">
                  <li className="flex items-start gap-md">
                    <span className="material-symbols-outlined text-tertiary-fixed-dim text-[24px]">check_circle</span>
                    <span className="">Connect via Model Context Protocol (MCP) or Figma REST API.</span>
                  </li>
                  <li className="flex items-start gap-md">
                    <span className="material-symbols-outlined text-tertiary-fixed-dim text-[24px]">check_circle</span>
                    <span className="">Natively compatible with Claude, Cursor, Antigravity, and custom agents.</span>
                  </li>
                  <li className="flex items-start gap-md">
                    <span className="material-symbols-outlined text-tertiary-fixed-dim text-[24px]">check_circle</span>
                    <span className="">Enable AI to read document structure and generate native Figma nodes.</span>
                  </li>
                </ul>
                <div className="bg-deep border border-white-border p-md mt-md rounded w-full">
                  <div className="font-mono-data text-mono-data text-white-secondary text-[11px] mb-sm uppercase tracking-widest">Example AI Prompt Execution</div>
                  <div className="font-mono-data text-mono-data text-tertiary-fixed-dim text-[13px] border-l-2 border-tertiary-fixed-dim pl-md py-sm bg-surface/50">
                    "Analyze the selected frame and generate a dark mode variant using the current color variables mapped in the design system."
                  </div>
                </div>
              </div>
            </article>

            {/* Feature 3: Subsrf Compose (Text Left, Media Right) */}
            <article className="grid grid-cols-1 lg:grid-cols-2 gap-2xl items-center">
              <div className="flex flex-col gap-lg order-2 lg:order-1">
                <div className="flex flex-col gap-sm">
                  <div className="w-12 h-12 rounded-full bg-surface border border-white-border flex items-center justify-center text-white-primary mb-sm">
                    <span className="material-symbols-outlined text-[24px]">edit_document</span>
                  </div>
                  <div className="font-label-caps text-label-caps text-white-primary uppercase tracking-widest mb-1">Prompt Generation Engine</div>
                  <h2 className="font-heading-md text-heading-md text-white-primary">Subsrf Compose</h2>
                </div>
                <p className="font-subheading text-subheading text-white-secondary leading-relaxed">
                  The definitive prompt engine for Figma layers. Select any element to generate high-fidelity, token-aware prompts tailored for modern AI build tools.
                </p>
                <ul className="flex flex-col gap-md font-body text-body text-white-secondary mt-sm">
                  <li className="flex items-start gap-md">
                    <span className="material-symbols-outlined text-white-primary text-[24px]">check_circle</span>
                    <span className="">Smart Prompting: Deep AI analysis of layer hierarchy and structural properties.</span>
                  </li>
                  <li className="flex items-start gap-md">
                    <span className="material-symbols-outlined text-white-primary text-[24px]">check_circle</span>
                    <span className="">Multi-Target Output: Optimized natively for Lovable, Cursor, Bolt, and Claude.</span>
                  </li>
                  <li className="flex items-start gap-md">
                    <span className="material-symbols-outlined text-white-primary text-[24px]">check_circle</span>
                    <span className="">Token Aware: Automatically references your Figma Variables and styles.</span>
                  </li>
                </ul>
                <div className="bg-deep border border-white-border p-md mt-md rounded w-full lg:w-max max-w-full overflow-hidden">
                  <div className="font-mono-data text-mono-data text-white-secondary text-[11px] mb-xs uppercase tracking-widest">Pipeline Routing</div>
                  <div className="flex flex-wrap items-center gap-md text-[13px] font-mono-data text-white-primary">
                    <span className="bg-surface px-3 py-1.5 rounded border border-white-border flex items-center gap-2"><span className="material-symbols-outlined text-[16px]">highlight_alt</span> Figma Selection</span>
                    <span className="text-white-secondary material-symbols-outlined text-[16px]">arrow_forward</span>
                    <span className="bg-surface px-3 py-1.5 rounded border border-white-border flex items-center gap-2"><span className="material-symbols-outlined text-[16px]">memory</span> Compose</span>
                    <span className="text-white-secondary material-symbols-outlined text-[16px]">arrow_forward</span>
                    <span className="bg-surface px-3 py-1.5 rounded border border-white-primary text-white-primary flex items-center gap-2"><span className="material-symbols-outlined text-[16px]">terminal</span> AI Build Tool</span>
                  </div>
                </div>
              </div>
              <div className="order-1 lg:order-2 bg-layer border border-white-border p-md rounded-lg aspect-square lg:aspect-auto lg:h-[600px] flex items-center justify-center relative overflow-hidden group min-w-0">
                <div className="absolute inset-0 bg-white-primary opacity-0 group-hover:opacity-5 transition-opacity duration-300 pointer-events-none z-20"></div>
                <img alt="Subsrf Compose Interface" className="w-full h-full object-cover opacity-60 mix-blend-luminosity hover:mix-blend-normal transition-all duration-500 rounded relative z-0" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAj_73PlrxeF6BwmIulxdF3U-dICESZBx6_K-ajw7QCK_pGLlxdN_Il9BDw5Isn9gTcV55-m_wgYupMe7eBm7t1PuQh0k3sjLtlRCAkbr-30fB7Y6Yu3SZInlmLUdInyYqDdb75a9NyDhRBxgmvA5QTGNnMMe1ELHlSvyRwRiLGdbTNqxUg5kcW8TAfKJMKrNNGJa4E-rTVgnqAejcQVw1Jk9WF9GQ5gTAoL1esmK8bpsPZSYrAfPTWPYlIBM5ywyIcz2Opq3sS0A"/>
                <div className="absolute bottom-md right-md z-10 bg-void/80 backdrop-blur border border-white-border p-sm rounded font-mono-data text-mono-data text-white-primary flex flex-col gap-1 text-right">
                  <span className="text-white-primary flex items-center justify-end gap-xs">PROMPT GENERATED <span className="material-symbols-outlined text-[14px]">done_all</span></span>
                  <span className="text-white-muted text-[11px]">Tokens extracted: 42</span>
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
