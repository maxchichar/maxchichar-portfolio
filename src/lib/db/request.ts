import { AsyncLocalStorage } from "node:async_hooks";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

// Shared across Next's bundle and the Worker entrypoint in the same isolate.
// A Symbol registry avoids duplicate AsyncLocalStorage instances after bundling.
type Database = ReturnType<typeof drizzle<typeof schema>>;
const key = Symbol.for("portfolio.database.request");
const registry = globalThis as typeof globalThis & {
  [key]?: AsyncLocalStorage<Database>;
};
export const databaseScope = (registry[key] ??= new AsyncLocalStorage<Database>());

export function createRequestDatabase(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) return null;
  neonConfig.webSocketConstructor = WebSocket;
  neonConfig.poolQueryViaFetch = true;
  const pool = new Pool({ connectionString });
  pool.on("error", (err: Error) => {
    console.warn("Neon request connection drop:", err.message);
  });
  return { database: drizzle(pool, { schema }), close: () => pool.end() };
}
