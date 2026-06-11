/**
 * Scale the numeric part of an ingredient amount string by a multiplier.
 * If the string has no parseable leading number, returns it unchanged.
 *
 * Fractions ("1/2 cup") and thousands-separated numbers ("1,200g") are
 * returned unchanged — scaling them would produce misleading output.
 * TODO: implement fraction arithmetic when ownership ticket ships.
 *
 * Examples:
 *   scaleAmount("4", 3)           → "12"
 *   scaleAmount("1.5", 2)         → "3"
 *   scaleAmount("1200g (dry)", 2) → "2400g (dry)"
 *   scaleAmount("to taste", 2)    → "to taste"
 *   scaleAmount("", 2)            → ""
 *   scaleAmount("1/2 cup", 2)     → "1/2 cup"  (unchanged — fraction)
 *   scaleAmount("1,200g", 2)      → "1,200g"   (unchanged — thousands sep)
 *   scaleAmount("2 1/2 cups", 2)  → "2 1/2 cups" (unchanged — mixed fraction)
 */
export function scaleAmount(amount: string, multiplier: number): string {
  // Leave fractions (contains '/') or thousands-separated numbers (digit,digit) unchanged.
  if (/\d\/\d/.test(amount) || /\d,\d/.test(amount)) return amount;

  const match = amount.match(/^(\d+(?:\.\d+)?)(.*)/s);
  if (!match) return amount;

  const scaled = parseFloat(match[1]) * multiplier;
  const suffix = match[2];
  // Show one decimal place only when the result is not a whole number.
  const formatted = scaled % 1 !== 0 ? scaled.toFixed(1) : String(scaled);
  return formatted + suffix;
}
