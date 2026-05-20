'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  async function handleGoogleLogin() {
    setGoogleLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          skipBrowserRedirect: false,
        },
      })
      if (error) throw error
      // Explicitly navigate — Next.js App Router can suppress the auto-redirect
      if (data?.url) window.location.href = data.url
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed')
      setGoogleLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setLoading(true)

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push('/projects')
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setInfo('Check your email to confirm your account, then log in.')
        setMode('login')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-void flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-8 h-8 bg-neon rounded-[6px] flex items-center justify-center">
            <span className="text-void font-mono font-black text-[12px]">S</span>
          </div>
          <span className="font-mono text-[11px] uppercase tracking-[3px] text-white/40">Subsrf</span>
        </div>

        <h1 className="font-mono text-[22px] font-semibold text-white/90 mb-1">
          {mode === 'login' ? 'Welcome back' : 'Create account'}
        </h1>
        <p className="font-mono text-[12px] text-white/30 mb-8">
          {mode === 'login' ? 'Sign in to your workspace' : 'Start designing and building'}
        </p>

        {/* Google button */}
        <button
          onClick={handleGoogleLogin}
          disabled={googleLoading || loading}
          className="w-full h-10 rounded-lg border border-white/[0.10] bg-white/[0.03] hover:bg-white/[0.06] transition-all flex items-center justify-center gap-3 mb-4 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {googleLoading ? (
            <span className="font-mono text-[11px] text-white/40">Redirecting…</span>
          ) : (
            <>
              <GoogleIcon />
              <span className="font-mono text-[11px] text-white/60">Continue with Google</span>
            </>
          )}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-white/[0.06]" />
          <span className="font-mono text-[9px] uppercase tracking-[1.5px] text-white/20">or</span>
          <div className="flex-1 h-px bg-white/[0.06]" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block font-mono text-[9px] uppercase tracking-[1.5px] text-white/30 mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
              className="w-full bg-deep border border-white/[0.08] rounded-lg px-3 py-2.5 font-mono text-[13px] text-white/80 placeholder:text-white/20 focus:outline-none focus:border-neon/30 transition-colors"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block font-mono text-[9px] uppercase tracking-[1.5px] text-white/30 mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-deep border border-white/[0.08] rounded-lg px-3 py-2.5 font-mono text-[13px] text-white/80 placeholder:text-white/20 focus:outline-none focus:border-neon/30 transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="font-mono text-[11px] text-err/80 bg-err/[0.06] border border-err/10 rounded px-3 py-2">
              {error}
            </p>
          )}
          {info && (
            <p className="font-mono text-[11px] text-ok/80 bg-ok/[0.06] border border-ok/10 rounded px-3 py-2">
              {info}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full h-10 rounded-lg font-mono text-[10px] uppercase tracking-[1.5px] bg-neon text-void font-bold hover:bg-neon/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed mt-2"
          >
            {loading ? '…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => { setMode(m => m === 'login' ? 'signup' : 'login'); setError(null); setInfo(null) }}
            className="font-mono text-[11px] text-white/30 hover:text-white/60 transition-colors"
          >
            {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}
