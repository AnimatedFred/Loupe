'use client';

import { useState } from 'react';
import { useUser } from '../../context/UserContext';

function ProNudge() {
  return (
    <div style={{
      position: 'absolute', bottom: '130%', left: '50%', transform: 'translateX(-50%)',
      background: 'rgba(255,171,0,0.12)', border: '1px solid rgba(255,171,0,0.3)',
      color: '#FFAB00', borderRadius: 3, padding: '3px 8px',
      fontFamily: "'Azeret Mono', monospace", fontSize: 9, whiteSpace: 'nowrap',
      pointerEvents: 'none', zIndex: 20,
    }}>
      Pro feature
    </div>
  );
}

function TokenPreview({ type, token }) {
  if (type === 'colors') {
    return (
      <div style={{
        width: 18, height: 18, borderRadius: 3,
        background: token.value,
        border: '1px solid rgba(255,255,255,0.1)',
        flexShrink: 0,
      }} />
    );
  }
  if (type === 'typography-family') {
    return (
      <span style={{
        fontSize: 13, fontFamily: token.value,
        color: 'var(--t2)', lineHeight: 1, flexShrink: 0,
      }}>Aa</span>
    );
  }
  if (type === 'typography-size') {
    const px = Math.min(parseFloat(token.value) || 13, 16);
    return (
      <span style={{
        fontSize: px, fontFamily: 'var(--display)',
        color: 'var(--t2)', lineHeight: 1, flexShrink: 0,
      }}>A</span>
    );
  }
  if (type === 'spacing') {
    const w = Math.min((parseFloat(token.value) || 0) / 2, 72);
    return (
      <div style={{
        width: Math.max(w, 4), height: 4, borderRadius: 1,
        background: 'var(--neon)', flexShrink: 0, opacity: 0.7,
      }} />
    );
  }
  if (type === 'radius') {
    const r = Math.min(parseFloat(token.value) || 0, 8);
    return (
      <div style={{
        width: 18, height: 18, borderRadius: r,
        border: '1px solid var(--t3)', flexShrink: 0,
      }} />
    );
  }
  if (type === 'shadows') {
    return (
      <div style={{
        width: 18, height: 18, borderRadius: 3,
        background: 'var(--surface)',
        boxShadow: token.value,
        flexShrink: 0,
        border: '1px solid transparent',
      }} />
    );
  }
  return <div style={{ width: 18, height: 18 }} />;
}

function TokenRow({ token, type, category, subKey, isEditing, editValue, checkedColors,
  isPro, nudgeVisible, hoveredRow, onHover,
  onDoubleClickName, onEditChange, onEditBlur, onEditKeyDown,
  onToggleCheck, onDelete, onNudge }) {

  const isHovered = hoveredRow === token.name;
  const isChecked = checkedColors?.has(token.name);
  const showCheckbox = type === 'colors';
  const anyChecked = checkedColors?.size > 0;

  return (
    <div
      onMouseEnter={() => onHover(token.name)}
      onMouseLeave={() => onHover(null)}
      style={{
        display: 'grid',
        gridTemplateColumns: showCheckbox ? '20px 28px 1fr auto auto 24px' : '28px 1fr auto auto 24px',
        alignItems: 'center', gap: 8,
        padding: '6px 10px', borderRadius: 3,
        background: isChecked ? 'rgba(0,255,135,0.04)' : isHovered ? 'var(--surface)' : 'var(--layer)',
        border: isChecked ? '1px solid rgba(0,255,135,0.18)' : isHovered ? '1px solid var(--border-md)' : '1px solid var(--border)',
        marginBottom: 3,
        transition: 'background 0.1s, border-color 0.1s',
      }}
    >
      {/* Checkbox (colors only) */}
      {showCheckbox && (
        <div
          onClick={() => isPro ? onToggleCheck(token.name) : onNudge()}
          style={{
            width: 14, height: 14, borderRadius: 2, cursor: 'pointer',
            border: isChecked ? '1px solid var(--neon)' : '1px solid var(--border)',
            background: isChecked ? 'var(--neon)' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: isHovered || anyChecked ? 1 : 0,
            transition: 'opacity 0.12s',
            flexShrink: 0,
          }}
        >
          {isChecked && (
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <polyline points="1,4 3,6 7,2" stroke="#050508" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      )}

      {/* Preview */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <TokenPreview type={type} token={token} />
      </div>

      {/* Name */}
      <div style={{ overflow: 'hidden' }}>
        {isEditing ? (
          <input
            autoFocus
            value={editValue}
            onChange={e => onEditChange(e.target.value)}
            onBlur={onEditBlur}
            onKeyDown={onEditKeyDown}
            style={{
              width: '100%', background: 'var(--void)',
              border: '1px solid var(--neon)', borderRadius: 2,
              color: 'var(--t1)', fontFamily: "'Azeret Mono', monospace",
              fontSize: 11, padding: '2px 6px', outline: 'none',
            }}
          />
        ) : (
          <span
            onDoubleClick={() => isPro ? onDoubleClickName(token, category, subKey) : onNudge()}
            title={isPro ? 'Double-click to rename' : 'Pro: rename tokens'}
            style={{
              fontFamily: "'Azeret Mono', monospace", fontSize: 11,
              color: 'var(--t1)', cursor: isPro ? 'text' : 'default',
              display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
          >
            {token.name}
          </span>
        )}
      </div>

      {/* Value chip */}
      <span style={{
        fontFamily: "'Azeret Mono', monospace", fontSize: 9, color: 'var(--t3)',
        background: 'var(--void)', border: '1px solid var(--border)',
        borderRadius: 2, padding: '2px 6px',
        maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        flexShrink: 0,
      }}>
        {token.value}
      </span>

      {/* Freq badge */}
      <span style={{
        fontFamily: "'Azeret Mono', monospace", fontSize: 9, color: 'var(--t3)',
        background: 'var(--surface)', borderRadius: 2, padding: '2px 5px',
        flexShrink: 0,
      }}>
        {token.frequency}×
      </span>

      {/* Delete */}
      <button
        onClick={() => isPro ? onDelete(category, subKey, token.name) : onNudge()}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: isHovered ? (isPro ? '#FF4D4D' : 'var(--t3)') : 'transparent',
          fontFamily: "'Azeret Mono', monospace", fontSize: 14, lineHeight: 1,
          padding: 0, transition: 'color 0.1s', flexShrink: 0,
        }}
        title={isPro ? 'Delete token' : 'Pro: delete tokens'}
      >
        ×
      </button>
    </div>
  );
}

function CurationSection({ id, label, dot, tokens, type, subKey, collapsed, onToggle,
  editingToken, editValue, checkedColors,
  isPro, nudgeVisible, onNudge,
  onDoubleClickName, onEditChange, onEditBlur, onEditKeyDown,
  onToggleCheck, onDelete }) {

  const [hoveredRow, setHoveredRow] = useState(null);
  if (!tokens?.length) return null;

  return (
    <div style={{ marginBottom: 4 }}>
      {/* Section header */}
      <div
        onClick={() => onToggle(id)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '9px 10px', cursor: 'pointer',
          borderBottom: collapsed ? '1px solid var(--border)' : 'none',
          userSelect: 'none',
        }}
      >
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: dot, flexShrink: 0 }} />
        <span style={{
          fontFamily: "'Azeret Mono', monospace", fontSize: 9, letterSpacing: 2,
          textTransform: 'uppercase', color: 'var(--t2)', flex: 1,
        }}>
          {label}
        </span>
        <span style={{
          fontFamily: "'Azeret Mono', monospace", fontSize: 9, color: 'var(--t3)',
        }}>
          {tokens.length}
        </span>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
          stroke="var(--t3)" strokeWidth="2" strokeLinecap="round"
          style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.15s', flexShrink: 0 }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {!collapsed && (
        <div style={{ padding: '6px 0 12px' }}>
          {tokens.map(token => {
            const isEditing = editingToken?.name === token.name && editingToken?.subKey === subKey;
            return (
              <TokenRow
                key={token.name}
                token={token}
                type={type}
                category={id}
                subKey={subKey}
                isEditing={isEditing}
                editValue={isEditing ? editValue : ''}
                checkedColors={checkedColors}
                isPro={isPro}
                nudgeVisible={nudgeVisible}
                hoveredRow={hoveredRow}
                onHover={setHoveredRow}
                onDoubleClickName={onDoubleClickName}
                onEditChange={onEditChange}
                onEditBlur={onEditBlur}
                onEditKeyDown={onEditKeyDown}
                onToggleCheck={onToggleCheck}
                onDelete={onDelete}
                onNudge={onNudge}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function CurationPanel({
  curatedTokens, originalTokens, fullTokens, mode, sourceUrl,
  onRenameToken, onRenameTypography, onDeleteToken, onMergeColors, onReset,
}) {
  const { tier } = useUser() || {};
  const isPro = tier === 'pro';

  const [collapsed, setCollapsed] = useState({});
  const [editingToken, setEditingToken] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [checkedColors, setCheckedColors] = useState(new Set());
  const [mergeConfirm, setMergeConfirm] = useState(false);
  const [nudgeVisible, setNudgeVisible] = useState(false);
  const [nudgeTimer, setNudgeTimer] = useState(null);

  function triggerNudge() {
    setNudgeVisible(true);
    if (nudgeTimer) clearTimeout(nudgeTimer);
    setNudgeTimer(setTimeout(() => setNudgeVisible(false), 2200));
  }

  function toggleSection(id) {
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));
  }

  function startRename(token, category, subKey) {
    setEditingToken({ name: token.name, category, subKey: subKey || null });
    setEditValue(token.name);
  }

  function commitRename() {
    if (!editingToken) return;
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== editingToken.name) {
      if (editingToken.subKey) {
        onRenameTypography(editingToken.subKey, editingToken.name, trimmed);
      } else {
        onRenameToken(editingToken.category, editingToken.name, trimmed);
      }
    }
    setEditingToken(null);
    setEditValue('');
  }

  function handleEditKeyDown(e) {
    if (e.key === 'Enter') { e.currentTarget.blur(); }
    if (e.key === 'Escape') { setEditingToken(null); setEditValue(''); }
  }

  function toggleCheck(name) {
    setCheckedColors(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
    setMergeConfirm(false);
  }

  function handleDelete(category, subKey, name) {
    if (subKey) {
      onRenameTypography && onDeleteTypography(subKey, name);
    } else {
      onDeleteToken(category, name);
    }
    if (checkedColors.has(name)) {
      setCheckedColors(prev => { const n = new Set(prev); n.delete(name); return n; });
    }
  }

  function handleDeleteTypography(subKey, name) {
    // pass through a special call — TokenExplorer handles via onDeleteToken with category='typography-'+subKey
    // For simplicity, we use onRenameTypography as a deletion flag — but actually we need a real delete.
    // This is handled by the parent via onDeleteToken with special category key.
    onDeleteToken('typography-' + subKey, name);
  }

  function confirmMerge() {
    onMergeColors(Array.from(checkedColors));
    setCheckedColors(new Set());
    setMergeConfirm(false);
  }

  async function handleGenerateSubsrf() {
    if (!curatedTokens || !fullTokens) return;
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokens: { ...fullTokens, [mode]: curatedTokens },
          format: 'subsrf',
          mode,
        }),
      });
      const data = await res.json();
      const blob = new Blob([data.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'design.subsrf';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Generate failed:', err);
    }
  }

  if (!curatedTokens) {
    return (
      <div style={{ color: 'var(--t3)', fontFamily: "'Azeret Mono', monospace", fontSize: 12, padding: '24px 0' }}>
        Loading curation view...
      </div>
    );
  }

  const totalCount =
    (curatedTokens.colors?.length || 0) +
    (curatedTokens.typography?.families?.length || 0) +
    (curatedTokens.typography?.sizes?.length || 0) +
    (curatedTokens.spacing?.length || 0) +
    (curatedTokens.radius?.length || 0) +
    (curatedTokens.shadows?.length || 0);

  const sharedRowProps = {
    editingToken, editValue, checkedColors,
    isPro, nudgeVisible, onNudge: triggerNudge,
    onDoubleClickName: startRename,
    onEditChange: setEditValue,
    onEditBlur: commitRename,
    onEditKeyDown: handleEditKeyDown,
    onToggleCheck: toggleCheck,
    onDelete: handleDelete,
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Panel header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border)',
      }}>
        <div>
          <div style={{
            fontFamily: "'Azeret Mono', monospace", fontSize: 9, letterSpacing: 2,
            textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 4,
          }}>
            {totalCount} tokens · curated
          </div>
          {!isPro && (
            <div style={{
              fontFamily: "'Azeret Mono', monospace", fontSize: 9,
              color: '#FFAB00', background: 'rgba(255,171,0,0.08)',
              border: '1px solid rgba(255,171,0,0.2)', borderRadius: 3,
              padding: '2px 7px', display: 'inline-block',
            }}>
              Pro: merge · rename · delete
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {nudgeVisible && (
            <span style={{
              fontFamily: "'Azeret Mono', monospace", fontSize: 9,
              color: '#FFAB00', background: 'rgba(255,171,0,0.08)',
              border: '1px solid rgba(255,171,0,0.2)', borderRadius: 3, padding: '3px 8px',
            }}>
              Pro feature
            </span>
          )}
          <button
            onClick={onReset}
            style={{
              background: 'transparent', border: '1px solid var(--border)',
              color: 'var(--t2)', borderRadius: 3, padding: '5px 12px',
              fontFamily: "'Azeret Mono', monospace", fontSize: 10, cursor: 'pointer',
            }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* Colors section */}
      <CurationSection
        id="colors" label="Colors" dot="#00FF87"
        tokens={curatedTokens.colors} type="colors"
        collapsed={!!collapsed.colors} onToggle={toggleSection}
        {...sharedRowProps}
      />

      {/* Typography — two subsections */}
      {((curatedTokens.typography?.families?.length || 0) + (curatedTokens.typography?.sizes?.length || 0)) > 0 && (
        <div style={{ marginBottom: 4 }}>
          <div
            onClick={() => toggleSection('typography')}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '9px 10px', cursor: 'pointer', userSelect: 'none',
            }}
          >
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#818cf8', flexShrink: 0 }} />
            <span style={{ fontFamily: "'Azeret Mono', monospace", fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--t2)', flex: 1 }}>Typography</span>
            <span style={{ fontFamily: "'Azeret Mono', monospace", fontSize: 9, color: 'var(--t3)' }}>
              {(curatedTokens.typography?.families?.length || 0) + (curatedTokens.typography?.sizes?.length || 0)}
            </span>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="2" strokeLinecap="round"
              style={{ transform: collapsed.typography ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.15s', flexShrink: 0 }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
          {!collapsed.typography && (
            <div style={{ padding: '6px 0 12px' }}>
              {curatedTokens.typography?.families?.map(token => {
                const isEditing = editingToken?.name === token.name && editingToken?.subKey === 'families';
                return (
                  <TypoRow key={token.name} token={token} type="typography-family" subKey="families"
                    isEditing={isEditing} {...sharedRowProps} />
                );
              })}
              {curatedTokens.typography?.sizes?.length > 0 && (
                <div style={{ fontFamily: "'Azeret Mono', monospace", fontSize: 8, letterSpacing: 1.5, color: 'var(--t3)', textTransform: 'uppercase', padding: '6px 10px 4px' }}>
                  Sizes
                </div>
              )}
              {curatedTokens.typography?.sizes?.map(token => {
                const isEditing = editingToken?.name === token.name && editingToken?.subKey === 'sizes';
                return (
                  <TypoRow key={token.name} token={token} type="typography-size" subKey="sizes"
                    isEditing={isEditing} {...sharedRowProps} />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Spacing */}
      <CurationSection
        id="spacing" label="Spacing" dot="#38bdf8"
        tokens={curatedTokens.spacing} type="spacing"
        collapsed={!!collapsed.spacing} onToggle={toggleSection}
        {...sharedRowProps}
      />

      {/* Radius */}
      <CurationSection
        id="radius" label="Radius" dot="#fb923c"
        tokens={curatedTokens.radius} type="radius"
        collapsed={!!collapsed.radius} onToggle={toggleSection}
        {...sharedRowProps}
      />

      {/* Shadows */}
      <CurationSection
        id="shadows" label="Shadows" dot="#e879f9"
        tokens={curatedTokens.shadows} type="shadows"
        collapsed={!!collapsed.shadows} onToggle={toggleSection}
        {...sharedRowProps}
      />

      {/* Merge action bar */}
      {checkedColors.size >= 2 && (
        <div style={{
          position: 'fixed', bottom: 72, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--lift)', border: '1px solid var(--border-md)',
          borderRadius: 6, padding: '10px 16px',
          display: 'flex', alignItems: 'center', gap: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,255,135,0.06)',
          zIndex: 50,
          fontFamily: "'Azeret Mono', monospace",
        }}>
          <span style={{ fontSize: 10, color: 'var(--t2)' }}>{checkedColors.size} selected</span>
          <span style={{ fontSize: 9, color: 'var(--t3)' }}>→ keep highest frequency</span>
          {!mergeConfirm ? (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => isPro ? setMergeConfirm(true) : triggerNudge()}
                style={{
                  background: 'var(--neon)', color: 'var(--void)',
                  border: 'none', borderRadius: 3, padding: '5px 12px',
                  fontFamily: "'Azeret Mono', monospace", fontSize: 10, fontWeight: 700,
                  letterSpacing: 1, cursor: 'pointer',
                }}
              >
                Merge
              </button>
              {nudgeVisible && !isPro && <ProNudge />}
            </div>
          ) : (
            <>
              <span style={{ fontSize: 10, color: 'var(--t1)' }}>Confirm?</span>
              <button onClick={confirmMerge} style={{
                background: 'var(--neon)', color: 'var(--void)', border: 'none',
                borderRadius: 3, padding: '5px 10px',
                fontFamily: "'Azeret Mono', monospace", fontSize: 10, fontWeight: 700, cursor: 'pointer',
              }}>Yes, merge</button>
              <button onClick={() => setMergeConfirm(false)} style={{
                background: 'transparent', color: 'var(--t2)',
                border: '1px solid var(--border)', borderRadius: 3, padding: '5px 10px',
                fontFamily: "'Azeret Mono', monospace", fontSize: 10, cursor: 'pointer',
              }}>Cancel</button>
            </>
          )}
          <button
            onClick={() => { setCheckedColors(new Set()); setMergeConfirm(false); }}
            style={{ background: 'none', border: 'none', color: 'var(--t3)', fontSize: 16, cursor: 'pointer', lineHeight: 1, padding: '0 0 0 4px' }}
          >×</button>
        </div>
      )}

      {/* Sticky Generate button */}
      <div style={{
        position: 'sticky', bottom: 0,
        background: 'linear-gradient(to top, var(--deep) 75%, transparent)',
        padding: '24px 0 8px', marginTop: 32,
      }}>
        <button
          onClick={handleGenerateSubsrf}
          style={{
            width: '100%', background: 'var(--neon)', color: 'var(--void)',
            border: 'none', borderRadius: 4, padding: '12px 0',
            fontFamily: "'Azeret Mono', monospace", fontSize: 12, fontWeight: 700,
            letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: '0 4px 20px rgba(0,255,135,0.2)',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Generate .subsrf
        </button>
        <div style={{
          textAlign: 'center', marginTop: 6,
          fontFamily: "'Azeret Mono', monospace", fontSize: 9, color: 'var(--t3)',
        }}>
          {totalCount} curated tokens
        </div>
      </div>
    </div>
  );
}

// Separate component for typography rows (shares logic with TokenRow but no checkbox)
function TypoRow({ token, type, subKey, isEditing, editValue,
  isPro, nudgeVisible, onNudge,
  onDoubleClickName, onEditChange, onEditBlur, onEditKeyDown, onDelete }) {

  const [hovered, setHovered] = useState(false);
  const category = 'typography';

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: '28px 1fr auto auto 24px',
        alignItems: 'center', gap: 8,
        padding: '6px 10px', borderRadius: 3,
        background: hovered ? 'var(--surface)' : 'var(--layer)',
        border: hovered ? '1px solid var(--border-md)' : '1px solid var(--border)',
        marginBottom: 3,
        transition: 'background 0.1s, border-color 0.1s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <TokenPreview type={type} token={token} />
      </div>

      <div style={{ overflow: 'hidden' }}>
        {isEditing ? (
          <input
            autoFocus value={editValue}
            onChange={e => onEditChange(e.target.value)}
            onBlur={onEditBlur}
            onKeyDown={onEditKeyDown}
            style={{
              width: '100%', background: 'var(--void)',
              border: '1px solid var(--neon)', borderRadius: 2,
              color: 'var(--t1)', fontFamily: "'Azeret Mono', monospace",
              fontSize: 11, padding: '2px 6px', outline: 'none',
            }}
          />
        ) : (
          <span
            onDoubleClick={() => isPro ? onDoubleClickName(token, category, subKey) : onNudge()}
            title={isPro ? 'Double-click to rename' : 'Pro: rename tokens'}
            style={{
              fontFamily: "'Azeret Mono', monospace", fontSize: 11,
              color: 'var(--t1)', cursor: isPro ? 'text' : 'default',
              display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
          >
            {token.name}
          </span>
        )}
      </div>

      <span style={{
        fontFamily: "'Azeret Mono', monospace", fontSize: 9, color: 'var(--t3)',
        background: 'var(--void)', border: '1px solid var(--border)',
        borderRadius: 2, padding: '2px 6px',
        maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        flexShrink: 0,
      }}>
        {token.value?.length > 18 ? token.value.slice(0, 18) + '…' : token.value}
      </span>

      <span style={{
        fontFamily: "'Azeret Mono', monospace", fontSize: 9, color: 'var(--t3)',
        background: 'var(--surface)', borderRadius: 2, padding: '2px 5px', flexShrink: 0,
      }}>
        {token.frequency}×
      </span>

      <button
        onClick={() => isPro ? onDelete(category, subKey, token.name) : onNudge()}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: hovered ? (isPro ? '#FF4D4D' : 'var(--t3)') : 'transparent',
          fontFamily: "'Azeret Mono', monospace", fontSize: 14, lineHeight: 1,
          padding: 0, transition: 'color 0.1s', flexShrink: 0,
        }}
      >×</button>
    </div>
  );
}
