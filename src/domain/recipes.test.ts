import { describe, it, expect } from 'vitest';
import { scaleAmount } from './recipes.js';

describe('scaleAmount', () => {
  it('scales a plain integer', () => {
    expect(scaleAmount('4', 3)).toBe('12');
  });

  it('scales a decimal number', () => {
    expect(scaleAmount('1.5', 2)).toBe('3');
  });

  it('produces a decimal when result is not whole', () => {
    expect(scaleAmount('1', 3)).toBe('3');
    expect(scaleAmount('0.5', 3)).toBe('1.5');
  });

  it('scales numeric prefix and preserves trailing text', () => {
    expect(scaleAmount('1200g (dry)', 2)).toBe('2400g (dry)');
  });

  it('returns original string when no leading number', () => {
    expect(scaleAmount('to taste', 2)).toBe('to taste');
  });

  it('returns empty string unchanged', () => {
    expect(scaleAmount('', 2)).toBe('');
  });

  it('handles multiplier of 1 (no-op)', () => {
    expect(scaleAmount('500ml', 1)).toBe('500ml');
  });
});
