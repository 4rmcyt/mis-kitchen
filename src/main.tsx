import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { lazy, Suspense, Component } from 'react'
import type { ReactNode } from 'react'
import { getSession } from './lib/supabase.js'
import { useAuth } from './hooks/useAuth.js'
import App from './App.js'
import Login from './Login.js'
import Onboarding from './Onboarding.js'
import ResetPassword from './ResetPassword.js'
import JoinPage from './JoinPage.js'

const Admin = lazy(() => import('./Admin.js'))
import type { Session, User } from '@supabase/supabase-js'
import type { Role, Station } from './lib/types.js'

// Sentry is deferred — errors in the first moments before init are not captured (accepted tradeoff).
// Static import would add ~86 kB / ~29 kB gzip to the critical path; dynamic import fires post-render.
setTimeout(() => {
  import('@sentry/react').then(Sentry => {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.MODE,
      tracesSampleRate: 0.2,
      replaysOnErrorSampleRate: 0,
    })
  })
}, 0)

// Minimal error boundary that does not depend on Sentry being loaded.
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  render() {
    if (this.state.hasError)
      return <div style={{ padding: 32, color: '#fff' }}>Something went wrong. Please refresh the page.</div>
    return this.props.children
  }
}

function Root() {
  const {
    session,
    userId,
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
        userId={userId}
        userRole={userRole}
        userStation={userStation}
        needsPasswordReset={needsPasswordReset}
        setNeedsPasswordReset={setNeedsPasswordReset}
        needsOnboarding={needsOnboarding}
        setNeedsOnboarding={setNeedsOnboarding}
        checkOnboarding={checkOnboarding}
        setSession={setSession}
      />
    </BrowserRouter>
  )
}

interface RootRoutesProps {
  session: Session | null;
  userId: string | null;
  userRole: Role | null;
  userStation: Station | string;
  needsPasswordReset: boolean;
  setNeedsPasswordReset: (v: boolean) => void;
  needsOnboarding: boolean;
  setNeedsOnboarding: (v: boolean) => void;
  checkOnboarding: (user: User) => void;
  setSession: (s: Session | null) => void;
}

function RootRoutes({ session, userId, userRole, userStation, needsPasswordReset, setNeedsPasswordReset, needsOnboarding, setNeedsOnboarding, checkOnboarding, setSession }: RootRoutesProps) {
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
            <Route path="/admin/*" element={
              (userRole === 'admin' || userRole === 'superadmin')
                ? <Suspense fallback={<div className="loading-msg">Loading…</div>}><Admin /></Suspense>
                : <App userRole={userRole} userStation={userStation} userId={userId} />
            } />
            <Route path="/*" element={<App userRole={userRole} userStation={userStation} userId={userId} />} />
          </Routes>
        )
      } />
    </Routes>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <Root />
  </ErrorBoundary>
)
