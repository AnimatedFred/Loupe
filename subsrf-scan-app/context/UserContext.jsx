'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = loading
  const [profile, setProfile] = useState(null);

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('tier, credits')
      .eq('id', userId)
      .single();
    setProfile(data || { tier: 'free', credits: 0 });
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s ?? null);
      if (s?.user) fetchProfile(s.user.id);
    });

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
    await supabase.auth.signOut();
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
