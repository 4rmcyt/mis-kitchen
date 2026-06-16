import { supabase, getCurrentProfile } from "./client.js";

export interface PrepItem {
  id: string;
  restaurant_id: string;
  name: string;
  station: string;
  default_quantity: number | null;
  active: boolean;
  created_at: string;
}

export async function getPrepItems(): Promise<PrepItem[]> {
  const { data, error } = await supabase
    .from("prep_items")
    .select("*")
    .order("name");
  if (error) throw new Error(error.message);
  return data as PrepItem[];
}

/** Returns a Map<id, default_quantity> for fast lookup during generation. */
export async function getPrepItemsMap(): Promise<Map<string, number | null>> {
  const items = await getPrepItems();
  return new Map(items.map(i => [i.id, i.default_quantity]));
}

export async function createPrepItem(payload: {
  name: string;
  station: string;
  default_quantity: number | null;
}): Promise<PrepItem> {
  const profile = await getCurrentProfile();
  const { data, error } = await supabase
    .from("prep_items")
    .insert({ ...payload, restaurant_id: profile.restaurant_id })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as PrepItem;
}

export async function updatePrepItem(
  id: string,
  patch: { name?: string; station?: string; default_quantity?: number | null; active?: boolean }
): Promise<PrepItem> {
  const { data, error } = await supabase
    .from("prep_items")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as PrepItem;
}
