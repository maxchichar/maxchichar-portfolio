import { is } from "drizzle-orm";
import { getTableConfig, PgTable } from "drizzle-orm/pg-core";

import * as schema from "./schema";

/** What the live database actually has, read from the Postgres catalog. */
export interface DatabaseShape {
  columns: { table: string; column: string }[];
  indexes: string[];
}

/**
 * Every table, column and named index the code expects, as readable labels
 * ("contact_replies", "site_settings.hero_media_id", "index <name>").
 * Built from the Drizzle schema, so a new migration is covered automatically.
 */
export function expectedSchema(): string[] {
  const expected: string[] = [];
  for (const value of Object.values(schema)) {
    if (!is(value, PgTable)) continue;
    const config = getTableConfig(value);
    expected.push(config.name);
    for (const column of config.columns) expected.push(`${config.name}.${column.name}`);
    for (const index of config.indexes) {
      if (index.config.name) expected.push(`index ${index.config.name}`);
    }
  }
  return expected;
}

/**
 * What the code expects but the database lacks: an unapplied migration. A
 * missing table is listed once, not once per column. Checks tables, columns
 * and indexes; a changed constraint or enum isn't detected.
 */
export function missingFromDatabase(actual: DatabaseShape): string[] {
  const tables = new Set(actual.columns.map((c) => c.table));
  const columns = new Set(actual.columns.map((c) => `${c.table}.${c.column}`));
  const indexes = new Set(actual.indexes.map((name) => `index ${name}`));
  return expectedSchema().filter((item) => {
    if (item.startsWith("index ")) return !indexes.has(item);
    const [table, column] = item.split(".");
    if (!column) return !tables.has(item);
    return tables.has(table!) && !columns.has(item);
  });
}
