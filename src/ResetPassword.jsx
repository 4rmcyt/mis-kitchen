import { useState } from 'react'
import { supabase } from './lib/supabase.js'

export default function ResetPassword({ onDone }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    setSaving(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    setSaving(false)
    if (err) { setError(err.message); return }
    onDone()
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Mono', monospace", padding: 20 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@700;800&display=swap'); *{box-sizing:border-box;margin:0;padding:0} input{font-size:16px!important}`}</style>
      <div style={{ background: '#111', border: '1px solid #222', borderRadius: 12, padding: '32px 28px', width: '100%', maxWidth: 360 }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800, marginBottom: 4, letterSpacing: -1 }}>
          mis<span style={{ color: '#F97316' }}>.</span>
        </div>
        <div style={{ fontSize: 12, color: '#4A4A4A', marginBottom: 28, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Set new password
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, color: '#4A4A4A', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>New password</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              required autoFocus placeholder="Min 8 characters"
              style={{ width: '100%', background: '#181818', border: '1px solid #222', color: '#E8E8E0', padding: '10px 12px', borderRadius: 8, outline: 'none' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#4A4A4A', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>Confirm password</label>
            <input
              type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
              required placeholder="••••••••"
              style={{ width: '100%', background: '#181818', border: '1px solid #222', color: '#E8E8E0', padding: '10px 12px', borderRadius: 8, outline: 'none' }}
            />
          </div>
          {error && <div style={{ fontSize: 12, color: '#EF4444', background: '#1a0808', border: '1px solid #EF444433', borderRadius: 6, padding: '8px 12px' }}>{error}</div>}
          <button type="submit" disabled={saving} style={{ background: '#F97316', color: '#fff', border: 'none', padding: '11px 16px', borderRadius: 8, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, marginTop: 4 }}>
            {saving ? 'Saving…' : 'Set password'}
          </button>
        </form>
      </div>
    </div>
  )
}
