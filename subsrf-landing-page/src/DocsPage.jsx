import React, { useState } from 'react';
import { TopNavBar, Footer } from './App';

const BASE_CMD = `npx -y subsrf-intelligence setup --endpoint https://api.subsrf.dev`;

export default function DocsPage({ onLogin, loading, session, tier, onLogout, mcpConfig }) {
  const isPro = tier === 'pro';
  const isPaid = tier === 'pro' || tier === 'starter';
  const displayCmd = isPaid && mcpConfig?.mcpServers?.subsrf?.env?.FIGMA_PAT 
    ? `FIGMA_PAT="${mcpConfig.mcpServers.subsrf.env.FIGMA_PAT}" ${BASE_CMD}`
    : BASE_CMD;
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(displayCmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <div className="fixed inset-0 pointer-events-none z-[-1] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-surface-container-low/20 via-void to-void"></div>
      <TopNavBar onLogin={onLogin} loading={loading} session={session} tier={tier} onLogout={onLogout} />

      {/* Main Content */}
      <main className="flex-1 p-lg lg:p-xl max-w-4xl mx-auto pt-4xl w-full relative z-10 flex flex-col gap-xl pb-4xl">
        {/* Breadcrumbs */}
        <div className="mb-md flex items-center gap-sm font-mono-data text-label-caps text-white-muted">
          <span>DOCS</span>
          <span className="material-symbols-outlined text-[12px]">chevron_right</span>
          <span className="text-white-primary">INFRASTRUCTURE SETUP</span>
        </div>
        
        {/* Page Title */}
        <header className="mb-sm">
          <h1 className="font-heading-md text-heading-md text-white-primary mb-md">Infrastructure Setup</h1>
          <p className="font-body text-body text-white-secondary max-w-2xl">
            Configure the sub-surface layer for deep element inspection and automated bridge connections. This guide covers downloads, the Model Context Protocol and external REST integrations.
          </p>
        </header>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 gap-xl w-full">
          {/* Downloads Section */}
          <section className="bg-layer border border-white-border p-lg w-full" id="downloads">
            <div className="flex items-center justify-between mb-lg">
              <div className="flex items-center gap-md">
                <span className="material-symbols-outlined text-neon text-[24px]">download</span>
                <h2 className="font-heading-sm text-heading-sm">Installation &amp; Downloads</h2>
              </div>
            </div>
            <p className="font-body text-body text-white-secondary mb-lg">
              Get started by installing the necessary extensions and plugins for your environment.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-md w-full">
              <div className="bg-deep border border-white-border p-md flex flex-col justify-between hover:border-neon transition-colors min-h-[140px]">
                <div>
                  <h3 className="font-subheading text-subheading text-white-primary mb-sm">Chrome Extension</h3>
                  <p className="font-body text-body text-white-muted mb-md">Install the extension from the Chrome Web Store to enable DOM inspection.</p>
                </div>
                <a className="inline-flex items-center gap-sm text-neon font-mono-data text-mono-data hover:underline" href="#">
                  <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                  Chrome Web Store
                </a>
              </div>
              <div className="bg-deep border border-white-border p-md flex flex-col justify-between hover:border-neon transition-colors min-h-[140px]">
                <div>
                  <h3 className="font-subheading text-subheading text-white-primary mb-sm">Figma Plugin</h3>
                  <p className="font-body text-body text-white-muted mb-md">Get the plugin from the Figma Community to sync your design files.</p>
                </div>
                <a className="inline-flex items-center gap-sm text-neon font-mono-data text-mono-data hover:underline" href="#">
                  <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                  Figma Community
                </a>
              </div>
            </div>
          </section>

          {/* MCP Section */}
          <section className="bg-layer border border-white-border p-lg relative overflow-hidden w-full" id="mcp-setup">
            <div className="flex items-center justify-between mb-lg">
              <div className="flex items-center gap-md z-10 relative">
                <span className="material-symbols-outlined text-neon text-[24px]">account_tree</span>
                <h2 className="font-heading-sm text-heading-sm">Model Context Protocol (MCP)</h2>
              </div>
              <div className="flex gap-sm z-10 relative">
                <div className="flex items-center gap-xs px-sm py-1 border border-status-ok bg-neon-glow rounded-full">
                  <span className="w-[5px] h-[5px] bg-status-ok rounded-full"></span>
                  <span className="font-label-caps text-[10px] text-status-ok">MCP: ONLINE</span>
                </div>
              </div>
            </div>
            <p className="font-body text-body text-white-secondary mb-lg relative z-10">
              The Model Context Protocol establishes a direct, low-latency bridge between LLM runtimes and the underlying DOM structure. It allows for autonomous retrieval of XPaths, computed styles, and accessibility trees without manual prompting overhead.
            </p>

            {/* Content Logic depending on isPro */}
            {!isPro && (
              <div className="absolute inset-x-0 bottom-0 top-[180px] z-20 flex flex-col items-center justify-center backdrop-blur-md bg-void/60">
                <span className="material-symbols-outlined text-neon text-[32px] mb-sm">lock</span>
                <h3 className="font-heading-sm text-white-primary mb-xs">Pro Feature</h3>
                <p className="font-body text-white-secondary mb-md">Upgrade to access the MCP Bridge.</p>
                <button onClick={() => window.location.hash = '#pricing'} className="px-md py-sm bg-neon text-void font-label-caps hover:opacity-90 transition-opacity rounded">Upgrade to Pro</button>
              </div>
            )}

            {/* Code Block */}
            <div className={`bg-deep border border-white-border overflow-hidden ${!isPro ? 'opacity-30 pointer-events-none' : ''}`}>
              <div className="flex items-center justify-between px-md py-sm border-b border-white-border bg-surface">
                <span className="font-mono-data text-label-caps text-white-muted">Terminal Setup Command</span>
                <button onClick={handleCopy} className="flex items-center gap-xs font-mono-data text-label-caps text-white-muted hover:text-neon transition-colors bg-transparent border-none cursor-pointer">
                  <span className="material-symbols-outlined text-[16px]">{copied ? 'check' : 'content_copy'}</span>
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre className="p-md font-mono-data text-mono-data overflow-x-auto"><code className="text-neon">
{displayCmd}
              </code></pre>
            </div>
            <div className={`mt-lg aspect-video bg-surface-container border border-white-border flex flex-col items-center justify-center group cursor-pointer hover:border-neon transition-colors ${!isPro ? 'opacity-30 pointer-events-none' : ''}`}>
              <div className="w-16 h-16 rounded-full bg-neon/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-neon text-4xl">play_arrow</span>
              </div>
              <p className="mt-md font-mono-data text-label-caps text-white-muted">WATCH SETUP TUTORIAL</p>
            </div>
          </section>

          {/* Figma Section */}
          <section className="bg-layer border border-white-border p-lg relative overflow-hidden w-full" id="rest-api">
            <div className="flex items-center justify-between mb-lg">
              <div className="flex items-center gap-md">
                <span className="material-symbols-outlined text-neon text-[24px]">api</span>
                <h2 className="font-heading-sm text-heading-sm">Figma REST API</h2>
              </div>
              <div className="flex items-center gap-xs px-sm py-1 border border-status-ok bg-neon-glow rounded-full z-10">
                <span className="w-[5px] h-[5px] bg-status-ok rounded-full"></span>
                <span className="font-label-caps text-[10px] text-status-ok">Figma: CONNECTED</span>
              </div>
            </div>
            <div className="space-y-md mb-lg">
              <div className="flex items-start gap-md">
                <span className="font-mono-data text-neon bg-neon-dim px-2 py-0.5 rounded">01</span>
                <p className="font-body text-body text-white-secondary">Log in to your Figma account and navigate to <strong className="text-white-primary">Settings</strong>.</p>
              </div>
              <div className="flex items-start gap-md">
                <span className="font-mono-data text-neon bg-neon-dim px-2 py-0.5 rounded">02</span>
                <p className="font-body text-body text-white-secondary">Scroll to the <strong className="text-white-primary">Personal Access Tokens</strong> section.</p>
              </div>
              <div className="flex items-start gap-md">
                <span className="font-mono-data text-neon bg-neon-dim px-2 py-0.5 rounded">03</span>
                <p className="font-body text-body text-white-secondary">Generate a token with all permissions.</p>
              </div>
            </div>

            <div className="mt-xl border border-white-border bg-void overflow-hidden rounded-sm">
              <div className="px-md py-sm border-b border-white-border bg-surface">
                <h4 className="font-mono-data text-label-caps text-white-muted uppercase tracking-widest">Required Token Scopes</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white-border/50">
                      <th className="p-md font-mono-data text-label-caps text-white-secondary">Status</th>
                      <th className="p-md font-mono-data text-label-caps text-white-secondary">Scope Identifier</th>
                      <th className="p-md font-mono-data text-label-caps text-white-secondary">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white-border/30">
                    <tr className="hover:bg-white-border/5 transition-colors">
                      <td className="p-md"><span className="material-symbols-outlined text-neon text-[18px]">check_box</span></td>
                      <td className="p-md font-mono-data text-mono-data text-neon">current_user:read</td>
                      <td className="p-md font-body text-body text-white-muted">Read the current user's name, email, and profile image</td>
                    </tr>
                    <tr className="hover:bg-white-border/5 transition-colors">
                      <td className="p-md"><span className="material-symbols-outlined text-neon text-[18px]">check_box</span></td>
                      <td className="p-md font-mono-data text-mono-data text-neon">file_comments:read</td>
                      <td className="p-md font-body text-body text-white-muted">Read comments in accessible files</td>
                    </tr>
                    <tr className="hover:bg-white-border/5 transition-colors">
                      <td className="p-md"><span className="material-symbols-outlined text-neon text-[18px]">check_box</span></td>
                      <td className="p-md font-mono-data text-mono-data text-neon">file_comments:write</td>
                      <td className="p-md font-body text-body text-white-muted">Create, modify, and delete comments in accessible files</td>
                    </tr>
                    <tr className="hover:bg-white-border/5 transition-colors">
                      <td className="p-md"><span className="material-symbols-outlined text-neon text-[18px]">check_box</span></td>
                      <td className="p-md font-mono-data text-mono-data text-neon">file_content:read</td>
                      <td className="p-md font-body text-body text-white-muted">Read the contents of and render images from files</td>
                    </tr>
                    <tr className="hover:bg-white-border/5 transition-colors">
                      <td className="p-md"><span className="material-symbols-outlined text-neon text-[18px]">check_box</span></td>
                      <td className="p-md font-mono-data text-mono-data text-neon">file_metadata:read</td>
                      <td className="p-md font-body text-body text-white-muted">Read metadata of files</td>
                    </tr>
                    <tr className="hover:bg-white-border/5 transition-colors">
                      <td className="p-md"><span className="material-symbols-outlined text-neon text-[18px]">check_box</span></td>
                      <td className="p-md font-mono-data text-mono-data text-neon">file_versions:read</td>
                      <td className="p-md font-body text-body text-white-muted">Read version history of files</td>
                    </tr>
                    <tr className="hover:bg-white-border/5 transition-colors">
                      <td className="p-md"><span className="material-symbols-outlined text-neon text-[18px]">check_box</span></td>
                      <td className="p-md font-mono-data text-mono-data text-neon">library_assets:read</td>
                      <td className="p-md font-body text-body text-white-muted">Read data about individual components and styles</td>
                    </tr>
                    <tr className="hover:bg-white-border/5 transition-colors">
                      <td className="p-md"><span className="material-symbols-outlined text-neon text-[18px]">check_box</span></td>
                      <td className="p-md font-mono-data text-mono-data text-neon">library_content:read</td>
                      <td className="p-md font-body text-body text-white-muted">Read components and styles published from individual files</td>
                    </tr>
                    <tr className="hover:bg-white-border/5 transition-colors">
                      <td className="p-md"><span className="material-symbols-outlined text-neon text-[18px]">check_box</span></td>
                      <td className="p-md font-mono-data text-mono-data text-neon">team_library_content:read</td>
                      <td className="p-md font-body text-body text-white-muted">Read components and styles published in team libraries</td>
                    </tr>
                    <tr className="hover:bg-white-border/5 transition-colors">
                      <td className="p-md"><span className="material-symbols-outlined text-neon text-[18px]">check_box</span></td>
                      <td className="p-md font-mono-data text-mono-data text-neon">file_dev_resources:read</td>
                      <td className="p-md font-body text-body text-white-muted">Read and list dev resources in accessible files</td>
                    </tr>
                    <tr className="hover:bg-white-border/5 transition-colors">
                      <td className="p-md"><span className="material-symbols-outlined text-neon text-[18px]">check_box</span></td>
                      <td className="p-md font-mono-data text-mono-data text-neon">file_dev_resources:write</td>
                      <td className="p-md font-body text-body text-white-muted">Create and modify dev resources in accessible files</td>
                    </tr>
                    <tr className="hover:bg-white-border/5 transition-colors">
                      <td className="p-md"><span className="material-symbols-outlined text-neon text-[18px]">check_box</span></td>
                      <td className="p-md font-mono-data text-mono-data text-neon">projects:read</td>
                      <td className="p-md font-body text-body text-white-muted">Read team project structure</td>
                    </tr>
                    <tr className="hover:bg-white-border/5 transition-colors">
                      <td className="p-md"><span className="material-symbols-outlined text-neon text-[18px]">check_box</span></td>
                      <td className="p-md font-mono-data text-mono-data text-neon">webhooks:read</td>
                      <td className="p-md font-body text-body text-white-muted">Read and list webhooks</td>
                    </tr>
                    <tr className="hover:bg-white-border/5 transition-colors">
                      <td className="p-md"><span className="material-symbols-outlined text-neon text-[18px]">check_box</span></td>
                      <td className="p-md font-mono-data text-mono-data text-neon">webhooks:write</td>
                      <td className="p-md font-body text-body text-white-muted">Create, modify, and delete webhooks</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Network Config Table */}
            <div className="mt-lg aspect-video bg-surface-container border border-white-border flex flex-col items-center justify-center group cursor-pointer hover:border-neon transition-colors">
              <div className="w-16 h-16 rounded-full bg-neon/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-neon text-4xl">play_circle</span>
              </div>
              <p className="mt-md font-mono-data text-label-caps text-white-muted">API CONFIGURATION GUIDE</p>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}
