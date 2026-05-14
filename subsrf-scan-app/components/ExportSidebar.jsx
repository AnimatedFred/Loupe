'use client';

import { useState } from 'react';

const FORMATS = [
  { id: 'css',              icon: 'CSS',  label: 'CSS Variables',    ext: 'css'  },
  { id: 'tailwind',         icon: 'TW',   label: 'Tailwind Config',  ext: 'js'   },
  { id: 'json',             icon: '{}',   label: 'JSON',             ext: 'json' },
  { id: 'style_dictionary', icon: 'SD',   label: 'Style Dictionary', ext: 'json' },
  { id: 'figma',            icon: 'Fig',  label: 'Figma Variables',  ext: 'json' },
  { id: 'ai_prompt',        icon: 'AI',   label: 'AI Prompt',        badge: '1 credit', ext: 'txt' },
];

export default function ExportSidebar({ tokens, sourceUrl, mode, tokenData }) {
  const [format, setFormat] = useState('css');
  const [preview, setPreview] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const hostname = (() => {
    try { return new URL(sourceUrl?.startsWith('http') ? sourceUrl : 'https://' + (sourceUrl || 'example.com')).hostname; }
    catch { return sourceUrl || 'tokens'; }
  })();

  async function loadPreview(fmt) {
    if (!tokens) return;
    if (fmt === 'ai_prompt') { setPreview('Generate to see preview'); return; }

    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokens, format: fmt, mode }),
      });
      const data = await res.json();
      setPreview(data.content || '');
    } catch {
      setPreview('Error generating preview');
    }
  }

  function handleFormatSelect(fmt) {
    setFormat(fmt);
    setPreview(null);
    loadPreview(fmt);
  }

  async function handleDownload() {
    if (!tokens) return;
    if (format === 'ai_prompt') {
      await handleAiPrompt(true);
      return;
    }

    const res = await fetch('/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokens, format, mode }),
    });
    const data = await res.json();
    const ext = FORMATS.find(f => f.id === format)?.ext || 'txt';
    const blob = new Blob([data.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${hostname}-tokens.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleAiPrompt(download = false) {
    setGenerating(true);
    try {
      const res = await fetch('/api/ai-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokens, mode }),
      });
      const data = await res.json();
      const text = data.prompt || data.error || 'Error generating prompt';
      setPreview(text);
      if (download) {
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${hostname}-tokens-ai-prompt.txt`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setGenerating(false);
    }
  }

  function handleCopy() {
    if (!preview) return;
    navigator.clipboard.writeText(preview).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  const totalTokens = tokenData?.meta?.totalTokens || 0;
  const baseUnit = tokenData?.meta?.baseUnit;

  return (
    <aside style={{
      background: 'var(--deep)', borderLeft: '1px solid var(--border)',
      padding: '24px 20px', position: 'sticky', top: 52,
      height: 'calc(100vh - 52px)', overflowY: 'auto',
    }}>
      <div style={{
        fontFamily: "'Azeret Mono', monospace", fontSize: 9, letterSpacing: 2,
        textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 16,
      }}>Export format</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 24 }}>
        {FORMATS.map(f => {
          const selected = format === f.id;
          return (
            <div key={f.id} onClick={() => handleFormatSelect(f.id)} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 7, cursor: 'pointer',
              transition: 'border-color 0.15s, background 0.15s',
              background: selected ? 'var(--neon-dim)' : 'var(--layer)',
              border: selected ? '1px solid rgba(0,255,135,0.25)' : '1px solid var(--border)',
            }}>
              <span style={{
                fontFamily: "'Azeret Mono', monospace", fontSize: 10, fontWeight: 600,
                color: selected ? 'var(--neon)' : 'var(--t3)', width: 28, textAlign: 'center',
              }}>{f.icon}</span>
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--t1)', flex: 1 }}>{f.label}</span>
              {f.badge && (
                <span style={{
                  fontFamily: "'Azeret Mono', monospace", fontSize: 8,
                  color: 'rgba(0,255,135,0.7)', background: 'rgba(0,255,135,0.08)',
                  borderRadius: 3, padding: '1px 5px', border: '1px solid rgba(0,255,135,0.15)',
                }}>{f.badge}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Code preview */}
      <div style={{
        background: 'var(--void)', border: '1px solid var(--border)',
        borderRadius: 8, overflow: 'hidden', marginBottom: 16,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 14px', background: 'var(--layer)', borderBottom: '1px solid var(--border)',
        }}>
          <span style={{ fontFamily: "'Azeret Mono', monospace", fontSize: 9, color: 'var(--t3)', letterSpacing: 1, textTransform: 'uppercase' }}>
            {FORMATS.find(f => f.id === format)?.ext || 'text'}
          </span>
          <button onClick={handleCopy} style={{
            fontFamily: "'Azeret Mono', monospace", fontSize: 9, color: copied ? 'var(--neon)' : 'var(--neon)',
            background: 'none', border: 'none', cursor: 'pointer', padding: 0, letterSpacing: 0.5, opacity: 0.7,
          }}>
            {copied ? '✓ copied' : '⎘ copy'}
          </button>
        </div>
        <div style={{
          padding: 14, fontFamily: "'Azeret Mono', monospace", fontSize: 10,
          lineHeight: 1.85, color: 'var(--t2)', overflow: 'auto',
          maxHeight: 220, scrollbarWidth: 'thin',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          {format === 'ai_prompt' && !preview
            ? <span style={{ color: 'var(--t3)' }}>Click Generate to create AI prompt (1 credit)</span>
            : preview
              ? preview.slice(0, 600) + (preview.length > 600 ? '\n...' : '')
              : <span style={{ color: 'var(--t3)' }}>{tokens ? 'Select a format to preview' : 'Extract tokens first'}</span>
          }
        </div>
      </div>

      {format === 'ai_prompt' ? (
        <button onClick={() => handleAiPrompt(false)} disabled={!tokens || generating} style={{
          width: '100%', background: 'var(--neon)', color: 'var(--void)',
          border: 'none', borderRadius: 8, padding: 12,
          fontFamily: "'Azeret Mono', monospace", fontSize: 12, fontWeight: 600, letterSpacing: 0.5,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          marginBottom: 10, opacity: (!tokens || generating) ? 0.6 : 1,
        }}>
          {generating ? '⟳ Generating...' : '★ Generate AI Prompt (1 credit)'}
        </button>
      ) : (
        <button onClick={handleDownload} disabled={!tokens} style={{
          width: '100%', background: 'var(--neon)', color: 'var(--void)',
          border: 'none', borderRadius: 8, padding: 12,
          fontFamily: "'Azeret Mono', monospace", fontSize: 12, fontWeight: 600, letterSpacing: 0.5,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          marginBottom: 10, opacity: !tokens ? 0.4 : 1,
        }}>
          ↓ Download tokens
        </button>
      )}

      <button onClick={handleCopy} disabled={!preview} style={{
        width: '100%', background: 'transparent', color: 'var(--t2)',
        border: '1px solid var(--border)', borderRadius: 8, padding: 10,
        fontFamily: "'Azeret Mono', monospace", fontSize: 11,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        opacity: !preview ? 0.4 : 1,
      }}>
        ⎘ Copy to clipboard
      </button>

      <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '28px 0' }} />

      {/* Token stats */}
      <div style={{
        fontFamily: "'Azeret Mono', monospace", fontSize: 9, letterSpacing: 2,
        textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 16,
      }}>Token stats</div>

      {[
        ['Total tokens', totalTokens || '—'],
        ['Base unit', baseUnit ? `${baseUnit}px` : '—'],
        ['Dark mode', tokens?.hasDark ? 'detected' : '—'],
        ['Light mode', tokens?.hasLight ? 'detected' : '—'],
        ['Extraction', tokenData?.meta?.extractionMs ? `${(tokenData.meta.extractionMs / 1000).toFixed(1)}s` : '—'],
      ].map(([label, value]) => (
        <div key={label} style={{
          display: 'flex', justifyContent: 'space-between',
          padding: '6px 0', borderBottom: '1px solid var(--border)',
        }}>
          <span style={{ fontFamily: "'Azeret Mono', monospace", fontSize: 10, color: 'var(--t3)' }}>{label}</span>
          <span style={{
            fontFamily: "'Azeret Mono', monospace", fontSize: 10,
            color: (value === 'detected' || (typeof value === 'string' && value.endsWith('s'))) ? 'var(--neon)' : 'var(--t1)',
          }}>{value}</span>
        </div>
      ))}
    </aside>
  );
}
