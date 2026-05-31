import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div style={{ height: '100vh', background: '#0F0F13', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Outfit', sans-serif", color: '#8B8AA0', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 36 }}>⚡</div>
      <div>Loading…</div>
    </div>
  )

  return session ? <Dashboard session={session} /> : <AuthPage />
}
