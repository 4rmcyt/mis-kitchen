import { supabase } from './client.js';
import type { Session, AuthChangeEvent } from '@supabase/supabase-js';

export async function signIn(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    return data;
  } catch (err) {
    console.error("[auth] signIn:", (err as Error).message);
    throw err;
  }
}

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  } catch (err) {
    console.error("[auth] signOut:", (err as Error).message);
    throw err;
  }
}

export async function getSession(): Promise<Session | null> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw new Error(error.message);
    return session;
  } catch (err) {
    console.error("[auth] getSession:", (err as Error).message);
    return null;
  }
}

export function onAuthChange(callback: (session: Session | null, event: AuthChangeEvent) => void) {
  return supabase.auth.onAuthStateChange((event, session) => callback(session, event));
}
