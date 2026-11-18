/** Replaces em dashes (house style forbids them) with a comma, then trims. */
export function cleanText(s: string): string {
  return s.replace(/\s*\u2014\s*/g, ", ").trim();
}
