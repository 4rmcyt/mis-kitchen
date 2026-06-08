import { describe, it, expect } from 'vitest';
import { parseSheetCsv } from './sheets.js';

// Mirrors the Cucumber Raita sheet from the photo:
//   Row 1: ,Cucumber Raita,
//   Row 3: Item,Quantity,Notes
//   Rows 4-11: ingredients
//   Row 11: Yield: 5L,Shelf life: 5 days,
//   Rows 14-16: numbered steps
const CUCUMBER_RAITA_CSV = `\
,Cucumber Raita,
,,
Item,Quantity,Notes
greek yogurt,4kg,
water,,
cucumber,1200g (dry),"shreaded, squeeze out juice"
sexy masala,75g,
black salt,20g,
salt,,
cilantro,150g,fine cut
Yield: 5L,Shelf life: 5 days,
,,
,,
,,
1) Using a box grater shread all of the cucumber and squeeze out juice,,
2) Mix all ingredients together,,
3) Store in airtight container and chill immediately,,
`;

describe('parseSheetCsv', () => {
  it('extracts recipe name from row 1 col B', () => {
    const result = parseSheetCsv(CUCUMBER_RAITA_CSV);
    expect(result.name).toBe('Cucumber Raita');
  });

  it('extracts ingredients with amounts', () => {
    const result = parseSheetCsv(CUCUMBER_RAITA_CSV);
    const names = result.ingredients.map(i => i.name);
    expect(names).toContain('greek yogurt');
    expect(names).toContain('cucumber');
    expect(names).toContain('cilantro');
  });

  it('parses ingredient amount and unit', () => {
    const result = parseSheetCsv(CUCUMBER_RAITA_CSV);
    const yogurt = result.ingredients.find(i => i.name === 'greek yogurt')!;
    expect(yogurt.amount).toBe('4');
    expect(yogurt.unit).toBe('kg');
  });

  it('extracts yield as portions', () => {
    const result = parseSheetCsv(CUCUMBER_RAITA_CSV);
    expect(result.portions).toBe(5);
  });

  it('extracts numbered steps', () => {
    const result = parseSheetCsv(CUCUMBER_RAITA_CSV);
    expect(result.steps).toHaveLength(3);
    expect(result.steps[0].text).toContain('box grater');
    expect(result.steps[2].text).toContain('airtight container');
  });

  it('skips header row from ingredients', () => {
    const result = parseSheetCsv(CUCUMBER_RAITA_CSV);
    expect(result.ingredients.map(i => i.name)).not.toContain('Item');
  });

  it('skips shelf life row from ingredients', () => {
    const result = parseSheetCsv(CUCUMBER_RAITA_CSV);
    expect(result.ingredients.map(i => i.name)).not.toContain('Yield: 5L');
  });
});

describe('parseSheetCsv edge cases', () => {
  it('handles empty CSV gracefully', () => {
    expect(() => parseSheetCsv('')).toThrow('Empty spreadsheet');
  });

  it('uses Untitled Recipe when first rows are empty', () => {
    // Three empty rows before the header — no recipe name present
    const csv = `,,\n,,\n,,\nItem,Quantity,Notes\napple,100g,\n`;
    const result = parseSheetCsv(csv);
    expect(result.name).toBe('Untitled Recipe');
  });

  it('handles amounts without units', () => {
    const csv = `,My Recipe,\n,,\nItem,Quantity,Notes\nsalt,20,\n1) Step one,,\n`;
    const result = parseSheetCsv(csv);
    expect(result.ingredients[0].amount).toBe('20');
  });
});
