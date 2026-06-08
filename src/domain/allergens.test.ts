import { describe, it, expect } from 'vitest';
import { offTagsToSlugs } from './allergens.js';

describe('offTagsToSlugs', () => {
  it('maps known tags to slugs', () => {
    const result = offTagsToSlugs(['en:gluten', 'en:milk', 'en:sesame-seeds']);
    expect(result.has('gluten')).toBe(true);
    expect(result.has('dairy')).toBe(true);
    expect(result.has('sesame')).toBe(true);
  });

  it('ignores unknown tags', () => {
    const result = offTagsToSlugs(['en:unknown-thing']);
    expect(result.size).toBe(0);
  });

  it('deduplicates — wheat and gluten both map to gluten', () => {
    const result = offTagsToSlugs(['en:gluten', 'en:wheat']);
    expect(result.size).toBe(1);
    expect(result.has('gluten')).toBe(true);
  });

  it('returns empty set for empty input', () => {
    expect(offTagsToSlugs([]).size).toBe(0);
  });
});
