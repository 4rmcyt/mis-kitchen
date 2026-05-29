import * as Sentry from '@sentry/react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  tracesSampleRate: 0.2,
  replaysOnErrorSampleRate: 0,
})
import { getSession } from './lib/supabase.js'
import { useAuth } from './hooks/useAuth.js'
import App from './App.js'
import Admin from './Admin.js'
import Login from './Login.js'
import Onboarding from './Onboarding.js'
import ResetPassword from './ResetPassword.js'
import JoinPage from './JoinPage.js'
import type { Session, User } from '@supabase/supabase-js'
import type { Role, Station } from './lib/types.js'

function Root() {
  const {
    session,
    userRole,
    userStation,
    needsOnboarding,
    needsPasswordReset,
    setNeedsOnboarding,
    setNeedsPasswordReset,
    checkOnboarding,
    setSession,
  } = useAuth()

  if (session === undefined) return null

  return (
    <BrowserRouter>
      <RootRoutes
        session={session}
        userRole={userRole}
        userStation={userStation}
        needsPasswordReset={needsPasswordReset}
        setNeedsPasswordReset={setNeedsPasswordReset}
        needsOnboarding={needsOnboarding}
        setNeedsOnboarding={setNeedsOnboarding}
        checkOnboarding={checkOnboarding}
        getSession={getSession}
        setSession={setSession}
      />
    </BrowserRouter>
  )
}

interface RootRoutesProps {
  session: Session | null;
  userRole: Role | null;
  userStation: Station | string;
  needsPasswordReset: boolean;
  setNeedsPasswordReset: (v: boolean) => void;
  needsOnboarding: boolean;
  setNeedsOnboarding: (v: boolean) => void;
  checkOnboarding: (user: User) => void;
  getSession: () => Promise<Session | null>;
  setSession: (s: Session | null) => void;
}

function RootRoutes({ session, userRole, userStation, needsPasswordReset, setNeedsPasswordReset, needsOnboarding, setNeedsOnboarding, checkOnboarding, setSession }: RootRoutesProps) {
  return (
    <Routes>
      <Route path="/join/:token" element={<JoinPage />} />
      <Route path="*" element={
        needsPasswordReset ? (
          <ResetPassword onDone={async () => {
            setNeedsPasswordReset(false)
            const s = await getSession()
            setSession(s)
            if (s) checkOnboarding(s.user)
          }} />
        ) : !session ? (
          <Login onLogin={async () => setSession(await getSession())} />
        ) : needsOnboarding ? (
          <Onboarding
            user={session.user}
            onDone={() => { setNeedsOnboarding(false); checkOnboarding(session.user) }}
          />
        ) : (
          <Routes>
            <Route path="/admin/*" element={<Admin />} />
            <Route path="/*" element={<App userRole={userRole} userStation={userStation} />} />
          </Routes>
        )
      } />
    </Routes>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(<Root />)
