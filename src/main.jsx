import { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { getSession, onAuthChange } from './lib/supabase.js'
import App from './App.jsx'
import Admin from './Admin.jsx'
import Login from './Login.jsx'

function Root() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    getSession().then(setSession)
    const { data: { subscription } } = onAuthChange(setSession)
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) return null

  if (!session) return <Login onLogin={() => getSession().then(setSession)} />

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
