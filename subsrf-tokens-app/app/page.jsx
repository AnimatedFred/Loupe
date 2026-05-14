'use client';

import { useState, useRef } from 'react';
import Nav from '../components/Nav';
import Hero from '../components/Hero';
import TokenExplorer from '../components/TokenExplorer';

export default function Home() {
  const [tokens, setTokens] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sourceUrl, setSourceUrl] = useState('');
  const explorerRef = useRef(null);

  async function handleExtract(url) {
    setLoading(true);
    setError(null);
    setSourceUrl(url);

    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, mode: 'both' }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Extraction failed');

      setTokens(data.tokens);
      setTimeout(() => {
        explorerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Nav />
      <Hero onExtract={handleExtract} loading={loading} error={error} extractedUrl={sourceUrl} tokens={tokens} />
      {tokens && (
        <div ref={explorerRef}>
          <TokenExplorer tokens={tokens} sourceUrl={sourceUrl} />
        </div>
      )}
    </>
  );
}
