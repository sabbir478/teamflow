import { useState } from 'react'
import { supabase } from '../lib/supabase'

const C = {
  bg: '#0F0F13', surface: '#16161C', card: '#1C1C24',
  border: '#2A2A36', accent: '#7C5CFC', text: '#F0EEF8',
  muted: '#8B8AA0', error: '#FF6B6B', green: '#4DFFB4',
}

export default function AuthPage() {
  const [mode, setMode] = useState('login') // login | signup
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async () => {
    setError(''); setSuccess(''); setLoading(true)
    try {
      if (mode === 'signup') {
        if (!name.trim()) { setError('Name is required'); setLoading(false); return }
        const { error: e } = await supabase.auth.signUp({
          email, password,
          options: { data: { name: name.trim() } }
        })
        if (e) setError(e.message)
        else setSuccess('Account created! You can now log in.')
      } else {
        const { error: e } = await supabase.auth.signInWithPassword({ email, password })
        if (e) setError(e.message)
      }
    } catch (e) {
      setError('Something went wrong. Please try again.')
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: "'Outfit', sans-serif" }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: C.accent, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, marginBottom: 14 }}>⚡</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: C.text, letterSpacing: '-0.5px' }}>TeamFlow</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4, fontFamily: "'DM Mono', monospace" }}>VISUAL TEAM MANAGER</div>
        </div>

        {/* Card */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 32 }}>
          {/* Tab switch */}
          <div style={{ display: 'flex', background: C.card, borderRadius: 12, padding: 4, marginBottom: 24 }}>
            {['login', 'signup'].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); setSuccess('') }}
                style={{ flex: 1, padding: '9px 0', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontFamily: "'Outfit', sans-serif", fontWeight: 500, transition: 'all 0.18s',
                  background: mode === m ? C.accent : 'transparent',
                  color: mode === m ? '#fff' : C.muted }}>
                {m === 'login' ? 'Log In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {mode === 'signup' && (
              <div>
                <label style={labelStyle}>YOUR NAME</label>
                <input style={inputStyle} placeholder="e.g. Sabbir Ahmed" value={name} onChange={e => setName(e.target.value)} />
              </div>
            )}
            <div>
              <label style={labelStyle}>EMAIL</label>
              <input style={inputStyle} type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>PASSWORD</label>
              <input style={inputStyle} type="password" placeholder="Min 6 characters" value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
            </div>

            {error && <div style={{ fontSize: 13, color: C.error, background: C.error + '15', border: `1px solid ${C.error}33`, borderRadius: 10, padding: '10px 14px' }}>{error}</div>}
            {success && <div style={{ fontSize: 13, color: C.green, background: C.green + '15', border: `1px solid ${C.green}33`, borderRadius: 10, padding: '10px 14px' }}>{success}</div>}

            <button onClick={handleSubmit} disabled={loading}
              style={{ background: C.accent, color: '#fff', border: 'none', borderRadius: 12, padding: '13px', fontSize: 15, fontFamily: "'Outfit', sans-serif", fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: 4, transition: 'all 0.18s' }}>
              {loading ? 'Please wait…' : mode === 'login' ? 'Log In →' : 'Create Account →'}
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: C.muted }}>
          Share the app link with your team — they sign up and join instantly.
        </div>
      </div>
    </div>
  )
}

const labelStyle = { fontSize: 10, color: '#8B8AA0', fontFamily: "'DM Mono', monospace", letterSpacing: '0.07em', display: 'block', marginBottom: 6 }
const inputStyle = { width: '100%', background: '#0F0F13', border: '1px solid #2A2A36', color: '#F0EEF8', borderRadius: 10, padding: '11px 14px', fontSize: 14, fontFamily: "'Outfit', sans-serif", outline: 'none', boxSizing: 'border-box' }
