import { supabase, q, getCurrentProfile } from './client.js';

export async function getRecipes() {
  return q(() => supabase.from("recipes").select("*").order("name"));
}

export async function createRecipe(recipe) {
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
    console.error("[recipes] create:", err.message);
    throw err;
  }
}

export async function updateRecipe(id, updates) {
  return q(() =>
    supabase.from("recipes").update(updates).eq("id", id).select().single()
  );
}

export async function deleteRecipe(id) {
  return q(() => supabase.from("recipes").delete().eq("id", id));
}
