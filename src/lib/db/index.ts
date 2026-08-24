import "server-only";

import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";

import * as schema from "./schema";

// Node.js runtime needs a WebSocket polyfill for the pooled/transaction-
// capable Neon driver (native WebSocket only exists in edge runtimes).
neonConfig.webSocketConstructor = ws;

type Database = ReturnType<typeof drizzle<typeof schema>>;

function createDb(): Database {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    // Must not throw or connect at import time — `next build` imports this
    // module without a real DATABASE_URL (no admin route is statically
    // generated in Phase 2, so nothing actually queries the database
    // during a build). Any real attempt to use `db` without a configured
    // URL fails loudly, at the call site, not silently.
    return new Proxy({} as Database, {
      get() {
        throw new Error(
          "DATABASE_URL is not set. Copy .env.example to .env.local and set it before using the database.",
        );
      },
    });
  }

  const pool = new Pool({ connectionString });
  return drizzle(pool, { schema });
}

export const db = createDb();
export * as schema from "./schema";
