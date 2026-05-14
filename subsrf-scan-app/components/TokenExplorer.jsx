'use client';

import { useState } from 'react';
import ColorsPanel from './panels/ColorsPanel';
import TypographyPanel from './panels/TypographyPanel';
import SpacingPanel from './panels/SpacingPanel';
import RadiusPanel from './panels/RadiusPanel';
import ShadowsPanel from './panels/ShadowsPanel';
import AnimationsPanel from './panels/AnimationsPanel';
import HealthPanel from './panels/HealthPanel';
import ComponentPanel from './panels/ComponentPanel';
import ExportSidebar from './ExportSidebar';

const CATEGORIES = [
  { id: 'colors',     label: 'Colors',     dot: '#00FF87' },
  { id: 'typography', label: 'Typography', dot: '#818cf8' },
  { id: 'spacing',    label: 'Spacing',    dot: '#38bdf8' },
  { id: 'radius',     label: 'Radius',     dot: '#fb923c' },
  { id: 'shadows',    label: 'Shadows',    dot: '#e879f9' },
  { id: 'animations', label: 'Animations', dot: '#34d399' },
  { id: 'health',     label: 'Health',     dot: '#FFB020' },
  { id: 'component',  label: 'Components', dot: '#c084fc' },
];

function tokenCount(tokens, mode, category) {
  const t = tokens?.[mode];
  if (!t) return 0;
  if (category === 'colors') return t.colors?.length || 0;
  if (category === 'typography') return (t.typography?.families?.length || 0) + (t.typography?.sizes?.length || 0);
  if (category === 'spacing') return t.spacing?.length || 0;
  if (category === 'radius') return t.radius?.length || 0;
  if (category === 'shadows') return t.shadows?.length || 0;
  if (category === 'animations') return t.animations?.length || 0;
  if (category === 'health') return tokens?.healthScore?.issues?.length || 0;
  if (category === 'component') return tokens?.componentDetection?.customTokens?.length || 0;
  return 0;
}

export default function TokenExplorer({ tokens, sourceUrl }) {
  const [activeCategory, setActiveCategory] = useState('colors');
  const [mode, setMode] = useState('dark');
  const [copied, setCopied] = useState(null);

  const hasBothModes = tokens?.hasDark && tokens?.hasLight;
  const primaryMode = tokens?.hasDark ? 'dark' : 'light';
  const activeMode = hasBothModes ? mode : primaryMode;

  const tokenData = tokens?.[activeMode];
  const hostname = (() => {
    try { return new URL(sourceUrl.startsWith('http') ? sourceUrl : 'https://' + sourceUrl).hostname; }
    catch { return sourceUrl; }
  })();

  function copyToken(value) {
    navigator.clipboard.writeText(value).catch(() => {});
    setCopied(value);
    setTimeout(() => setCopied(null), 1600);
  }

  const panelTitles = {
    colors: 'Colors', typography: 'Typography', spacing: 'Spacing', radius: 'Radius', shadows: 'Shadows',
    animations: 'Animations', health: 'Health Score', component: 'Components',
  };

  const totalTokens = tokenData?.meta?.totalTokens || 0;

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '240px 1fr 300px',
      borderTop: '1px solid var(--border)', position: 'relative', zIndex: 1,
      flex: 1, minHeight: 0, width: '100%', height: '100%',
    }}>
      {/* Left sidebar */}
      <aside style={{
        background: 'var(--deep)', borderRight: '1px solid var(--border)',
        padding: '20px 0', overflowY: 'auto',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Categories */}
        <div style={{ padding: '0 16px 16px', borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
          <div style={{
            fontFamily: "'Azeret Mono', monospace", fontSize: 9, letterSpacing: 2,
            textTransform: 'uppercase', color: 'var(--t3)', padding: '8px 0', marginBottom: 8,
          }}>Token categories</div>

          {CATEGORIES.map(cat => {
            const count = tokenCount(tokens, activeMode, cat.id);
            const active = activeCategory === cat.id;
            return (
              <div key={cat.id} onClick={() => setActiveCategory(cat.id)} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '7px 10px', borderRadius: 6, cursor: 'pointer',
                marginBottom: 2, transition: 'background 0.12s',
                background: active ? 'var(--neon-dim)' : 'transparent',
                border: active ? '1px solid rgba(0,255,135,0.15)' : '1px solid transparent',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: cat.dot, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 500, color: active ? 'var(--neon)' : 'var(--t1)' }}>{cat.label}</span>
                </div>
                <span style={{
                  fontFamily: "'Azeret Mono', monospace", fontSize: 9,
                  color: active ? 'var(--neon)' : 'var(--t3)',
                  background: active ? 'rgba(0,255,135,0.15)' : 'var(--lift)',
                  padding: '1px 6px', borderRadius: 3,
                }}>{count}</span>
              </div>
            );
          })}
        </div>

        {/* Mode toggle */}
        {hasBothModes && (
          <div style={{ padding: '0 16px 16px', borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
            <div style={{
              fontFamily: "'Azeret Mono', monospace", fontSize: 9, letterSpacing: 2,
              textTransform: 'uppercase', color: 'var(--t3)', padding: '8px 0', marginBottom: 8,
            }}>Color mode</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {['dark', 'light'].map(m => (
                <button key={m} onClick={() => setMode(m)} style={{
                  flex: 1, padding: '6px 0', borderRadius: 5,
                  fontFamily: "'Azeret Mono', monospace", fontSize: 10, letterSpacing: 0.5,
                  border: mode === m ? '1px solid rgba(0,255,135,0.3)' : '1px solid var(--border)',
                  background: mode === m ? 'var(--neon-dim)' : 'var(--layer)',
                  color: mode === m ? 'var(--neon)' : 'var(--t3)',
                  textTransform: 'uppercase',
                }}>{m}</button>
              ))}
            </div>
          </div>
        )}

        {/* Source info */}
        <div style={{ padding: '0 16px' }}>
          <div style={{
            fontFamily: "'Azeret Mono', monospace", fontSize: 9, letterSpacing: 2,
            textTransform: 'uppercase', color: 'var(--t3)', padding: '8px 0', marginBottom: 8,
          }}>Source</div>
          <div style={{ padding: '4px 10px' }}>
            <div style={{ fontFamily: "'Azeret Mono', monospace", fontSize: 10, color: 'var(--t2)', marginBottom: 4 }}>{hostname}</div>
            <div style={{ fontFamily: "'Azeret Mono', monospace", fontSize: 9, color: 'var(--t3)' }}>{totalTokens} tokens</div>
            {tokenData?.meta?.extractionMs && (
              <div style={{ fontFamily: "'Azeret Mono', monospace", fontSize: 9, color: 'var(--t3)', marginTop: 2 }}>
                {(tokenData.meta.extractionMs / 1000).toFixed(1)}s extraction
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main panel */}
      <main style={{ padding: '28px 32px', overflowY: 'auto', minHeight: 0 }}>
        {/* Panel header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px' }}>
            {panelTitles[activeCategory]}
          </div>
          <div style={{ fontFamily: "'Azeret Mono', monospace", fontSize: 10, color: 'var(--t3)', letterSpacing: 0.5 }}>
            {tokenCount(tokens, activeMode, activeCategory)} tokens · {hostname}
          </div>
        </div>

        {/* Source bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'var(--layer)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '10px 16px', marginBottom: 28,
        }}>
          <div style={{
            width: 16, height: 16, borderRadius: 3, flexShrink: 0,
            background: 'linear-gradient(135deg, #6366f1, #4338ca)',
          }} />
          <div style={{ fontFamily: "'Azeret Mono', monospace", fontSize: 11, color: 'var(--t2)', flex: 1 }}>
            {hostname}
          </div>
          <div style={{
            fontFamily: "'Azeret Mono', monospace", fontSize: 9, color: 'var(--neon)',
            background: 'var(--neon-dim)', border: '1px solid rgba(0,255,135,0.2)',
            borderRadius: 3, padding: '2px 8px', letterSpacing: 1,
          }}>EXTRACTED</div>
        </div>

        {/* Token panels */}
        {activeCategory === 'health' ? (
          <HealthPanel healthScore={tokens?.healthScore} />
        ) : activeCategory === 'component' ? (
          <ComponentPanel componentDetection={tokens?.componentDetection} />
        ) : !tokenData ? (
          <div style={{ color: 'var(--t3)', fontFamily: "'Azeret Mono', monospace", fontSize: 12 }}>
            No tokens available for this mode.
          </div>
        ) : activeCategory === 'colors' ? (
          <ColorsPanel tokens={tokenData.colors} onCopy={copyToken} copied={copied} />
        ) : activeCategory === 'typography' ? (
          <TypographyPanel typography={tokenData.typography} onCopy={copyToken} copied={copied} />
        ) : activeCategory === 'spacing' ? (
          <SpacingPanel spacing={tokenData.spacing} baseUnit={tokenData.meta?.baseUnit} onCopy={copyToken} copied={copied} />
        ) : activeCategory === 'radius' ? (
          <RadiusPanel radius={tokenData.radius} onCopy={copyToken} copied={copied} />
        ) : activeCategory === 'shadows' ? (
          <ShadowsPanel shadows={tokenData.shadows} onCopy={copyToken} copied={copied} />
        ) : activeCategory === 'animations' ? (
          <AnimationsPanel animations={tokenData.animations} onCopy={copyToken} copied={copied} />
        ) : null}
      </main>

      {/* Export sidebar */}
      <ExportSidebar tokens={tokens} sourceUrl={sourceUrl} mode={activeMode} tokenData={tokenData} />
    </div>
  );
}
