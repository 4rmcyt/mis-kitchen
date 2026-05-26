import { supabase, q } from './client.js';

export async function getProfile(userId) {
  return q(() => supabase.from("profiles").select("*").eq("id", userId).single());
}

export async function updateProfile(userId, updates) {
  const allowed = {
    ...(updates.name         !== undefined && { name:         updates.name }),
    ...(updates.station      !== undefined && { station:      updates.station }),
    ...(updates.password_set !== undefined && { password_set: updates.password_set }),
  };
  return q(() =>
    supabase.from("profiles").update(allowed).eq("id", userId).select().single()
  );
}

export async function getRestaurantProfiles() {
  return q(() => supabase.from("profiles").select("*").order("name"));
}

export async function adminUpdateProfile(userId, updates) {
  const allowed = {
    ...(updates.role                !== undefined && { role:                updates.role }),
    ...(updates.station             !== undefined && { station:             updates.station }),
    ...(updates.active              !== undefined && { active:              updates.active }),
    ...(updates.secondary_stations  !== undefined && { secondary_stations:  updates.secondary_stations }),
  };
  return q(() =>
    supabase.from("profiles").update(allowed).eq("id", userId).select().single()
  );
}
