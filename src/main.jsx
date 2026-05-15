import { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { getSession, onAuthChange, supabase } from './lib/supabase.js'
import App from './App.jsx'
import Admin from './Admin.jsx'
import Login from './Login.jsx'
import Onboarding from './Onboarding.jsx'

function Root() {
  const [session, setSession] = useState(undefined)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)

  useEffect(() => {
    getSession().then(s => {
      setSession(s)
      if (s) checkOnboarding(s.user)
    })

    const { data: { subscription } } = onAuthChange(s => {
      setSession(s)
      if (s) checkOnboarding(s.user)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function checkOnboarding(user) {
    if (!user) return
    const { data: profiles } = await supabase
      .from('profiles')
      .select('name, role')
      .eq('id', user.id)
      .limit(1)
    const profile = profiles?.[0]
    const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin'
    setNeedsOnboarding(!isAdmin && !profile?.name)
  }

  if (session === undefined) return null

  if (!session) return <Login onLogin={() => getSession().then(setSession)} />

  if (needsOnboarding) return (
    <Onboarding
      user={session.user}
      onDone={() => setNeedsOnboarding(false)}
    />
  )

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin/*" element={<Admin />} />
        <Route path="/*" element={<App />} />
      </Routes>
    </BrowserRouter>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(<Root />)
