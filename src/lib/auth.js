import { supabase } from './client.js';

export async function signIn(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    return data;
  } catch (err) {
    console.error("[auth] signIn:", err.message);
    throw err;
  }
}

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  } catch (err) {
    console.error("[auth] signOut:", err.message);
    throw err;
  }
}

export async function getSession() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw new Error(error.message);
    return session;
  } catch (err) {
    console.error("[auth] getSession:", err.message);
    return null;
  }
}

export function onAuthChange(callback) {
  return supabase.auth.onAuthStateChange((event, session) => callback(session, event));
}
