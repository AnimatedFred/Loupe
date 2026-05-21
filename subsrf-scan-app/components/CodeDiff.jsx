'use client';

import { useState } from 'react';

export default function CodeDiff({ before, after }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(after || '').then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div style={{ borderRadius: 4, overflow: 'hidden', border: '1px solid rgba(242,242,244,0.07)' }}>
      {/* Before */}
      <div>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '5px 12px',
          background: 'rgba(255,77,77,0.07)',
          borderBottom: '1px solid rgba(255,77,77,0.12)',
        }}>
          <span style={{
            fontFamily: "'Azeret Mono', monospace", fontSize: 8,
            color: '#FF4D4D', letterSpacing: 1.5, textTransform: 'uppercase',
          }}>Before</span>
          <span style={{
            fontFamily: "'Azeret Mono', monospace", fontSize: 8,
            color: 'rgba(255,77,77,0.4)',
          }}>−</span>
        </div>
        <pre style={{
          margin: 0, padding: '10px 12px',
          background: 'rgba(255,30,30,0.04)',
          fontFamily: "'Azeret Mono', monospace", fontSize: 11,
          color: 'rgba(255,120,120,0.85)', lineHeight: 1.7,
          overflowX: 'auto', whiteSpace: 'pre',
          borderBottom: '1px solid rgba(242,242,244,0.06)',
        }}>
          {before || '(empty)'}
        </pre>
      </div>

      {/* After */}
      <div>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '5px 12px',
          background: 'rgba(0,255,135,0.05)',
          borderBottom: '1px solid rgba(0,255,135,0.1)',
        }}>
          <span style={{
            fontFamily: "'Azeret Mono', monospace", fontSize: 8,
            color: '#00FF87', letterSpacing: 1.5, textTransform: 'uppercase',
          }}>After</span>
          <span style={{
            fontFamily: "'Azeret Mono', monospace", fontSize: 8,
            color: 'rgba(0,255,135,0.4)',
          }}>+</span>
        </div>
        <pre style={{
          margin: 0, padding: '10px 12px',
          background: 'rgba(0,255,135,0.02)',
          fontFamily: "'Azeret Mono', monospace", fontSize: 11,
          color: 'rgba(0,255,135,0.9)', lineHeight: 1.7,
          overflowX: 'auto', whiteSpace: 'pre',
        }}>
          {after || '(empty)'}
        </pre>
      </div>

      {/* Copy button */}
      <div style={{
        padding: '8px 12px',
        background: 'rgba(0,0,0,0.2)',
        borderTop: '1px solid rgba(242,242,244,0.05)',
        display: 'flex', justifyContent: 'flex-end',
      }}>
        <button
          onClick={handleCopy}
          style={{
            padding: '4px 12px', borderRadius: 3,
            background: copied ? 'rgba(0,255,135,0.1)' : 'rgba(242,242,244,0.05)',
            border: `1px solid ${copied ? 'rgba(0,255,135,0.25)' : 'rgba(242,242,244,0.08)'}`,
            cursor: 'pointer',
            fontFamily: "'Azeret Mono', monospace", fontSize: 9,
            color: copied ? '#00FF87' : 'rgba(242,242,244,0.4)',
            letterSpacing: 0.5,
            transition: 'all 0.15s',
          }}
        >
          {copied ? '✓ copied' : '⎘ copy fix'}
        </button>
      </div>
    </div>
  );
}
