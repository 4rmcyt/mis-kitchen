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

  it('maps legume variants correctly', () => {
    const result = offTagsToSlugs(['en:soybeans', 'en:legumes']);
    expect(result.has('legumes')).toBe(true);
    expect(result.size).toBe(1);
  });

  // Regression: these mappings were factually wrong and have been removed.
  // en:celery is not celiac disease (celiac is gluten-related).
  // en:mustard is not garlic.
  // en:sulphites / en:sulphur-dioxide are not vegan.
  it('does NOT map en:celery to celiac', () => {
    const result = offTagsToSlugs(['en:celery']);
    expect(result.has('celiac')).toBe(false);
    expect(result.size).toBe(0);
  });

  it('does NOT map en:mustard to garlic', () => {
    const result = offTagsToSlugs(['en:mustard']);
    expect(result.has('garlic')).toBe(false);
    expect(result.size).toBe(0);
  });

  it('does NOT map en:sulphites to vegan', () => {
    const result = offTagsToSlugs(['en:sulphites']);
    expect(result.has('vegan')).toBe(false);
    expect(result.size).toBe(0);
  });

  it('does NOT map en:sulphur-dioxide to vegan', () => {
    const result = offTagsToSlugs(['en:sulphur-dioxide']);
    expect(result.has('vegan')).toBe(false);
    expect(result.size).toBe(0);
  });
});
