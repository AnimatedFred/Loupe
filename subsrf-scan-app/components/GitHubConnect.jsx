'use client';

import { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';

export default function GitHubConnect({ onReposLoaded }) {
  const { session } = useUser() || {};
  const [status, setStatus] = useState(null); // { connected, installations }
  const [loading, setLoading] = useState(true);
  const [waitingForPopup, setWaitingForPopup] = useState(false);

  const checkStatus = () => {
    if (!session?.access_token) return;
    fetch('/api/github/status', {
      headers: { 'Authorization': `Bearer ${session.access_token}` },
    })
      .then(r => r.json())
      .then(data => {
        setStatus(data);
        if (data.connected) {
          setWaitingForPopup(false);
          loadRepos();
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    checkStatus();
  }, [session?.access_token]);

  useEffect(() => {
    const onFocus = () => {
      if (waitingForPopup) checkStatus();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [waitingForPopup, session?.access_token]);

  async function loadRepos() {
    if (!session?.access_token) return;
    try {
      const res = await fetch('/api/github/repos', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (data.repos) onReposLoaded?.(data.repos);
    } catch {}
  }

  function handleConnect() {
    setWaitingForPopup(true);
    window.open(`/api/github/install?userId=${session.user.id}`, 'github_install', 'width=800,height=700,left=200,top=100');
  }

  if (loading) {
    return (
      <div style={{
        fontFamily: "'Azeret Mono', monospace", fontSize: 10,
        color: 'var(--t3)', padding: '12px 0',
      }}>
        Checking GitHub…
      </div>
    );
  }

  if (status?.connected) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 0',
      }}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%', background: '#00FF87',
          boxShadow: '0 0 6px rgba(0,255,135,0.5)',
        }} />
        <span style={{
          fontFamily: "'Azeret Mono', monospace", fontSize: 10,
          color: 'var(--t2)',
        }}>
          {status.installations?.[0]?.account_login || 'Connected'}
        </span>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      style={{
        width: '100%', padding: '10px 12px', borderRadius: 6,
        background: 'var(--layer)', border: '1px solid var(--border)',
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
        transition: 'border-color 0.15s, background 0.15s',
        marginTop: 4,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'rgba(0,255,135,0.3)';
        e.currentTarget.style.background = 'rgba(0,255,135,0.04)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.background = 'var(--layer)';
      }}
    >
      {/* GitHub icon */}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--t2)" style={{ flexShrink: 0 }}>
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
      </svg>
      <div style={{ flex: 1, textAlign: 'left' }}>
        <div style={{
          fontFamily: "'Azeret Mono', monospace", fontSize: 11,
          color: 'var(--t1)', fontWeight: 500,
        }}>{waitingForPopup ? 'Waiting for authorization…' : 'Connect GitHub'}</div>
        <div style={{
          fontFamily: "'Azeret Mono', monospace", fontSize: 9,
          color: 'var(--t3)', marginTop: 2,
        }}>{waitingForPopup ? 'Complete setup in popup window' : 'Read-only · Audit codebase'}</div>
      </div>
      <span style={{
        fontFamily: "'Azeret Mono', monospace", fontSize: 10,
        color: 'var(--t3)',
      }}>→</span>
    </button>
  );
}
