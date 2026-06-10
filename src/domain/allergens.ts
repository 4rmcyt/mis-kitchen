// Maps Open Food Facts allergen tags (e.g. "en:gluten") to our allergen slugs.
// Seeded slugs: gluten, celiac, dairy, nuts, vegan, mango, onion, garlic,
//               legumes, cinnamon, sesame, fresh-cilantro
//
// Only include tags that genuinely correspond to a seeded slug.
// If no correct mapping exists for an OFF tag, omit it entirely.
const OFF_TAG_TO_SLUG: Record<string, string> = {
  'en:gluten':       'gluten',
  'en:wheat':        'gluten',
  'en:rye':          'gluten',
  'en:barley':       'gluten',
  'en:oats':         'gluten',
  'en:milk':         'dairy',
  'en:dairy':        'dairy',
  'en:lactose':      'dairy',
  'en:nuts':         'nuts',
  'en:almonds':      'nuts',
  'en:cashews':      'nuts',
  'en:pistachios':   'nuts',
  'en:walnuts':      'nuts',
  'en:peanuts':      'nuts',
  'en:sesame-seeds': 'sesame',
  'en:sesame':       'sesame',
  'en:soybeans':     'legumes',
  'en:legumes':      'legumes',
  // en:celery    → no matching slug (celery ≠ celiac; celiac is gluten-related — needs human review)
  // en:mustard   → no matching slug (mustard ≠ garlic)
  // en:sulphites / en:sulphur-dioxide → no matching slug (sulphites ≠ vegan)
};

export function offTagsToSlugs(tags: string[]): Set<string> {
  const slugs = new Set<string>();
  for (const tag of tags) {
    const slug = OFF_TAG_TO_SLUG[tag.toLowerCase()];
    if (slug) slugs.add(slug);
  }
  return slugs;
}
