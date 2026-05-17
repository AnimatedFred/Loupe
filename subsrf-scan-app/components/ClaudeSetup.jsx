'use client';

import { useState } from 'react';

const MCP_URL = 'https://api.subsrf.dev/mcp';

const STEPS = [
  { n: '01', label: 'Open Claude Settings', detail: 'claude.ai → Settings → Connectors' },
  { n: '02', label: 'Add a new connector', detail: 'Click "Add connector" or the + button' },
  { n: '03', label: 'Paste the URL below', detail: 'Set the name to "Subsrf Intelligence"' },
  { n: '04', label: 'Save and start chatting', detail: 'Ask Claude to analyze your captured UI' },
];

export default function ClaudeSetup({ compact = false }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(MCP_URL).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (compact) {
    return (
      <div style={{
        background: '#0C0C12', border: '1px solid rgba(242,242,244,0.08)',
        borderRadius: 2, overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '10px 12px', borderBottom: '1px solid rgba(242,242,244,0.08)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
            <path d="M13 10V3L4 14h7v7l9-11h-7z" stroke="#00FF87" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{
            fontFamily: "'Azeret Mono', monospace", fontSize: 9,
            letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(242,242,244,0.4)',
          }}>Claude MCP</span>
          <span style={{
            marginLeft: 'auto', fontFamily: "'Azeret Mono', monospace", fontSize: 8,
            letterSpacing: 1, textTransform: 'uppercase', color: '#00FF87',
            background: 'rgba(0,255,135,0.1)', border: '1px solid rgba(0,255,135,0.2)',
            borderRadius: 2, padding: '1px 5px',
          }}>Setup</span>
        </div>

        <div style={{ padding: '10px 12px' }}>
          <p style={{
            fontFamily: "'Azeret Mono', monospace", fontSize: 9,
            color: 'rgba(242,242,244,0.35)', lineHeight: 1.7, marginBottom: 10,
          }}>
            Add this URL as a connector in Claude to use Subsrf Intelligence.
          </p>

          {/* URL copy row */}
          <div style={{
            display: 'flex', alignItems: 'center',
            background: '#050508', border: '1px solid rgba(242,242,244,0.1)',
            borderRadius: 2, overflow: 'hidden',
          }}>
            <span style={{
              flex: 1, padding: '7px 10px',
              fontFamily: "'Azeret Mono', monospace", fontSize: 9,
              color: 'rgba(242,242,244,0.45)', wordBreak: 'break-all', lineHeight: 1.5,
            }}>{MCP_URL}</span>
            <button
              onClick={copy}
              style={{
                flexShrink: 0, padding: '7px 10px',
                background: copied ? 'rgba(0,255,135,0.15)' : 'rgba(242,242,244,0.06)',
                border: 'none', borderLeft: '1px solid rgba(242,242,244,0.1)',
                cursor: 'pointer', transition: 'background 0.15s',
                fontFamily: "'Azeret Mono', monospace", fontSize: 9,
                letterSpacing: 0.5, textTransform: 'uppercase',
                color: copied ? '#00FF87' : 'rgba(242,242,244,0.35)',
              }}
            >
              {copied ? '✓' : 'Copy'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      marginTop: 48, width: '100%', maxWidth: 540,
      background: '#0C0C12', border: '1px solid rgba(242,242,244,0.08)',
      borderRadius: 2, overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px', borderBottom: '1px solid rgba(242,242,244,0.08)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
          <path d="M13 10V3L4 14h7v7l9-11h-7z" stroke="#00FF87" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span style={{
          fontFamily: "'Azeret Mono', monospace", fontSize: 10,
          letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(242,242,244,0.55)',
        }}>Connect to Claude</span>
        <span style={{
          marginLeft: 'auto', fontFamily: "'Azeret Mono', monospace", fontSize: 9,
          letterSpacing: 1.5, textTransform: 'uppercase', color: '#00FF87',
          background: 'rgba(0,255,135,0.1)', border: '1px solid rgba(0,255,135,0.2)',
          borderRadius: 2, padding: '2px 6px',
        }}>MCP</span>
      </div>

      {/* Steps */}
      <div style={{ padding: '20px' }}>
        {STEPS.map(({ n, label, detail }) => (
          <div key={n} style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'flex-start' }}>
            <span style={{
              fontFamily: "'Azeret Mono', monospace", fontSize: 10,
              color: 'rgba(0,255,135,0.5)', letterSpacing: 1, flexShrink: 0, paddingTop: 1,
            }}>{n}</span>
            <div>
              <div style={{
                fontFamily: "'Manrope', sans-serif", fontSize: 13, fontWeight: 500,
                color: '#F2F2F4', marginBottom: 2,
              }}>{label}</div>
              <div style={{
                fontFamily: "'Azeret Mono', monospace", fontSize: 10,
                color: 'rgba(242,242,244,0.35)', letterSpacing: 0.3,
              }}>{detail}</div>
            </div>
          </div>
        ))}

        {/* URL copy row */}
        <div style={{
          marginTop: 20, display: 'flex', alignItems: 'center',
          background: '#050508', border: '1px solid rgba(242,242,244,0.1)',
          borderRadius: 2, overflow: 'hidden',
        }}>
          <span style={{
            flex: 1, padding: '10px 14px',
            fontFamily: "'Azeret Mono', monospace", fontSize: 11,
            color: 'rgba(242,242,244,0.55)', wordBreak: 'break-all',
          }}>{MCP_URL}</span>
          <button
            onClick={copy}
            style={{
              flexShrink: 0, padding: '10px 16px',
              background: copied ? 'rgba(0,255,135,0.15)' : 'rgba(242,242,244,0.06)',
              border: 'none', borderLeft: '1px solid rgba(242,242,244,0.1)',
              cursor: 'pointer', transition: 'background 0.15s',
              fontFamily: "'Azeret Mono', monospace", fontSize: 10,
              letterSpacing: 1, textTransform: 'uppercase',
              color: copied ? '#00FF87' : 'rgba(242,242,244,0.4)',
            }}
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  );
}
