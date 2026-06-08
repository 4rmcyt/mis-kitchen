import { supabase, q, getCurrentProfile } from './client.js';
import type { Recipe, Allergen, RecipeAllergen } from './types.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export async function getRecipes(): Promise<Recipe[]> {
  return q<Recipe[]>(() =>
    db.from("recipes")
      .select("*, recipe_allergens(allergen_id, note, allergens(id, name, slug))")
      .order("name")
  );
}

export async function getAllergens(): Promise<Allergen[]> {
  return q<Allergen[]>(() => db.from("allergens").select("*").order("name"));
}

export async function setRecipeAllergens(
  recipeId: string,
  allergens: { allergen_id: string; note: string | null }[]
): Promise<RecipeAllergen[]> {
  await q(() => db.from("recipe_allergens").delete().eq("recipe_id", recipeId));
  if (allergens.length === 0) return [];
  return q<RecipeAllergen[]>(() =>
    db.from("recipe_allergens")
      .insert(allergens.map((a: { allergen_id: string; note: string | null }) => ({ recipe_id: recipeId, ...a })))
      .select("allergen_id, note, allergens(id, name, slug)")
  );
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
