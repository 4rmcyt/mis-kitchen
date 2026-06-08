// Maps Open Food Facts allergen tags (e.g. "en:gluten") to our allergen slugs
const OFF_TAG_TO_SLUG: Record<string, string> = {
  'en:gluten':          'gluten',
  'en:wheat':           'gluten',
  'en:rye':             'gluten',
  'en:barley':          'gluten',
  'en:oats':            'gluten',
  'en:milk':            'dairy',
  'en:dairy':           'dairy',
  'en:lactose':         'dairy',
  'en:nuts':            'nuts',
  'en:almonds':         'nuts',
  'en:cashews':         'nuts',
  'en:pistachios':      'nuts',
  'en:walnuts':         'nuts',
  'en:peanuts':         'nuts',
  'en:sesame-seeds':    'sesame',
  'en:sesame':          'sesame',
  'en:celery':          'celiac',
  'en:soybeans':        'legumes',
  'en:legumes':         'legumes',
  'en:mustard':         'garlic',
  'en:sulphur-dioxide': 'vegan',
  'en:sulphites':       'vegan',
};

export function offTagsToSlugs(tags: string[]): Set<string> {
  const slugs = new Set<string>();
  for (const tag of tags) {
    const slug = OFF_TAG_TO_SLUG[tag.toLowerCase()];
    if (slug) slugs.add(slug);
  }
  return slugs;
}
