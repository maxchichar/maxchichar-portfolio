import "server-only";

import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";

import * as schema from "./schema";
import { databaseScope } from "./request";

type Database = ReturnType<typeof drizzle<typeof schema>>;

function createDb(): Database {
  // Vercel/Node fallback only. Workers use the request scope and native WebSocket.
  neonConfig.webSocketConstructor = ws;
  neonConfig.poolQueryViaFetch = true;
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
  pool.on("error", (err: Error) => {
    // Gracefully absorb idle socket resets in serverless environments
    console.warn("Neon pool idle connection drop:", err.message);
  });
  return drizzle(pool, { schema });
}

let nodeDatabase: Database | undefined;
export const db = new Proxy({} as Database, {
  get(_target, property) {
    const database = databaseScope.getStore() ?? (nodeDatabase ??= createDb());
    const value = Reflect.get(database, property);
    return typeof value === "function" ? value.bind(database) : value;
  },
});
export * as schema from "./schema";
