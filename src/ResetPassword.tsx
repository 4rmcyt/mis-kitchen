import { useState, type FormEvent } from 'react'
import { supabase } from './lib/supabase.js'
import './Auth.css'

export default function ResetPassword({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
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
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">mis<span className="auth-logo-dot">.</span></div>
        <div className="auth-tagline">Set new password</div>
        <form onSubmit={handleSubmit} className="auth-form">
          <div>
            <label className="auth-label">New password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoFocus placeholder="Min 8 characters" className="auth-input"/>
          </div>
          <div>
            <label className="auth-label">Confirm password</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required placeholder="••••••••" className="auth-input"/>
          </div>
          {error && <div className="auth-error">{error}</div>}
          <button type="submit" disabled={saving} className="auth-btn">
            {saving ? 'Saving…' : 'Set password'}
          </button>
        </form>
      </div>
    </div>
  )
}
