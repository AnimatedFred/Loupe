import React from 'react';
import { TopNavBar, Footer } from './App';

export default function ExtensionPage({ onLogin, loading, session, tier, onLogout }) {
  const scrollToGetStarted = (e) => {
    e.preventDefault();
    window.location.hash = ""; // Returns to the main page where get-started lives, or handled differently
  };

  return (
    <>
      <div className="fixed inset-0 pointer-events-none z-[-1] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-surface-container-low/20 via-void to-void"></div>
      <TopNavBar onLogin={onLogin} loading={loading} session={session} tier={tier} onLogout={onLogout} />

      <main className="flex-grow pt-4xl pb-4xl flex flex-col items-center bg-void">
        <section className="max-w-[1080px] w-full px-lg mb-4xl">
          <div className="flex flex-col gap-md max-w-2xl">
            <div className="font-label-caps text-label-caps text-neon uppercase tracking-widest flex items-center gap-sm">
              <div className="w-2 h-2 bg-neon rounded-full"></div>
              System Sub-Routine: Ext
            </div>
            <h1 className="font-display-lg text-display-lg text-white-primary">Capture. Analyze.<br/>Generate.</h1>
            <p className="font-body text-body text-white-secondary mt-sm">A terminal-grade extension for the subsurface layer of the web. Extract raw UI data, compute styles, and stream semantic context directly to your pipeline.</p>
          </div>
        </section>

        <section className="max-w-[1080px] w-full px-lg mb-4xl">
          <h2 className="font-heading-sm text-heading-sm text-white-primary mb-xl border-b border-white-border pb-sm">1.0 Data Capture</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md">
            <div className="bg-layer border border-white-border p-lg hover:border-outline transition-colors group">
              <div className="h-10 w-10 border border-white-border bg-deep flex items-center justify-center mb-md group-hover:border-neon transition-colors">
                <span className="material-symbols-outlined text-white-primary" data-icon="ads_click">ads_click</span>
              </div>
              <h3 className="font-subheading text-subheading text-white-primary mb-sm">Smart Click</h3>
              <p className="font-body text-body text-white-secondary">Select individual elements on any webpage by clicking them. Each selected element is highlighted with a numbered cyan outline so you always know exactly what you've captured.</p>
            </div>
            <div className="bg-layer border border-white-border p-lg hover:border-outline transition-colors group">
              <div className="h-10 w-10 border border-white-border bg-deep flex items-center justify-center mb-md group-hover:border-neon transition-colors">
                <span className="material-symbols-outlined text-white-primary" data-icon="crop">crop</span>
              </div>
              <h3 className="font-subheading text-subheading text-white-primary mb-sm">Region Tool</h3>
              <p className="font-body text-body text-white-secondary">Draw a rectangle over any part of the page to bulk-select every element inside the bounds. Useful for grabbing an entire section — nav, hero, card — in one gesture.</p>
            </div>
            <div className="bg-layer border border-white-border p-lg hover:border-outline transition-colors group">
              <div className="h-10 w-10 border border-white-border bg-deep flex items-center justify-center mb-md group-hover:border-neon transition-colors">
                <span className="material-symbols-outlined text-white-primary" data-icon="screenshot_monitor">screenshot_monitor</span>
              </div>
              <h3 className="font-subheading text-subheading text-white-primary mb-sm">Screenshot / Full Page</h3>
              <p className="font-body text-body text-white-secondary">Auto-scrolls the entire page, captures each section, and stitches the screenshots together. Opens directly in Subsrf Studio for annotation and AI analysis.</p>
            </div>
            <div className="bg-layer border border-white-border p-lg hover:border-outline transition-colors group">
              <div className="h-10 w-10 border border-white-border bg-deep flex items-center justify-center mb-md group-hover:border-neon transition-colors">
                <span className="material-symbols-outlined text-white-primary" data-icon="upload_file">upload_file</span>
              </div>
              <h3 className="font-subheading text-subheading text-white-primary mb-sm">Image Drop Zone</h3>
              <p className="font-body text-body text-white-secondary">Drag and drop any screenshot or image directly into the panel to instantly upload it for visual analysis and prompt generation.</p>
            </div>
          </div>
        </section>

        <section className="max-w-[1080px] w-full px-lg mb-4xl">
          <h2 className="font-heading-sm text-heading-sm text-white-primary mb-xl border-b border-white-border pb-sm">2.0 On-Page Toolbar &amp; Context</h2>
          <div className="bg-deep border border-white-border w-full aspect-video relative overflow-hidden flex flex-col items-center justify-center p-xl">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#84958510_1px,transparent_1px),linear-gradient(to_bottom,#84958510_1px,transparent_1px)] bg-[size:32px_32px]"></div>
            <div className="relative z-10 w-full max-w-3xl bg-layer border border-neon/30 p-lg shadow-[0_0_40px_rgba(0,255,135,0.05)]">
              <div className="absolute -top-3 -left-3 bg-deep border border-neon text-neon font-mono-data text-mono-data px-sm py-xs">01_HERO_NODE</div>
              <div className="h-8 w-1/3 bg-white-border mb-md"></div>
              <div className="h-4 w-full bg-white-border mb-sm"></div>
              <div className="h-4 w-2/3 bg-white-border"></div>
            </div>
            <div className="absolute bottom-xl left-1/2 -translate-x-1/2 flex items-center gap-md bg-void border border-white-border p-sm shadow-2xl backdrop-blur-md">
              <div className="flex items-center gap-sm px-md border-r border-white-border">
                <div className="flex flex-col items-center justify-center">
                  <span className="font-display-lg text-display-lg text-neon leading-none drop-shadow-[0_0_12px_rgba(0,255,135,0.4)]">04</span>
                  <span className="font-label-caps text-label-caps text-white-secondary mt-xs">Nodes</span>
                </div>
              </div>
              <div className="flex gap-sm px-sm">
                <button className="h-10 w-10 flex items-center justify-center hover:bg-white-border text-white-primary transition-colors border border-transparent hover:border-white-border">
                  <span className="material-symbols-outlined" data-icon="magic_button">magic_button</span>
                </button>
                <button className="h-10 w-10 flex items-center justify-center hover:bg-white-border text-white-primary transition-colors border border-transparent hover:border-white-border">
                  <span className="material-symbols-outlined" data-icon="delete">delete</span>
                </button>
              </div>
              <button className="ml-sm font-label-caps text-label-caps bg-neon text-void px-lg h-10 flex items-center gap-sm hover:opacity-90 rounded-DEFAULT">
                <span className="material-symbols-outlined text-[16px]" data-icon="terminal">terminal</span>
                Prompt Studio
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-xl mt-xl">
            <div>
              <h3 className="font-subheading text-subheading text-white-primary mb-sm">Floating Data Context</h3>
              <p className="font-body text-body text-white-secondary">A persistent toolbar anchored to the bottom of any page while Subsrf is active. Shows the current element count and all capture controls without blocking your work.</p>
            </div>
            <div>
              <h3 className="font-subheading text-subheading text-white-primary mb-sm">Element Highlights</h3>
              <p className="font-body text-body text-white-secondary">Every selected element gets a numbered cyan highlight box overlaid directly on the page. Clear all selections with one click or open Prompt Studio to generate.</p>
            </div>
          </div>
        </section>

        <section className="max-w-[1080px] w-full px-lg mb-4xl">
          <h2 className="font-heading-sm text-heading-sm text-white-primary mb-xl border-b border-white-border pb-sm">3.0 Prompt Studio</h2>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-md">
            <div className="lg:col-span-5 flex flex-col gap-md">
              <div className="bg-layer border border-white-border p-lg h-full flex flex-col justify-between">
                <div>
                  <h3 className="font-subheading text-subheading text-neon mb-sm">Raw UI Brief</h3>
                  <p className="font-body text-body text-white-secondary mb-lg">Generates a structured plain-text brief from your selected elements. Includes element type, selector, dimensions, computed styles, text content, and a build-ready prompt.</p>
                </div>
                <button className="font-label-caps text-label-caps border border-white-border text-white-primary py-sm px-md flex items-center justify-center gap-sm hover:bg-white-border transition-colors self-start rounded-DEFAULT">
                  <span className="material-symbols-outlined text-[16px]" data-icon="content_copy">content_copy</span>
                  Copy Output
                </button>
              </div>
            </div>
            <div className="lg:col-span-7 bg-deep border border-white-border flex flex-col">
              <div className="flex items-center justify-between border-b border-white-border px-md py-sm bg-void">
                <div className="flex gap-md font-label-caps text-label-caps text-white-secondary">
                  <span className="text-neon border-b border-neon pb-1">CSS Export</span>
                  <span className="hover:text-white-primary cursor-pointer">AI Smart Prompt</span>
                </div>
                <div className="flex items-center gap-sm font-mono-data text-[10px] text-white-muted">
                  <span className="w-2 h-2 rounded-full bg-status-ok"></span> MCP Online
                </div>
              </div>
              <div className="p-lg font-mono-data text-mono-data text-white-secondary overflow-x-auto">
<pre><code><span className="text-white-muted">/* Extracted Component: Header_01 */</span>
<span className="text-neon">.header-container</span> {'{'}
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32px;
  background-color: #050508;
  border-bottom: 1px solid rgba(242, 242, 244, 0.12);
{'}'}

<span className="text-neon">.header-title</span> {'{'}
  font-family: 'Manrope', sans-serif;
  font-size: 32px;
  font-weight: 700;
  color: #F2F2F4;
{'}'}</code></pre>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-[1080px] w-full px-lg mb-4xl">
          <h2 className="font-heading-sm text-heading-sm text-white-primary mb-xl border-b border-white-border pb-sm">4.0 Subsrf Studio Canvas</h2>
          <div className="flex flex-col lg:flex-row gap-md h-[600px]">
            <div className="flex-grow bg-deep border border-white-border relative overflow-hidden flex items-center justify-center">
              <div className="absolute top-md left-md flex flex-col gap-xs bg-layer border border-white-border p-xs z-20 shadow-lg">
                <button className="w-8 h-8 flex items-center justify-center text-white-secondary hover:text-neon hover:bg-white-border"><span className="material-symbols-outlined text-[18px]" data-icon="back_hand">back_hand</span></button>
                <button className="w-8 h-8 flex items-center justify-center text-neon bg-white-border"><span className="material-symbols-outlined text-[18px]" data-icon="edit">edit</span></button>
                <button className="w-8 h-8 flex items-center justify-center text-white-secondary hover:text-neon hover:bg-white-border"><span className="material-symbols-outlined text-[18px]" data-icon="shapes">shapes</span></button>
                <button className="w-8 h-8 flex items-center justify-center text-white-secondary hover:text-neon hover:bg-white-border"><span className="material-symbols-outlined text-[18px]" data-icon="match_case">match_case</span></button>
              </div>
              <div className="w-3/4 h-3/4 bg-layer border border-white-border relative shadow-2xl" data-alt="A highly detailed conceptual rendering of a brutalist digital interface structure. The scene is dominated by deep blacks, charcoal greys, and precise 1px glowing neon green accent lines tracing geometric grid patterns. The lighting is low and atmospheric, emphasizing technical precision and sterile utility over organic softness. Floating UI panels cast subtle green drop shadows against a dark void background, reinforcing the terminal-grade hacker aesthetic." style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCjwGZXoooGorolWKgtp6iZqoYyfwNkDTq2qOJHRASv1O1fofCrTg8YpndoYdDdAEbDH6Ff0bwG8alSKeg_6RC73VW86xHa-a87grrzOIcNkPE-rYcAa89xdL8NvlOSytpu2ITfj4E12J6Ag7exFDu-8ePS9IV1z3J8WsmFHK-eKAkkvKACWkCg9Q8vcIiPGN23qiT9sejCUKuyITSP1GEdRm6BgskYl5tR9k78Zogjg1doMmc7z0F9_eXuvDdIo8BLqnJsZj0ohw')", backgroundSize: 'cover', backgroundPosition: 'center' }}>
                <div className="absolute top-[20%] left-[10%] w-[120px] h-[60px] border-2 border-status-err border-dashed bg-status-err/10"></div>
                <div className="absolute top-[15%] left-[25%] bg-status-err text-white-primary font-mono-data text-[10px] px-sm py-xs">Contrast Issue</div>
              </div>
            </div>
            <div className="w-full lg:w-80 flex flex-col gap-md">
              <div className="bg-layer border border-white-border p-md flex-grow flex flex-col">
                <h3 className="font-label-caps text-label-caps text-white-primary border-b border-white-border pb-sm mb-md flex items-center justify-between">
                  AI Analysis Panel
                  <span className="text-neon bg-neon-dim px-xs py-[2px] rounded">PRO</span>
                </h3>
                <div className="flex flex-col gap-sm mb-lg">
                  <button className="border border-white-border text-white-primary p-sm text-left hover:border-neon transition-colors font-mono-data text-mono-data">Build Prompt</button>
                  <button className="border border-white-border text-white-primary p-sm text-left hover:border-neon transition-colors font-mono-data text-mono-data">Describe UI</button>
                  <button className="border border-neon text-neon bg-neon-dim p-sm text-left flex justify-between items-center font-mono-data text-mono-data">
                    Accessibility Audit
                    <span className="material-symbols-outlined text-[16px]" data-icon="check">check</span>
                  </button>
                </div>
                <div className="flex-grow bg-deep border border-white-border p-sm font-body text-[13px] text-white-secondary overflow-y-auto">
                  <p className="text-status-err mb-sm flex items-center gap-xs"><span className="w-2 h-2 bg-status-err rounded-full inline-block"></span> WCAG 2.1 AA Violation</p>
                  <p>The contrast ratio of the secondary text against the dark background is 3.1:1, failing the required 4.5:1 minimum.</p>
                </div>
              </div>
              <div className="bg-layer border border-white-border p-md flex items-center justify-between">
                <div className="font-label-caps text-label-caps text-white-secondary flex flex-col">
                  Balance
                  <span className="text-white-primary font-mono-data text-[14px]">840 Credits</span>
                </div>
                <button className="font-label-caps text-[10px] border border-white-border px-sm py-xs hover:text-white-primary">Top Up</button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
