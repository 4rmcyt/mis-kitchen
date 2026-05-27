import { supabase, q, getCurrentProfile } from './client.js';
import type { Recipe } from './types.js';

export async function getRecipes(): Promise<Recipe[]> {
  return q<Recipe[]>(() => supabase.from("recipes").select("*").order("name"));
}

export async function createRecipe(recipe: Partial<Recipe>): Promise<Recipe> {
  try {
    const profile = await getCurrentProfile();
    return q<Recipe>(() =>
      supabase.from("recipes").insert({
        ...recipe as object,
        created_by:    profile.id,
        restaurant_id: profile.restaurant_id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any).select().single()
    );
  } catch (err) {
    console.error("[recipes] create:", (err as Error).message);
    throw err;
  }
}

export async function updateRecipe(id: string, updates: Partial<Recipe>): Promise<Recipe> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return q<Recipe>(() => supabase.from("recipes").update(updates as any).eq("id", id).select().single());
}

export async function deleteRecipe(id: string): Promise<null> {
  return q(() => supabase.from("recipes").delete().eq("id", id));
}
