/**
 * Scale the numeric part of an ingredient amount string by a multiplier.
 * If the string has no parseable leading number, returns it unchanged.
 *
 * Examples:
 *   scaleAmount("4", 3)           → "12"
 *   scaleAmount("1.5", 2)         → "3"
 *   scaleAmount("1200g (dry)", 2) → "2400g (dry)"
 *   scaleAmount("to taste", 2)    → "to taste"
 *   scaleAmount("", 2)            → ""
 */
export function scaleAmount(amount: string, multiplier: number): string {
  const match = amount.match(/^(\d+(?:\.\d+)?)(.*)/s);
  if (!match) return amount;

  const scaled = parseFloat(match[1]) * multiplier;
  const suffix = match[2];
  // Show one decimal place only when the result is not a whole number.
  const formatted = scaled % 1 !== 0 ? scaled.toFixed(1) : String(scaled);
  return formatted + suffix;
}
