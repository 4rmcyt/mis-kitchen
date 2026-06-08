import type { RecipeIngredient, RecipeStep } from '../lib/types.js';

export interface ParsedRecipe {
  name: string;
  portions: number | null;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  notes: string;
}

/** Parse a CSV string exported from a Google Sheets recipe document.
 *
 * Expected layout (columns A, B, C):
 *   Row 1:  [any] [Recipe Name] [...]
 *   Row 3:  Item  | Quantity    | Notes   (header row — detected by keyword)
 *   Row 4+: <ingredient rows until empty or Yield row>
 *   Yield row: "Yield: XL" or "Yield: Xkg" in col A or B
 *   Steps: rows starting with a digit followed by ")" or "."
 */
export function parseSheetCsv(csv: string): ParsedRecipe {
  const rows = parseCsvRows(csv);
  if (rows.length === 0) throw new Error('Empty spreadsheet');

  const name = extractName(rows);
  const { ingredients, portions } = extractIngredients(rows);
  const steps = extractSteps(rows);

  return { name, portions, ingredients, steps, notes: '' };
}

// ── helpers ──────────────────────────────────────────────────────────────────

const HEADER_KEYWORDS = /^(item|ingredient|quantity|qty|notes|steps?)$/i;

function isHeaderRow(row: string[]): boolean {
  return row.some(c => HEADER_KEYWORDS.test(c.trim()));
}

function extractName(rows: string[][]): string {
  // Search first 3 rows for the longest non-empty cell that isn't a column header
  for (const r of rows.slice(0, 3)) {
    if (isHeaderRow(r)) continue;
    const candidate = r.reduce((best, cell) => cell.trim().length > best.length ? cell.trim() : best, '');
    if (candidate) return candidate;
  }
  return 'Untitled Recipe';
}

function findHeaderRow(rows: string[][]): number {
  for (let i = 0; i < rows.length; i++) {
    const joined = rows[i].join('|').toLowerCase();
    if (joined.includes('item') || joined.includes('ingredient') || joined.includes('quantity')) {
      return i;
    }
  }
  return -1;
}

function extractIngredients(rows: string[][]): { ingredients: RecipeIngredient[]; portions: number | null } {
  const headerIdx = findHeaderRow(rows);
  const ingredients: RecipeIngredient[] = [];
  let portions: number | null = null;

  if (headerIdx === -1) return { ingredients, portions };

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const a = (row[0] ?? '').trim();
    const b = (row[1] ?? '').trim();
    const c = (row[2] ?? '').trim();

    if (!a && !b) continue;

    // Yield row — extract portions from quantity cell
    const yieldMatch = a.match(/^yield[:\s]/i) || b.match(/^yield[:\s]/i);
    if (yieldMatch) {
      const src = a.toLowerCase().startsWith('yield') ? a : b;
      const m = src.match(/[\d.]+/);
      if (m) portions = parseFloat(m[0]);
      continue;
    }

    // Shelf life row — skip
    if (/shelf.?life/i.test(a) || /shelf.?life/i.test(b)) continue;

    // Stop at numbered steps section
    if (/^\d+[.)]\s/.test(a)) break;

    // Skip if it looks like a section header (no quantity)
    if (a && !b) continue;

    const { amount, unit } = splitAmountUnit(b);
    ingredients.push({ name: a, amount, unit, notes: c } as RecipeIngredient & { notes: string });
  }

  return { ingredients, portions };
}

function extractSteps(rows: string[][]): RecipeStep[] {
  const steps: RecipeStep[] = [];
  const stepPattern = /^\d+[.)]\s*(.*)/;

  for (const row of rows) {
    for (const cell of row) {
      const trimmed = cell.trim();
      const m = trimmed.match(stepPattern);
      if (m) {
        const text = m[1].trim();
        if (text) steps.push({ text });
        break;
      }
    }
  }

  return steps;
}

function splitAmountUnit(raw: string): { amount: string; unit: string } {
  const m = raw.match(/^([\d.,/\s]+)\s*([a-zA-Z%]*)$/);
  if (m) return { amount: m[1].trim(), unit: m[2].trim() || 'pcs' };
  return { amount: raw, unit: '' };
}

/** Minimal RFC-4180 CSV parser that handles quoted fields with embedded commas/newlines. */
function parseCsvRows(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const n = csv.length;

  while (i < n) {
    const ch = csv[i];
    if (inQuotes) {
      if (ch === '"') {
        if (csv[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { row.push(field); field = ''; }
      else if (ch === '\r' && csv[i + 1] === '\n') { row.push(field); field = ''; rows.push(row); row = []; i += 2; continue; }
      else if (ch === '\n' || ch === '\r') { row.push(field); field = ''; rows.push(row); row = []; }
      else { field += ch; }
    }
    i++;
  }
  row.push(field);
  if (row.some(c => c !== '')) rows.push(row);

  return rows;
}
