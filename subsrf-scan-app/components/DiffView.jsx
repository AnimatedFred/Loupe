'use client';

import { useState } from 'react';

const STATUS_COLOR = {
  added:     'rgba(0,255,135,0.15)',
  removed:   'rgba(255,77,77,0.1)',
  changed:   'rgba(255,176,32,0.1)',
  identical: 'transparent',
};
const STATUS_BORDER = {
  added:     'rgba(0,255,135,0.3)',
  removed:   'rgba(255,77,77,0.3)',
  changed:   'rgba(255,176,32,0.3)',
  identical: 'var(--border)',
};
const STATUS_LABEL = {
  added: '+', removed: '−', changed: '~', identical: '=',
};
const STATUS_LABEL_COLOR = {
  added: 'var(--neon)', removed: '#FF4D4D', changed: '#FFB020', identical: 'var(--t3)',
};

function DiffSection({ title, data }) {
  const [showIdentical, setShowIdentical] = useState(false);
  if (!data?.changes?.length) return null;

  const visible = showIdentical ? data.changes : data.changes.filter(c => c.status !== 'identical');
  const identicalCount = data.changes.filter(c => c.status === 'identical').length;

  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontFamily: "'Azeret Mono', monospace", fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--t3)' }}>
          {title} — {data.diffCount} difference{data.diffCount !== 1 ? 's' : ''}
        </div>
        {identicalCount > 0 && (
          <button onClick={() => setShowIdentical(s => !s)} style={{
            fontFamily: "'Azeret Mono', monospace", fontSize: 9, color: 'var(--t3)',
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          }}>
            {showIdentical ? `hide ${identicalCount} identical` : `+ ${identicalCount} identical`}
          </button>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {visible.map((change, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: STATUS_COLOR[change.status],
            border: `1px solid ${STATUS_BORDER[change.status]}`,
            borderRadius: 7, padding: '10px 14px',
          }}>
            <span style={{
              fontFamily: "'Azeret Mono', monospace", fontSize: 12, fontWeight: 700,
              color: STATUS_LABEL_COLOR[change.status], width: 14, flexShrink: 0,
            }}>{STATUS_LABEL[change.status]}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "'Azeret Mono', monospace", fontSize: 10, color: 'var(--t2)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {change.name}
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {change.valueA && (
                  <span style={{ fontFamily: "'Azeret Mono', monospace", fontSize: 10, color: change.status === 'removed' ? '#FF4D4D' : 'var(--t3)' }}>
                    {change.valueA}
                  </span>
                )}
                {change.status === 'changed' && (
                  <span style={{ color: 'var(--t3)', fontSize: 10 }}>→</span>
                )}
                {change.valueB && (
                  <span style={{ fontFamily: "'Azeret Mono', monospace", fontSize: 10, color: change.status === 'added' ? 'var(--neon)' : change.status === 'changed' ? '#FFB020' : 'var(--t3)' }}>
                    {change.valueB}
                  </span>
                )}
              </div>
            </div>
            {change.delta !== undefined && (
              <span style={{ fontFamily: "'Azeret Mono', monospace", fontSize: 9, color: 'var(--t3)', flexShrink: 0 }}>
                ΔE {change.delta}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DiffView({ diff, urlA, urlB, onClose }) {
  if (!diff) return null;

  const hostnameA = (() => { try { return new URL(urlA.startsWith('http') ? urlA : 'https://' + urlA).hostname; } catch { return urlA; } })();
  const hostnameB = (() => { try { return new URL(urlB.startsWith('http') ? urlB : 'https://' + urlB).hostname; } catch { return urlB; } })();

  const distColor = diff.overallDistance < 30 ? 'var(--neon)' : diff.overallDistance < 60 ? '#FFB020' : '#FF4D4D';

  return (
    <div style={{
      borderTop: '1px solid var(--border)', padding: '32px',
      background: 'var(--void)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <div style={{ fontFamily: "'Azeret Mono', monospace", fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 8 }}>
            Token Diff
          </div>
          <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: 18, fontWeight: 700 }}>
            <span style={{ color: 'var(--neon)' }}>{hostnameA}</span>
            <span style={{ color: 'var(--t3)', margin: '0 10px' }}>vs</span>
            <span style={{ color: 'var(--t2)' }}>{hostnameB}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: 32, fontWeight: 800, color: distColor, lineHeight: 1 }}>
              {diff.overallDistance}
            </div>
            <div style={{ fontFamily: "'Azeret Mono', monospace", fontSize: 9, color: 'var(--t3)', marginTop: 4 }}>
              distance / 100
            </div>
          </div>
          <button onClick={onClose} style={{
            fontFamily: "'Azeret Mono', monospace", fontSize: 10, color: 'var(--t3)',
            background: 'var(--layer)', border: '1px solid var(--border)',
            borderRadius: 5, padding: '6px 12px', cursor: 'pointer',
          }}>✕ close</button>
        </div>
      </div>

      {/* Diff sections */}
      <DiffSection title="Colors" data={diff.colors} />
      <DiffSection title="Typography — Sizes" data={diff.typography?.sizes} />
      <DiffSection title="Typography — Families" data={diff.typography?.families} />
      <DiffSection title="Spacing" data={diff.spacing} />
      <DiffSection title="Radius" data={diff.radius} />
      <DiffSection title="Shadows" data={diff.shadows} />
      <DiffSection title="Animations" data={diff.animations} />
    </div>
  );
}
