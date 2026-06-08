import { useState, useEffect } from 'react';
import { getSession, onAuthChange, supabase, subscribePush } from '../lib/supabase.js';
import type { Session, User } from '@supabase/supabase-js';
import type { Role, Station } from '../lib/types.js';

function trySubscribePush() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') subscribePush();
  else if (Notification.permission === 'default')
    Notification.requestPermission().then(p => { if (p === 'granted') subscribePush(); });
}

export function useAuth() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [userStation, setUserStation] = useState<Station | string>('Common');
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [needsPasswordReset, setNeedsPasswordReset] = useState(false);

  async function checkOnboarding(user: User) {
    if (!user) return;
    const { data: profiles } = await supabase
      .from('profiles')
      .select('name, role, password_set, station')
      .eq('id', user.id)
      .limit(1);
    const profile = profiles?.[0] as { name: string | null; role: Role; password_set: boolean; station: Station } | undefined;
    const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin';
    setUserRole(profile?.role || null);
    setUserStation(profile?.station || 'Common');
    setNeedsOnboarding(!isAdmin && (!profile?.name || !profile?.password_set));
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ data }) => {
        const s = data?.session;
        setSession(s);
        if (s) { checkOnboarding(s.user); trySubscribePush(); }
        window.history.replaceState({}, '', window.location.pathname);
      });
    } else {
      getSession().then(s => {
        setSession(s);
        if (s) { checkOnboarding(s.user); trySubscribePush(); }
      });
    }

    const { data: { subscription } } = onAuthChange((s, event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSession(s);
        setNeedsPasswordReset(true);
        return;
      }
      setSession(s);
      if (s) { checkOnboarding(s.user); if (event === 'SIGNED_IN') trySubscribePush(); }
    });

    return () => subscription.unsubscribe();
  }, []);

  return { session, userRole, userStation, needsOnboarding, needsPasswordReset, setNeedsOnboarding, setNeedsPasswordReset, checkOnboarding, setSession };
}
