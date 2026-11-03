import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { missingFromDatabase } from "@/lib/db/schema-check";

import { recordError } from "./errors";

/**
 * Compares the live database with the schema this deploy's code expects.
 * Anything missing (a migration that wasn't applied) is recorded as an error,
 * so it shows on the admin Errors page and is emailed, and returned.
 */
export async function checkDatabaseSchema(): Promise<string[]> {
  const [columns, indexes] = await Promise.all([
    db.execute<{ table: string; column: string }>(sql`
      SELECT table_name AS "table", column_name AS "column"
      FROM information_schema.columns WHERE table_schema = 'public'`),
    db.execute<{ name: string }>(sql`
      SELECT indexname AS name FROM pg_indexes WHERE schemaname = 'public'`),
  ]);
  const missing = missingFromDatabase({
    columns: columns.rows,
    indexes: indexes.rows.map((r) => r.name),
  });
  if (missing.length > 0) {
    await recordError({
      source: "server",
      message: `Database is missing a migration. Not found: ${missing.join(", ")}. Apply the matching file(s) in drizzle/.`,
      route: "/api/health",
      path: "/api/health",
    });
  }
  return missing;
}
