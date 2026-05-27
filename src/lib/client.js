import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { auth: { detectSessionInUrl: true, flowType: 'pkce' } }
);

export async function q(fn) {
  try {
    const { data, error } = await fn();
    if (error) throw new Error(error.message);
    return data;
  } catch (err) {
    console.error("[supabase]", err.message);
    throw err;
  }
}

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Not authenticated");
  return user;
}

export async function getCurrentProfile() {
  const user = await getCurrentUser();
  return q(() => supabase.from("profiles").select("*").eq("id", user.id).single());
}
