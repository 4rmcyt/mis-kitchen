import { useState, useEffect } from 'react'
import { updateProfile, supabase } from './lib/supabase.js'
import './Auth.css'
import type { User } from '@supabase/supabase-js'
import type { Station } from './lib/types.js'
import { STATIONS, STATION_COLORS } from './lib/constants.js'

type OnboardingStep = 'password' | 'welcome' | 'name' | 'station' | null;

export default function Onboarding({ user, onDone }: { user: User; onDone: () => void }) {
  const meta = user.user_metadata || {}
  const [step, setStep] = useState<OnboardingStep>(null)
  const [showPasswordStep, setShowPasswordStep] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [name, setName] = useState<string>(meta.full_name || meta.name || '')
  const [station, setStation] = useState<string>(meta.station || 'Common')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('profiles').select('password_set').eq('id', user.id).single();
      const needsPassword = !data?.password_set;
      setShowPasswordStep(needsPassword);
      setStep(needsPassword ? 'password' : 'welcome');
    })();
  }, [user.id])

  const allSteps: OnboardingStep[] = showPasswordStep
    ? ['password', 'welcome', 'name', 'station']
    : ['welcome', 'name', 'station']
  const visibleDotSteps = allSteps.filter(s => s !== 'welcome')

  async function setUserPassword() {
    setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== passwordConfirm) { setError('Passwords do not match'); return }
    setSaving(true)
    try {
      const { error: err } = await supabase.auth.updateUser({ password })
      if (err) throw err
      await updateProfile(user.id, { password_set: true })
      setStep('welcome')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function finish() {
    if (!name.trim()) { setError('Enter your name'); return }
    setSaving(true)
    setError('')
    try {
      await updateProfile(user.id, { name: name.trim(), station: station as Station })
      onDone()
    } catch (e) {
      setError((e as Error).message)
      setSaving(false)
    }
  }

  const dotIndex = visibleDotSteps.indexOf(step as 'password' | 'name' | 'station')

  if (step === null) return null

  return (
    <div className="auth-page">
      <div className="auth-card auth-card--dark">
        <div className="auth-logo auth-logo--lg">mis<span className="auth-logo-dot">.</span></div>

        {step === 'password' && (
          <>
            <div className="auth-title">Create your password</div>
            <div className="auth-sub">You will use this to log in next time.</div>
            <input className="auth-input--dark" type="password" placeholder="Password (min 8 characters)" value={password} onChange={e => setPassword(e.target.value)} autoFocus/>
            <input className="auth-input--dark" type="password" placeholder="Confirm password" value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} onKeyDown={e => e.key === 'Enter' && setUserPassword()}/>
            {error && <div className="auth-error">{error}</div>}
            <button className="auth-btn auth-btn--lg" onClick={setUserPassword} disabled={saving}>
              {saving ? 'Saving…' : 'Set password →'}
            </button>
          </>
        )}

        {step === 'welcome' && (
          <>
            <div className="auth-title">Welcome to the kitchen</div>
            <div className="auth-sub">{"Let's set up your profile — takes 30 seconds."}</div>
            <button className="auth-btn auth-btn--lg" onClick={() => setStep('name')}>Get started →</button>
          </>
        )}

        {step === 'name' && (
          <>
            <div className="auth-title">{"What's your name?"}</div>
            <div className="auth-sub">This is what the crew sees in the lineup.</div>
            <input className="auth-input--dark" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && name.trim() && setStep('station')} autoFocus/>
            {error && <div className="auth-error">{error}</div>}
            <button className="auth-btn auth-btn--lg" onClick={() => name.trim() ? setStep('station') : setError('Enter your name')}>
              Next →
            </button>
          </>
        )}

        {step === 'station' && (
          <>
            <div className="auth-title">Your station?</div>
            <div className="auth-sub">Pick where you work — you can change this later.</div>
            <div className="auth-station-grid">
              {STATIONS.filter(st => st !== 'Common').map(st => (
                <button key={st} className="auth-station-btn" onClick={() => setStation(st)}
                  style={station === st ? { background: STATION_COLORS[st], color: '#000', borderColor: STATION_COLORS[st] } : {}}>
                  {st}
                </button>
              ))}
              <button className="auth-station-btn" onClick={() => setStation('Common')}
                style={station === 'Common' ? { background: '#6B7280', color: '#fff', borderColor: '#6B7280' } : {}}>
                Unassigned
              </button>
            </div>
            {error && <div className="auth-error">{error}</div>}
            <button className="auth-btn auth-btn--lg" onClick={finish} disabled={saving}>
              {saving ? 'Saving…' : 'Done →'}
            </button>
          </>
        )}

        {step !== 'welcome' && (
          <div className="auth-dots">
            {visibleDotSteps.map((st, i) => (
              <div key={st} className={`auth-dot${dotIndex >= i ? ' auth-dot--active' : ''}`}/>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
