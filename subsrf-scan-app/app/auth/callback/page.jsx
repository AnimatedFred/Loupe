'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code');
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(() => {
        router.replace('/');
      });
    } else {
      router.replace('/');
    }
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
