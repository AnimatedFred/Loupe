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
import AiAnalysis from './AiAnalysis';
import ExportSidebar from './ExportSidebar';
import CurationPanel from './panels/CurationPanel';


const CATEGORIES = [
  { id: 'colors',     label: 'Colors',     dot: '#00FF87' },
  { id: 'typography', label: 'Typography', dot: '#818cf8' },
  { id: 'spacing',    label: 'Spacing',    dot: '#38bdf8' },
  { id: 'radius',     label: 'Radius',     dot: '#fb923c' },
  { id: 'shadows',    label: 'Shadows',    dot: '#e879f9' },
  { id: 'animations', label: 'Animations', dot: '#34d399' },
  { id: 'health',     label: 'Health',     dot: '#FFB020' },
  { id: 'component',  label: 'Components', dot: '#c084fc' },
  { id: 'ai',         label: 'AI Analysis', dot: '#00FF87' },
];

function tokenCount(tokens, mode, category, curatedTokens) {
  if (category === 'curate') {
    const src = curatedTokens || tokens?.[mode];
    if (!src) return 0;
    return (src.colors?.length || 0) +
      (src.typography?.families?.length || 0) + (src.typography?.sizes?.length || 0) +
      (src.spacing?.length || 0) + (src.radius?.length || 0) + (src.shadows?.length || 0);
  }
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
  if (category === 'ai') return 4;
  return 0;
}

export default function TokenExplorer({ tokens, sourceUrl, projectSlug, onSaveCuratedTokens }) {
  const [activeCategory, setActiveCategory] = useState('colors');
  const [mode, setMode] = useState('dark');
  const [copied, setCopied] = useState(null);
  const [curatedTokens, setCuratedTokens] = useState(null);

  const hasBothModes = tokens?.hasDark && tokens?.hasLight;
  const primaryMode = tokens?.hasDark ? 'dark' : 'light';
  const activeMode = hasBothModes ? mode : primaryMode;

  // Detect if dark/light token sets are identical (site ignores prefers-color-scheme)
  const modesAreSame = hasBothModes && (() => {
    const d = tokens?.dark?.colors;
    const l = tokens?.light?.colors;
    if (!d || !l || d.length !== l.length) return false;
    return d.slice(0, 3).every((t, i) => t.value === l[i]?.value);
  })();

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

  function handleCategorySelect(catId) {
    setActiveCategory(catId);
    if (catId === 'curate' && curatedTokens === null && tokenData) {
      setCuratedTokens(structuredClone(tokenData));
    }
  }

  function handleRenameToken(category, name, newName) {
    setCuratedTokens(prev => {
      const next = structuredClone(prev);
      const idx = next[category].findIndex(t => t.name === name);
      if (idx !== -1) next[category][idx] = { ...next[category][idx], name: newName };
      return next;
    });
  }

  function handleRenameTypography(subKey, name, newName) {
    setCuratedTokens(prev => {
      const next = structuredClone(prev);
      const idx = next.typography[subKey].findIndex(t => t.name === name);
      if (idx !== -1) next.typography[subKey][idx] = { ...next.typography[subKey][idx], name: newName };
      return next;
    });
  }

  function handleDeleteToken(category, name) {
    setCuratedTokens(prev => {
      const next = structuredClone(prev);
      if (category === 'typography-families') {
        next.typography = { ...next.typography, families: next.typography.families.filter(t => t.name !== name) };
      } else if (category === 'typography-sizes') {
        next.typography = { ...next.typography, sizes: next.typography.sizes.filter(t => t.name !== name) };
      } else {
        next[category] = next[category].filter(t => t.name !== name);
      }
      return next;
    });
  }

  function handleMergeColors(names) {
    setCuratedTokens(prev => {
      const next = structuredClone(prev);
      const candidates = next.colors.filter(t => names.includes(t.name));
      const canonical = candidates.reduce((a, b) => b.frequency > a.frequency ? b : a);
      next.colors = next.colors.filter(t => !names.includes(t.name) || t.name === canonical.name);
      return next;
    });
  }

  function handleCurateReset() {
    setCuratedTokens(structuredClone(tokenData));
  }

  const panelTitles = {
    colors: 'Colors', typography: 'Typography', spacing: 'Spacing', radius: 'Radius', shadows: 'Shadows',
    animations: 'Animations', curate: 'Curate Tokens', health: 'Health Score', component: 'Components', ai: 'AI Analysis',
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

          {CATEGORIES.filter(cat => cat.id !== 'ai').map(cat => {
            const count = tokenCount(tokens, activeMode, cat.id, curatedTokens);
            const active = activeCategory === cat.id;
            return (
              <div key={cat.id} onClick={() => handleCategorySelect(cat.id)} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '7px 10px', borderRadius: 4, cursor: 'pointer',
                marginBottom: 2, transition: 'background 0.12s',
                background: active ? 'rgba(0,255,135,0.06)' : 'transparent',
                border: active ? '1px solid rgba(0,255,135,0.2)' : '1px solid transparent',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', background: active ? 'var(--neon)' : cat.dot, flexShrink: 0,
                    boxShadow: active ? '0 0 8px rgba(0,255,135,0.6)' : 'none',
                    transition: 'box-shadow 0.15s',
                  }} />
                  <span style={{ fontFamily: "'Azeret Mono', monospace", fontSize: 12, color: active ? 'var(--neon)' : 'rgba(242,242,244,0.55)' }}>{cat.label}</span>
                </div>
                <span style={{
                  fontFamily: "'Azeret Mono', monospace", fontSize: 9,
                  color: active ? 'var(--neon)' : 'var(--t3)',
                  background: active ? 'rgba(0,255,135,0.1)' : 'var(--layer)',
                  padding: '1px 6px', borderRadius: 3,
                  border: active ? '1px solid rgba(0,255,135,0.1)' : '1px solid var(--border)',
                }}>{count}</span>
              </div>
            );
          })}
        </div>

        {/* Curate section */}
        <div style={{ padding: '0 16px 16px', borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
          <div style={{
            fontFamily: "'Azeret Mono', monospace", fontSize: 9, letterSpacing: 2,
            textTransform: 'uppercase', color: 'var(--t3)', padding: '8px 0', marginBottom: 8,
          }}>Curation</div>
          {(() => {
            const active = activeCategory === 'curate';
            const count = tokenCount(tokens, activeMode, 'curate', curatedTokens);
            return (
              <div onClick={() => handleCategorySelect('curate')} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '7px 10px', borderRadius: 6, cursor: 'pointer',
                transition: 'background 0.12s',
                background: active ? 'rgba(0,255,135,0.06)' : 'transparent',
                border: active ? '1px solid rgba(0,255,135,0.2)' : '1px solid transparent',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', background: active ? 'var(--neon)' : '#00FF87', flexShrink: 0,
                    boxShadow: active ? '0 0 8px rgba(0,255,135,0.6)' : 'none',
                    transition: 'box-shadow 0.15s',
                  }} />
                  <span style={{ fontFamily: "'Azeret Mono', monospace", fontSize: 12, color: active ? 'var(--neon)' : 'rgba(242,242,244,0.55)' }}>Curate</span>
                </div>
                <span style={{
                  fontFamily: "'Azeret Mono', monospace", fontSize: 9,
                  color: active ? 'var(--neon)' : 'var(--t3)',
                  background: active ? 'rgba(0,255,135,0.1)' : 'var(--layer)',
                  padding: '1px 6px', borderRadius: 3,
                  border: active ? '1px solid rgba(0,255,135,0.1)' : '1px solid var(--border)',
                }}>{count}</span>
              </div>
            );
          })()}
        </div>

        {/* AI Intelligence section */}
        <div style={{ padding: '0 16px 16px', borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
          <div style={{
            fontFamily: "'Azeret Mono', monospace", fontSize: 9, letterSpacing: 2,
            textTransform: 'uppercase', color: 'var(--t3)', padding: '8px 0', marginBottom: 8,
          }}>Intelligence</div>
          {(() => {
            const active = activeCategory === 'ai';
            return (
              <div onClick={() => handleCategorySelect('ai')} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '7px 10px', borderRadius: 6, cursor: 'pointer',
                transition: 'background 0.12s',
                background: active ? 'var(--neon-dim)' : 'transparent',
                border: active ? '1px solid rgba(0,255,135,0.15)' : '1px solid transparent',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00FF87', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 500, color: active ? 'var(--neon)' : 'var(--t1)' }}>AI Analysis</span>
                </div>
                <span style={{
                  fontFamily: "'Azeret Mono', monospace", fontSize: 9,
                  color: active ? 'var(--neon)' : 'var(--t3)',
                  background: active ? 'rgba(0,255,135,0.15)' : 'var(--lift)',
                  padding: '1px 6px', borderRadius: 3,
                }}>4</span>
              </div>
            );
          })()}
        </div>

        {/* Mode toggle */}
        {hasBothModes && activeCategory !== 'curate' && (
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
            {modesAreSame && (
              <div style={{
                marginTop: 8,
                fontFamily: "'Azeret Mono', monospace", fontSize: 9,
                color: 'rgba(242,242,244,0.3)', lineHeight: 1.6, letterSpacing: 0.3,
              }}>
                Site doesn't implement <code style={{ color: 'rgba(242,242,244,0.45)' }}>prefers-color-scheme</code> — both modes are identical.
              </div>
            )}
          </div>
        )}
        {hasBothModes && activeCategory === 'curate' && curatedTokens !== null && (
          <div style={{ padding: '0 16px 16px', borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
            <div style={{
              fontFamily: "'Azeret Mono', monospace", fontSize: 9, color: 'var(--t3)',
              lineHeight: 1.7, letterSpacing: 0.3,
            }}>
              Mode locked while curating.<br/>Reset to switch.
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
        <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16, marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 12 }}>
            <h1 style={{
              fontFamily: "'Manrope', sans-serif", fontSize: 36, fontWeight: 700,
              letterSpacing: '-1px', lineHeight: 1.1, color: 'var(--t1)',
            }}>
              {panelTitles[activeCategory]}
            </h1>
            <div style={{ fontFamily: "'Azeret Mono', monospace", fontSize: 10, color: 'var(--t3)', letterSpacing: 0.5, flexShrink: 0, paddingBottom: 4 }}>
              {tokenCount(tokens, activeMode, activeCategory, curatedTokens)} tokens · {hostname}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'var(--layer)', border: '1px solid var(--border)',
              borderRadius: 4, padding: '6px 12px',
            }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: 'linear-gradient(135deg, #6366f1, #4338ca)', flexShrink: 0 }} />
              <span style={{ fontFamily: "'Azeret Mono', monospace", fontSize: 12, color: 'var(--t2)' }}>{hostname}</span>
            </div>
            <span style={{
              fontFamily: "'Azeret Mono', monospace", fontSize: 9, color: 'var(--neon)',
              background: 'var(--neon-dim)', border: '1px solid rgba(0,255,135,0.2)',
              borderRadius: 3, padding: '3px 8px', letterSpacing: 1,
            }}>EXTRACTED</span>
          </div>
        </div>

        {/* Token panels */}
        {activeCategory === 'curate' ? (
          <CurationPanel
            curatedTokens={curatedTokens}
            originalTokens={tokenData}
            fullTokens={tokens}
            mode={activeMode}
            sourceUrl={sourceUrl}
            onRenameToken={handleRenameToken}
            onRenameTypography={handleRenameTypography}
            onDeleteToken={handleDeleteToken}
            onMergeColors={handleMergeColors}
            onReset={handleCurateReset}
            onSaveCuratedTokens={onSaveCuratedTokens}
          />
        ) : activeCategory === 'health' ? (
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
        ) : activeCategory === 'ai' ? (
          <AiAnalysis tokens={tokens} mode={activeMode} inline />
        ) : null}
      </main>

      {/* Export sidebar */}
      <ExportSidebar tokens={tokens} sourceUrl={sourceUrl} mode={activeMode} tokenData={tokenData} curatedTokenData={curatedTokens} projectSlug={projectSlug} />
    </div>
  );
}
