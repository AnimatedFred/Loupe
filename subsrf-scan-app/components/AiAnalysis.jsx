'use client';

import { useState } from 'react';
import { useUser } from '../context/UserContext';

function IconCritique() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--neon)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.937 15.5A2 2 0 008.5 14.063l-6.135-1.582a.5.5 0 010-.962L8.5 9.936A2 2 0 009.937 8.5l1.582-6.135a.5.5 0 01.963 0L14.063 8.5A2 2 0 0115.5 9.937l6.135 1.581a.5.5 0 010 .964L15.5 14.063a2 2 0 00-1.437 1.437l-1.582 6.135a.5.5 0 01-.963 0z"/>
      <path d="M20 3v4M22 5h-4M4 17v2M5 18H3"/>
    </svg>
  );
}

function IconImprove() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--neon)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17 11 12 6 7 11"/>
      <line x1="12" y1="6" x2="12" y2="18"/>
      <line x1="8" y1="21" x2="16" y2="21"/>
    </svg>
  );
}

function IconBrand() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--neon)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="3.5" fill="var(--neon)" stroke="none"/>
    </svg>
  );
}

function IconQuery() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--neon)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="7" width="16" height="13" rx="2"/>
      <path d="M12 7V4M9 4h6"/>
      <circle cx="9" cy="13" r="1.2" fill="var(--neon)" stroke="none"/>
      <circle cx="15" cy="13" r="1.2" fill="var(--neon)" stroke="none"/>
      <path d="M9 17h6"/>
      <path d="M2 11h2M20 11h2"/>
    </svg>
  );
}

const FEATURES = [
  { id: 'critique', label: 'Design Critique', Icon: IconCritique, endpoint: '/api/scan/critique', responseKey: 'critique',    desc: 'Professional analysis of your type scale, colors, spacing, and overall system maturity.' },
  { id: 'improve',  label: 'Improvements',    Icon: IconImprove,  endpoint: '/api/scan/improve',  responseKey: 'suggestions', desc: 'Concrete replacement values for every detected problem — exact hex codes and px values.' },
  { id: 'brand',    label: 'Brand Score',      Icon: IconBrand,    endpoint: '/api/scan/brand',    responseKey: 'brandScore',  desc: 'Color harmony, type personality, radius signal, spacing density — scored 0–100.' },
];

const CREDIT_BADGE = {
  fontFamily: "'Azeret Mono', monospace", fontSize: 8,
  color: 'rgba(0,255,135,0.7)', background: 'rgba(0,255,135,0.08)',
  border: '1px solid rgba(0,255,135,0.15)', borderRadius: 3, padding: '2px 6px',
};

function AiCard({ feature, tokens, mode, accessToken, onCreditsChange }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
      const res = await fetch(feature.endpoint, {
        method: 'POST', headers,
        body: JSON.stringify({ tokens, mode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setResult(data[feature.responseKey]);
      if (typeof data.creditsRemaining === 'number') onCreditsChange(data.creditsRemaining);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ background: 'var(--layer)', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: result ? '1px solid var(--border)' : 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <feature.Icon />
            <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 14, fontWeight: 700 }}>{feature.label}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={CREDIT_BADGE}>1 credit</span>
            {result && (
              <button onClick={() => navigator.clipboard.writeText(result).catch(() => {})} style={{
                fontFamily: "'Azeret Mono', monospace", fontSize: 9, color: 'var(--neon)',
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              }}>⎘ copy</button>
            )}
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--t3)', lineHeight: 1.6, marginBottom: 12 }}>{feature.desc}</div>
        <button onClick={generate} disabled={loading || !tokens} style={{
          fontFamily: "'Azeret Mono', monospace", fontSize: 10, fontWeight: 600,
          background: result ? 'transparent' : 'var(--neon)',
          color: result ? 'var(--t2)' : 'var(--void)',
          border: result ? '1px solid var(--border)' : 'none',
          borderRadius: 4, padding: '7px 14px',
          opacity: !tokens ? 0.4 : loading ? 0.7 : 1, transition: 'opacity 0.15s',
        }}>
          {loading ? '⟳ Generating...' : result ? '↺ Regenerate' : 'Generate'}
        </button>
        {error && <div style={{ fontFamily: "'Azeret Mono', monospace", fontSize: 10, color: '#FF4D4D', marginTop: 8 }}>{error}</div>}
      </div>
      {result && (
        <div style={{
          padding: '16px 20px', fontFamily: "'Azeret Mono', monospace", fontSize: 10,
          lineHeight: 1.85, color: 'var(--t2)', whiteSpace: 'pre-wrap',
          maxHeight: 320, overflowY: 'auto', scrollbarWidth: 'thin',
        }}>{result}</div>
      )}
    </div>
  );
}

function QueryCard({ tokens, mode, accessToken, onCreditsChange }) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function ask() {
    if (!question.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
      const res = await fetch('/api/scan/query', {
        method: 'POST', headers,
        body: JSON.stringify({ tokens, question, mode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setAnswer(data.answer);
      if (typeof data.creditsRemaining === 'number') onCreditsChange(data.creditsRemaining);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ background: 'var(--layer)', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: answer ? '1px solid var(--border)' : 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconQuery />
            <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 14, fontWeight: 700 }}>Ask a Question</span>
          </div>
          <span style={CREDIT_BADGE}>1 credit</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--t3)', lineHeight: 1.6, marginBottom: 12 }}>
          Ask anything about this design system — colors, accessibility, spacing, typography.
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text" value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && ask()}
            placeholder="What color does this site use for interactive elements?"
            disabled={loading || !tokens}
            style={{
              flex: 1, background: 'var(--deep)', border: '1px solid var(--border)',
              borderRadius: 4, padding: '8px 12px',
              fontFamily: "'Azeret Mono', monospace", fontSize: 11,
              color: 'var(--t1)', outline: 'none',
            }}
          />
          <button onClick={ask} disabled={loading || !question.trim() || !tokens} style={{
            fontFamily: "'Azeret Mono', monospace", fontSize: 10, fontWeight: 600,
            background: 'var(--neon)', color: 'var(--void)',
            border: 'none', borderRadius: 4, padding: '8px 14px',
            opacity: (!tokens || !question.trim() || loading) ? 0.5 : 1,
          }}>
            {loading ? '⟳' : '→'}
          </button>
        </div>
        {error && <div style={{ fontFamily: "'Azeret Mono', monospace", fontSize: 10, color: '#FF4D4D', marginTop: 8 }}>{error}</div>}
      </div>
      {answer && (
        <div style={{ padding: '16px 20px', fontFamily: "'Azeret Mono', monospace", fontSize: 10, lineHeight: 1.85, color: 'var(--t2)', whiteSpace: 'pre-wrap' }}>
          {answer}
        </div>
      )}
    </div>
  );
}

export default function AiAnalysis({ tokens, mode, inline }) {
  const { session, updateCredits } = useUser() || {};
  const accessToken = session?.access_token;

  const geminiTag = (
    <span style={{
      fontFamily: "'Azeret Mono', monospace", fontSize: 9, letterSpacing: 1,
      color: 'var(--neon)', background: 'var(--neon-dim)', border: '1px solid rgba(0,255,135,0.2)',
      borderRadius: 3, padding: '2px 8px', textTransform: 'uppercase',
    }}>Gemini 1.5 Flash</span>
  );

  const cardGrid = (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 12 }}>
      {FEATURES.map(f => (
        <AiCard key={f.id} feature={f} tokens={tokens} mode={mode}
          accessToken={accessToken} onCreditsChange={updateCredits} />
      ))}
      <QueryCard tokens={tokens} mode={mode}
        accessToken={accessToken} onCreditsChange={updateCredits} />
    </div>
  );

  if (inline) {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>{geminiTag}</div>
        <div style={{ fontSize: 13, color: 'var(--t3)', marginBottom: 28, lineHeight: 1.6 }}>
          Each action costs 1 credit from your monthly allowance.
        </div>
        {cardGrid}
      </div>
    );
  }

  return (
    <div style={{ borderTop: '1px solid var(--border)', padding: '40px 32px', background: 'var(--deep)' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px' }}>
            AI Analysis
          </div>
          {geminiTag}
        </div>
        <div style={{ fontSize: 13, color: 'var(--t3)', marginBottom: 28, lineHeight: 1.6 }}>
          Each action costs 1 credit from your monthly allowance.
        </div>
        {cardGrid}
      </div>
    </div>
  );
}
