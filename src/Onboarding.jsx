import { useState, useEffect } from 'react'
import { updateProfile, supabase } from './lib/supabase.js'

const STATIONS = ['Common', 'Cold', 'Rolls', 'Hot', 'Grill', 'Tandoor']
const STATION_COLORS = {
  Cold: '#22D3EE', Rolls: '#A78BFA', Hot: '#F97316',
  Grill: '#EF4444', Tandoor: '#F59E0B', Common: '#6B7280',
}

export default function Onboarding({ user, onDone }) {
  const meta = user.user_metadata || {}
  const [step, setStep] = useState(null)
  const [showPasswordStep, setShowPasswordStep] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [name, setName] = useState(meta.full_name || meta.name || '')
  const [station, setStation] = useState(meta.station || 'Common')
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

  const allSteps = showPasswordStep
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
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function finish() {
    if (!name.trim()) { setError('Enter your name'); return }
    setSaving(true)
    setError('')
    try {
      await updateProfile(user.id, { name: name.trim(), station })
      onDone()
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  const dotIndex = visibleDotSteps.indexOf(step)

  if (step === null) return null

  return (
    <div style={s.root}>
      <style>{CSS}</style>
      <div style={s.card}>
        <div style={s.logo}>mis<span style={{ color: '#F97316' }}>.</span></div>

        {step === 'password' && (
          <>
            <div style={s.title}>Create your password</div>
            <div style={s.sub}>You will use this to log in next time.</div>
            <input
              style={s.input}
              type="password"
              placeholder="Password (min 8 characters)"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoFocus
            />
            <input
              style={s.input}
              type="password"
              placeholder="Confirm password"
              value={passwordConfirm}
              onChange={e => setPasswordConfirm(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && setUserPassword()}
            />
            {error && <div style={s.error}>{error}</div>}
            <button style={saving ? { ...s.btn, opacity: 0.5 } : s.btn} onClick={setUserPassword} disabled={saving}>
              {saving ? 'Saving…' : 'Set password →'}
            </button>
          </>
        )}

        {step === 'welcome' && (
          <>
            <div style={s.title}>Welcome to the kitchen</div>
            <div style={s.sub}>{"Let's set up your profile — takes 30 seconds."}</div>
            <button style={s.btn} onClick={() => setStep('name')}>Get started →</button>
          </>
        )}

        {step === 'name' && (
          <>
            <div style={s.title}>{"What's your name?"}</div>
            <div style={s.sub}>This is what the crew sees in the lineup.</div>
            <input
              style={s.input}
              placeholder="Your name"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && name.trim() && setStep('station')}
              autoFocus
            />
            {error && <div style={s.error}>{error}</div>}
            <button style={s.btn} onClick={() => name.trim() ? setStep('station') : setError('Enter your name')}>
              Next →
            </button>
          </>
        )}

        {step === 'station' && (
          <>
            <div style={s.title}>Your station?</div>
            <div style={s.sub}>Pick where you work — you can change this later.</div>
            <div style={s.stationGrid}>
              {STATIONS.filter(st => st !== 'Common').map(st => (
                <button
                  key={st}
                  style={{
                    ...s.stationBtn,
                    ...(station === st ? { background: STATION_COLORS[st], color: '#000', borderColor: STATION_COLORS[st] } : {}),
                  }}
                  onClick={() => setStation(st)}
                >
                  {st}
                </button>
              ))}
              <button
                style={{
                  ...s.stationBtn,
                  ...(station === 'Common' ? { background: '#6B7280', color: '#fff', borderColor: '#6B7280' } : {}),
                }}
                onClick={() => setStation('Common')}
              >
                Unassigned
              </button>
            </div>
            {error && <div style={s.error}>{error}</div>}
            <button style={saving ? { ...s.btn, opacity: 0.5 } : s.btn} onClick={finish} disabled={saving}>
              {saving ? 'Saving…' : 'Done →'}
            </button>
          </>
        )}

        {step !== 'welcome' && (
          <div style={s.dots}>
            {visibleDotSteps.map((st, i) => (
              <div key={st} style={{ ...s.dot, ...(dotIndex >= i ? s.dotActive : {}) }} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const s = {
  root: { minHeight: '100vh', background: '#111111', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: "'DM Mono', monospace" },
  card: { width: '100%', maxWidth: 380, background: '#1A1A1A', border: '1px solid #333333', borderRadius: 16, padding: 32, display: 'flex', flexDirection: 'column', gap: 16 },
  logo: { fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 800, letterSpacing: -1 },
  title: { fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 700, lineHeight: 1.2, color: '#F0F0E8' },
  sub: { fontSize: 13, color: '#888', lineHeight: 1.6 },
  input: { background: '#222222', border: '1px solid #333333', borderRadius: 10, padding: '12px 14px', color: '#F0F0E8', fontFamily: "'DM Mono', monospace", fontSize: 14, outline: 'none', width: '100%' },
  btn: { background: '#F97316', color: '#fff', border: 'none', borderRadius: 10, padding: '14px 20px', fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 4 },
  stationGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  stationBtn: { background: 'transparent', border: '1px solid #333333', borderRadius: 10, padding: '12px 8px', color: '#999', fontFamily: "'DM Mono', monospace", fontSize: 13, cursor: 'pointer', transition: 'all 0.15s' },
  dots: { display: 'flex', gap: 6, justifyContent: 'center', marginTop: 8 },
  dot: { width: 6, height: 6, borderRadius: '50%', background: '#333333' },
  dotActive: { background: '#F97316' },
  error: { color: '#EF4444', fontSize: 12 },
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@600;700;800&display=swap');
  input:focus { border-color: #F97316 !important; }
`
