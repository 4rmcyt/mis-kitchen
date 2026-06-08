import { offTagsToSlugs } from '../domain/allergens.js';
import type { Allergen } from './types.js';

const OFF_API = 'https://world.openfoodfacts.org/cgi/search.pl';

async function fetchAllergenTagsForIngredient(name: string): Promise<string[]> {
  const params = new URLSearchParams({
    search_terms: name,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: '3',
    fields: 'allergens_tags',
  });
  const res = await fetch(`${OFF_API}?${params}`);
  if (!res.ok) return [];
  const data = await res.json();
  const tags: string[] = [];
  for (const product of data.products ?? []) {
    tags.push(...(product.allergens_tags ?? []));
  }
  return tags;
}

// Returns allergen_ids that were detected across all ingredients
export async function fetchAllergenSuggestions(
  ingredientNames: string[],
  allAllergens: Allergen[]
): Promise<string[]> {
  const results = await Promise.allSettled(
    ingredientNames.map(n => fetchAllergenTagsForIngredient(n))
  );

  const allTags: string[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') allTags.push(...r.value);
  }

  const slugs = offTagsToSlugs(allTags);
  return allAllergens
    .filter(a => slugs.has(a.slug))
    .map(a => a.id);
}
