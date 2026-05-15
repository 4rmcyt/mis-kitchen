import { useState } from 'react'
import { updateProfile } from './lib/supabase.js'

const STATIONS = ['Common', 'Grill', 'Sauté', 'Cold', 'Garde', 'Pastry', 'Prep']
const STATION_COLORS = {
  Grill: '#EF4444', Sauté: '#F97316', Cold: '#22D3EE',
  Garde: '#10B981', Pastry: '#A78BFA', Prep: '#FBBF24', Common: '#6B7280',
}

const STEPS = ['welcome', 'name', 'station', 'done']

export default function Onboarding({ user, onDone }) {
  const meta = user.user_metadata || {}
  const [step, setStep] = useState('welcome')
  const [name, setName] = useState(meta.full_name || meta.name || '')
  const [station, setStation] = useState(meta.station || 'Common')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function finish() {
    if (!name.trim()) { setError('Введи имя'); return }
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

  return (
    <div style={s.root}>
      <style>{CSS}</style>
      <div style={s.card}>
        <div style={s.logo}>mis<span style={{ color: '#F97316' }}>.</span></div>

        {step === 'welcome' && (
          <>
            <div style={s.title}>Добро пожаловать на кухню</div>
            <div style={s.sub}>Давай быстро настроим твой профиль — займёт 30 секунд.</div>
            <button style={s.btn} onClick={() => setStep('name')}>Начать →</button>
          </>
        )}

        {step === 'name' && (
          <>
            <div style={s.title}>Как тебя зовут?</div>
            <div style={s.sub}>Имя будет видно остальным в лайнапе.</div>
            <input
              style={s.input}
              placeholder="Имя"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && name.trim() && setStep('station')}
              autoFocus
            />
            {error && <div style={s.error}>{error}</div>}
            <button style={s.btn} onClick={() => name.trim() ? setStep('station') : setError('Введи имя')}>
              Далее →
            </button>
          </>
        )}

        {step === 'station' && (
          <>
            <div style={s.title}>Твоя станция?</div>
            <div style={s.sub}>Выбери где работаешь — можно изменить позже.</div>
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
                Не назначена
              </button>
            </div>
            {error && <div style={s.error}>{error}</div>}
            <button style={saving ? { ...s.btn, opacity: 0.5 } : s.btn} onClick={finish} disabled={saving}>
              {saving ? 'Сохраняем…' : 'Готово →'}
            </button>
          </>
        )}

        <div style={s.dots}>
          {STEPS.slice(0, 3).map((st, i) => (
            <div key={st} style={{ ...s.dot, ...(STEPS.indexOf(step) >= i ? s.dotActive : {}) }} />
          ))}
        </div>
      </div>
    </div>
  )
}

const s = {
  root: { minHeight: '100vh', background: '#0C0C0C', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: "'DM Mono', monospace" },
  card: { width: '100%', maxWidth: 380, background: '#141414', border: '1px solid #252525', borderRadius: 16, padding: 32, display: 'flex', flexDirection: 'column', gap: 16 },
  logo: { fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 800, letterSpacing: -1 },
  title: { fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 700, lineHeight: 1.2, color: '#E8E8E0' },
  sub: { fontSize: 13, color: '#666', lineHeight: 1.6 },
  input: { background: '#1C1C1C', border: '1px solid #252525', borderRadius: 10, padding: '12px 14px', color: '#E8E8E0', fontFamily: "'DM Mono', monospace", fontSize: 14, outline: 'none', width: '100%' },
  btn: { background: '#F97316', color: '#fff', border: 'none', borderRadius: 10, padding: '14px 20px', fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 4 },
  stationGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  stationBtn: { background: 'transparent', border: '1px solid #252525', borderRadius: 10, padding: '12px 8px', color: '#888', fontFamily: "'DM Mono', monospace", fontSize: 13, cursor: 'pointer', transition: 'all 0.15s' },
  dots: { display: 'flex', gap: 6, justifyContent: 'center', marginTop: 8 },
  dot: { width: 6, height: 6, borderRadius: '50%', background: '#252525' },
  dotActive: { background: '#F97316' },
  error: { color: '#EF4444', fontSize: 12 },
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@600;700;800&display=swap');
  input:focus { border-color: #F97316 !important; }
`
