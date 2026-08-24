// Database-level Neon verification. Run via: npm run verify:neon:db
//
// Uses the actual shipped @neondatabase/serverless + drizzle-orm/neon-serverless
// driver — the same one src/lib/db/index.ts uses in the running app. The
// connection setup below is duplicated rather than imported from
// src/lib/db/index.ts because that module imports the `server-only` marker
// package, which unconditionally throws when resolved outside the Next.js
// bundler (see scripts/seed-admin.ts for the same, earlier note). This is
// the same driver, not a different one.
//
// Output contract:
//   BLOCKED <reason>  — could not execute (missing env, unreachable host,
//                       auth/credential failure). Printed once, then exits.
//   PASS <check>      — that specific check actually ran against the
//                       configured database and succeeded.
//   FAIL <check> <reason> — actually ran and failed.
// Exit code is 0 only if every check PASSed.
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import ws from "ws";

import * as schema from "../src/lib/db/schema";

neonConfig.webSocketConstructor = ws;

const EXPECTED_TABLES = [
  "users",
  "api_keys",
  "media",
  "projects",
  "project_versions",
  "research",
  "research_versions",
  "articles",
  "article_versions",
  "pages",
  "page_versions",
  "tags",
  "project_tags",
  "research_tags",
  "article_tags",
  "evidence",
  "project_evidence",
  "research_evidence",
  "site_settings",
  "contact_submissions",
  "audit_logs",
].sort();

const PARTIAL_UNIQUE_INDEXES = [
  "project_versions_one_published_idx",
  "project_versions_one_draft_idx",
  "research_versions_one_published_idx",
  "research_versions_one_draft_idx",
  "article_versions_one_published_idx",
  "article_versions_one_draft_idx",
  "page_versions_one_published_idx",
  "page_versions_one_draft_idx",
];

const GENERATED_SEARCH_COLUMNS: Array<[string, string]> = [
  ["project_versions", "search_vector"],
  ["research_versions", "search_vector"],
  ["article_versions", "search_vector"],
];

let failed = false;

function pass(check: string) {
  console.log(`PASS ${check}`);
}

function fail(check: string, reason: string) {
  failed = true;
  console.log(`FAIL ${check} — ${reason}`);
}

function blockedExit(reason: string): never {
  console.log(`BLOCKED ${reason}`);
  process.exit(2);
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    blockedExit(
      "DATABASE_URL is not set. This check cannot run without it — see .env.example.",
    );
  }

  const pool = new Pool({ connectionString });
  const db = drizzle(pool, { schema });

  // --- Connection ---
  try {
    await pool.query("SELECT 1");
    pass("connection (real neon-serverless driver)");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await pool.end().catch(() => {});
    blockedExit(`could not connect via @neondatabase/serverless — ${message}`);
  }

  // --- Migration ---
  try {
    await migrate(db, { migrationsFolder: "./drizzle" });
    pass("migration applied (idempotent — safe to re-run)");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    fail("migration", message);
    // Nothing below this can be trusted if migration failed.
    await pool.end().catch(() => {});
    printSummary();
    process.exit(1);
  }

  // --- 21-table schema ---
  try {
    const { rows } = await pool.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`,
    );
    const actual = rows.map((r) => r.table_name).sort();
    const missing = EXPECTED_TABLES.filter((t) => !actual.includes(t));
    const unexpectedSessions = actual.includes("sessions");

    if (missing.length === 0 && actual.length === EXPECTED_TABLES.length) {
      pass(`21-table schema (found exactly the expected ${EXPECTED_TABLES.length})`);
    } else {
      fail(
        "21-table schema",
        `expected ${EXPECTED_TABLES.length} tables, found ${actual.length}. Missing: [${missing.join(", ")}]. Extra: [${actual.filter((t) => !EXPECTED_TABLES.includes(t)).join(", ")}]`,
      );
    }

    if (unexpectedSessions) {
      fail(
        "no sessions table",
        "a `sessions` table exists — it was removed when the architecture moved to JWT sessions and should not be present",
      );
    } else {
      pass("no sessions table (correctly absent — JWT sessions, no adapter)");
    }
  } catch (err) {
    fail("21-table schema", err instanceof Error ? err.message : String(err));
  }

  // --- Foreign keys ---
  try {
    const { rows } = await pool.query<{ count: string }>(
      `SELECT count(*)::text FROM information_schema.table_constraints WHERE constraint_type = 'FOREIGN KEY' AND table_schema = 'public'`,
    );
    const count = Number(rows[0]?.count ?? 0);
    if (count > 0) {
      pass(`foreign keys exist (${count} found)`);
    } else {
      fail("foreign keys exist", "found 0 foreign key constraints");
    }
  } catch (err) {
    fail("foreign keys exist", err instanceof Error ? err.message : String(err));
  }

  // --- CHECK constraints, including the named publish-scope guard ---
  try {
    const { rows } = await pool.query<{ count: string }>(
      `SELECT count(*)::text FROM information_schema.table_constraints WHERE constraint_type = 'CHECK' AND table_schema = 'public'`,
    );
    const count = Number(rows[0]?.count ?? 0);
    if (count > 0) {
      pass(`CHECK constraints exist (${count} found, includes implicit NOT NULL checks)`);
    } else {
      fail("CHECK constraints exist", "found 0 check constraints");
    }

    const { rows: named } = await pool.query<{ conname: string }>(
      `SELECT conname FROM pg_constraint WHERE conname = 'api_keys_no_publish_scope'`,
    );
    if (named.length === 1) {
      pass("api_keys_no_publish_scope constraint exists");
    } else {
      fail("api_keys_no_publish_scope constraint exists", "not found in pg_constraint");
    }
  } catch (err) {
    fail("CHECK constraints", err instanceof Error ? err.message : String(err));
  }

  // --- Partial unique indexes (one-published / one-draft per item) ---
  try {
    const { rows } = await pool.query<{ indexname: string; indexdef: string }>(
      `SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' AND indexname = ANY($1::text[])`,
      [PARTIAL_UNIQUE_INDEXES],
    );
    const found = new Map(rows.map((r) => [r.indexname, r.indexdef]));
    for (const name of PARTIAL_UNIQUE_INDEXES) {
      const def = found.get(name);
      if (def && /WHERE/i.test(def) && /UNIQUE/i.test(def)) {
        pass(`partial unique index: ${name}`);
      } else if (def) {
        fail(name, `index exists but isn't a partial unique index: ${def}`);
      } else {
        fail(name, "index not found");
      }
    }
  } catch (err) {
    fail("partial unique indexes", err instanceof Error ? err.message : String(err));
  }

  // --- Generated tsvector search columns ---
  try {
    for (const [table, column] of GENERATED_SEARCH_COLUMNS) {
      const { rows } = await pool.query<{ is_generated: string; data_type: string }>(
        `SELECT is_generated, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
        [table, column],
      );
      const row = rows[0];
      if (row && row.is_generated === "ALWAYS" && row.data_type === "tsvector") {
        pass(`generated tsvector column: ${table}.${column}`);
      } else {
        fail(
          `generated tsvector column: ${table}.${column}`,
          row
            ? `found but is_generated=${row.is_generated}, data_type=${row.data_type}`
            : "column not found",
        );
      }
    }
  } catch (err) {
    fail("generated tsvector columns", err instanceof Error ? err.message : String(err));
  }

  await pool.end().catch(() => {});
  printSummary();
  process.exit(failed ? 1 : 0);
}

function printSummary() {
  console.log("");
  console.log(
    failed ? "verify-neon-db: FAIL (see above)" : "verify-neon-db: PASS (all checks)",
  );
}

main().catch((err) => {
  console.error("verify-neon-db crashed unexpectedly:", err);
  process.exit(1);
});
