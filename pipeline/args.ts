/** Reads `--limit N` from the command line; undefined when absent. Throws on a missing or invalid N. */
export function parseLimit(argv: string[]): number | undefined {
  const i = argv.indexOf("--limit");
  if (i === -1) return undefined;
  const raw = argv[i + 1];
  const n = Number(raw);
  if (raw === undefined || !Number.isInteger(n) || n < 1) {
    throw new Error(`--limit needs a positive whole number, for example --limit 5 (got ${raw ?? "nothing"}).`);
  }
  return n;
}
