import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types.js";
import type { Profile } from "./types.js";

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
  { auth: { detectSessionInUrl: true, flowType: 'pkce' } }
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function q<T>(fn: () => PromiseLike<{ data: any; error: any }>): Promise<T> {
  const { data, error } = await fn();
  if (error) {
    console.error("[supabase]", error.message);
    throw new Error(error.message);
  }
  return data as T;
}

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Not authenticated");
  return user;
}

export async function getCurrentProfile(): Promise<Profile> {
  const user = await getCurrentUser();
  return q(() => supabase.from("profiles").select("*").eq("id", user.id).single());
}
