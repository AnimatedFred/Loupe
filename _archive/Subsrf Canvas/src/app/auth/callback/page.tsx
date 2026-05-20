'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code')
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) console.error('OAuth exchange failed:', error.message)
        router.push('/projects')
      })
    } else {
      router.push('/login')
    }
  }, [router])

  return (
    <div className="min-h-screen bg-void flex items-center justify-center">
      <span className="font-mono text-[11px] text-white/20 animate-pulse">Signing in…</span>
    </div>
  )
}
