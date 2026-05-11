import React from 'react';
import { TopNavBar, Footer } from './App';

export default function PluginPage({ onLogin, loading, session, tier, onLogout }) {
  return (
    <>
      <div className="fixed inset-0 pointer-events-none z-[-1] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-surface-container-low/20 via-void to-void"></div>
      <TopNavBar onLogin={onLogin} loading={loading} session={session} tier={tier} onLogout={onLogout} />

      <main className="flex-grow pt-4xl pb-4xl flex flex-col items-center bg-void w-full">
        <div className="max-w-[1080px] w-full px-lg flex flex-col gap-xl">
          {/* Hero Section */}
          <header className="flex flex-col gap-lg border-b border-white-border pb-xl">
            <div className="flex flex-col gap-sm">
              <span className="font-label-caps text-label-caps text-neon uppercase flex items-center gap-xs">
                <span className="w-2 h-2 rounded-full bg-neon"></span>
                Platform Infrastructure
              </span>
              <h1 className="font-display-lg text-display-lg text-white-primary">Figma Plugin</h1>
              <p className="font-subheading text-subheading text-white-secondary max-w-2xl">
                The real-time bridge connecting your browser context to the design canvas. Supports deep property mapping, bidirectional AI query flow, and structured element synchronization.
              </p>
            </div>
          </header>

          {/* Technical Diagram: MCP Bridge */}
          <section className="flex flex-col gap-lg">
            <h2 className="font-heading-sm text-heading-sm text-white-primary">Architecture: MCP Bridge</h2>
            <div className="w-full bg-layer border border-white-border p-lg rounded-DEFAULT flex flex-col md:flex-row items-center justify-between gap-lg relative shadow-[0_0_24px_rgba(0,255,135,0.06)]">
              <div className="flex flex-col items-center gap-md w-full md:w-1/3 z-10">
                <div className="bg-deep border border-white-border p-md w-full text-center">
                  <span className="font-label-caps text-label-caps text-white-secondary block mb-xs">Source</span>
                  <span className="font-mono-data text-mono-data text-white-primary">Chrome Extension</span>
                </div>
                <div className="font-mono-data text-mono-data text-neon-dim text-[10px]">↑↓ HTTP Polling</div>
              </div>
              <div className="flex flex-col items-center gap-md w-full md:w-1/3 z-10">
                <div className="bg-surface border border-neon p-md w-full text-center shadow-[0_0_24px_rgba(0,255,135,0.06)]">
                  <span className="font-label-caps text-label-caps text-neon block mb-xs">Core</span>
                  <span className="font-mono-data text-mono-data text-white-primary">api.subsrf.dev</span>
                </div>
                <div className="font-mono-data text-mono-data text-white-secondary text-[10px] bg-deep border border-white-border px-sm py-xs mt-sm">
                  <span className="text-neon">Active:</span> 2s Polling Loop
                </div>
              </div>
              <div className="flex flex-col items-center gap-md w-full md:w-1/3 z-10">
                <div className="bg-deep border border-white-border p-md w-full text-center">
                  <span className="font-label-caps text-label-caps text-white-secondary block mb-xs">Destination</span>
                  <span className="font-mono-data text-mono-data text-white-primary">Figma Canvas</span>
                </div>
                <div className="font-mono-data text-mono-data text-neon-dim text-[10px]">↑↓ Plugin Sandbox</div>
              </div>
              {/* Connecting Lines (Desktop only representation) */}
              <div className="hidden md:block absolute top-1/2 left-lg right-lg h-[1px] bg-white-border -translate-y-1/2 z-0"></div>
            </div>
          </section>

          {/* Bento Grid Features */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-lg">
            {/* Property Mapping -> Extension Sync */}
            <article className="bg-layer border border-white-border p-lg flex flex-col gap-md row-span-2">
              <div className="flex items-center gap-sm mb-sm">
                <span className="material-symbols-outlined text-neon" style={{ fontVariationSettings: "'FILL' 0" }}>data_object</span>
                <h3 className="font-subheading text-subheading text-white-primary">Extension Sync</h3>
              </div>
              <p className="font-body text-body text-white-secondary">
                Computed CSS properties are deterministically translated into native Figma properties during import. Supports complex layout structures.
              </p>
              <div className="bg-deep border border-white-border p-md flex flex-col gap-sm mt-auto">
                <div className="flex justify-between border-b border-white-border pb-xs">
                  <span className="font-mono-data text-mono-data text-white-secondary">Target</span>
                  <span className="font-mono-data text-mono-data text-neon">Translation Status</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-mono-data text-mono-data text-white-primary">Property Mapping</span>
                  <span className="font-mono-data text-mono-data text-white-secondary text-[10px] bg-surface border border-white-border px-xs">Auto Layout</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-mono-data text-mono-data text-white-primary">Smart Hierarchy</span>
                  <span className="font-mono-data text-mono-data text-white-secondary text-[10px] bg-surface border border-white-border px-xs">Native Nodes</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-mono-data text-mono-data text-white-primary">Gradient Support</span>
                  <span className="font-mono-data text-mono-data text-white-secondary text-[10px] bg-surface border border-white-border px-xs">Multi-stop Fills</span>
                </div>
              </div>
            </article>

            {/* AI Command Routing */}
            <article className="bg-layer border border-white-border p-lg flex flex-col gap-md">
              <div className="flex items-center gap-sm mb-sm">
                <span className="material-symbols-outlined text-neon" style={{ fontVariationSettings: "'FILL' 0" }}>router</span>
                <h3 className="font-subheading text-subheading text-white-primary">AI Command Routing</h3>
              </div>
              <p className="font-body text-body text-white-secondary">
                Claude sends commands via the MCP Bridge directly to the plugin sandbox.
              </p>
              <div className="flex flex-wrap gap-sm mt-sm">
                <span className="font-mono-data text-mono-data text-white-primary text-[10px] bg-deep border border-white-border px-xs py-xs rounded">Create Frame</span>
                <span className="font-mono-data text-mono-data text-white-primary text-[10px] bg-deep border border-white-border px-xs py-xs rounded">Set Text</span>
                <span className="font-mono-data text-mono-data text-white-primary text-[10px] bg-deep border border-white-border px-xs py-xs rounded">Set Fill</span>
                <span className="font-mono-data text-mono-data text-white-primary text-[10px] bg-deep border border-white-border px-xs py-xs rounded">Move/Resize</span>
                <span className="font-mono-data text-mono-data text-white-primary text-[10px] bg-deep border border-white-border px-xs py-xs rounded">Query</span>
                <span className="font-mono-data text-mono-data text-white-primary text-[10px] bg-deep border border-white-border px-xs py-xs rounded">Eval</span>
              </div>
            </article>

            {/* Activity Feed */}
            <article className="bg-layer border border-white-border p-lg flex flex-col gap-md">
              <div className="flex items-center gap-sm mb-sm">
                <span className="material-symbols-outlined text-neon" style={{ fontVariationSettings: "'FILL' 0" }}>terminal</span>
                <h3 className="font-subheading text-subheading text-white-primary">Activity Feed</h3>
              </div>
              <div className="bg-deep border border-white-border p-sm flex flex-col gap-xs font-mono-data text-mono-data text-[10px]">
                <div className="flex gap-sm">
                  <span className="text-white-secondary">10:42:01</span>
                  <span className="text-neon">[SYNC]</span>
                  <span className="text-white-primary">Received 42 nodes from Extension</span>
                </div>
                <div className="flex gap-sm">
                  <span className="text-white-secondary">10:42:05</span>
                  <span className="text-tertiary-fixed-dim">[AI_CMD]</span>
                  <span className="text-white-primary">Executing Swap Component</span>
                </div>
                <div className="flex gap-sm">
                  <span className="text-white-secondary">10:42:06</span>
                  <span className="text-status-ok">[SUCCESS]</span>
                  <span className="text-white-primary">Canvas updated successfully</span>
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
