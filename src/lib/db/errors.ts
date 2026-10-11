/**
 * Postgres "undefined_table" (42P01): a migration hasn't been applied yet.
 * Optional features (CV, testimonials) treat it as "not set up" instead of
 * failing the page. The Neon driver may wrap the pg error in `cause`.
 */
export function isMissingTableError(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } } | null;
  return e?.code === "42P01" || e?.cause?.code === "42P01";
}
