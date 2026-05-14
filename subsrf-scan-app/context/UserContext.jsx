'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = still loading
  const [profile, setProfile] = useState(null);

  async function fetchProfile(userId) {
    if (!supabase) return;
    const { data } = await supabase
      .from('profiles')
      .select('tier, credits')
      .eq('id', userId)
      .single();
    setProfile(data || { tier: 'free', credits: 0 });
  }

  useEffect(() => {
    if (!supabase) {
      // No Supabase configured — skip auth, set session to null
      setSession(null);
      return;
    }

    async function init() {
      // SSO: Figma plugin passes token + refresh in the URL — establish session first
      const params = new URLSearchParams(window.location.search);
      const tokenParam   = params.get('token');
      const refreshParam = params.get('refresh');

      if (tokenParam) {
        await supabase.auth.setSession({
          access_token:  tokenParam,
          refresh_token: refreshParam || '',
        });
        // Clean the SSO params from the URL
        const clean = new URL(window.location.href);
        clean.searchParams.delete('token');
        clean.searchParams.delete('refresh');
        window.history.replaceState({}, '', clean.toString());
      }

      const { data: { session: s } } = await supabase.auth.getSession();
      setSession(s ?? null);
      if (s?.user) fetchProfile(s.user.id);
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s ?? null);
      if (s?.user) fetchProfile(s.user.id);
      else setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  function updateCredits(newBalance) {
    setProfile(p => p ? { ...p, credits: newBalance } : p);
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
  }

  const loading = session === undefined;

  return (
    <UserContext.Provider value={{
      user: session?.user ?? null,
      session: session ?? null,
      tier: profile?.tier || 'free',
      credits: profile?.credits ?? 0,
      loading,
      signOut,
      updateCredits,
      refreshProfile: () => session?.user && fetchProfile(session.user.id),
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
