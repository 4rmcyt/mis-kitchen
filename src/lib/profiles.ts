import { supabase, q } from './client.js';
import type { Profile, Role, Station } from './types.js';

export interface OnboardingState {
  name: string | null;
  role: Role;
  password_set: boolean;
  station: Station;
}

export async function getOnboardingState(userId: string): Promise<OnboardingState | null> {
  const { data } = await supabase
    .from('profiles')
    .select('name, role, password_set, station')
    .eq('id', userId)
    .limit(1);
  return (data?.[0] as OnboardingState | undefined) ?? null;
}

export async function getProfile(userId: string): Promise<Profile> {
  return q<Profile>(() => supabase.from("profiles").select("*").eq("id", userId).single());
}

export async function updateProfile(userId: string, updates: Partial<Pick<Profile, 'name' | 'station' | 'password_set'>>): Promise<Profile> {
  const allowed = {
    ...(updates.name         !== undefined && { name:         updates.name }),
    ...(updates.station      !== undefined && { station:      updates.station }),
    ...(updates.password_set !== undefined && { password_set: updates.password_set }),
  };
  return q<Profile>(() =>
    supabase.from("profiles").update(allowed).eq("id", userId).select().single()
  );
}

export async function getRestaurantProfiles(): Promise<Profile[]> {
  return q<Profile[]>(() => supabase.from("profiles").select("*").order("name"));
}

export async function adminUpdateProfile(userId: string, updates: Partial<Pick<Profile, 'role' | 'station' | 'active' | 'secondary_stations'>>): Promise<Profile> {
  const allowed = {
    ...(updates.role                !== undefined && { role:                updates.role }),
    ...(updates.station             !== undefined && { station:             updates.station }),
    ...(updates.active              !== undefined && { active:              updates.active }),
    ...(updates.secondary_stations  !== undefined && { secondary_stations:  updates.secondary_stations }),
  };
  return q<Profile>(() =>
    supabase.from("profiles").update(allowed).eq("id", userId).select().single()
  );
}
