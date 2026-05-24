'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    
    if (code) {
      params.delete('code');
    }
    const queryString = params.toString();
    const targetUrl = queryString ? `/?${queryString}` : '/';

    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(() => {
        router.replace(targetUrl);
      }).catch((err) => {
        console.error('Session exchange error:', err);
        router.replace(targetUrl);
      });
    } else {
      router.replace(targetUrl);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: '#050508',
    }}>
      <span style={{
        fontFamily: "'Azeret Mono', monospace", fontSize: 11,
        color: 'rgba(242,242,244,0.28)', letterSpacing: 2,
      }}>
        SIGNING IN…
      </span>
    </div>
  );
}
