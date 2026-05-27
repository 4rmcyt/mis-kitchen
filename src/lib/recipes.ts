import { supabase, q, getCurrentProfile } from './client.js';
import type { Recipe } from './types.js';

export async function getRecipes(): Promise<Recipe[]> {
  return q(() => supabase.from("recipes").select("*").order("name"));
}

export async function createRecipe(recipe: Partial<Recipe>): Promise<Recipe> {
  try {
    const profile = await getCurrentProfile();
    return q(() =>
      supabase.from("recipes").insert({
        ...recipe,
        created_by:    profile.id,
        restaurant_id: profile.restaurant_id,
      }).select().single()
    );
  } catch (err) {
    console.error("[recipes] create:", (err as Error).message);
    throw err;
  }
}

export async function updateRecipe(id: string, updates: Partial<Recipe>): Promise<Recipe> {
  return q(() =>
    supabase.from("recipes").update(updates).eq("id", id).select().single()
  );
}

export async function deleteRecipe(id: string): Promise<null> {
  return q(() => supabase.from("recipes").delete().eq("id", id));
}
