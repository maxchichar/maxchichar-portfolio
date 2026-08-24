// Dev/deploy-time admin seed. Run standalone via `npm run seed:admin`
// (tsx + Node, outside the Next.js bundler) — deliberately does NOT import
// src/lib/db, since that module imports the `server-only` marker package,
// which unconditionally throws when resolved outside Next's bundler.
// This file builds its own minimal, disposable connection instead.
import { Pool, neonConfig } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";

import { hashPassword } from "../src/lib/auth/password";
import * as schema from "../src/lib/db/schema";

neonConfig.webSocketConstructor = ws;

async function main() {
  const connectionString = process.env.DATABASE_URL;
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!connectionString) {
    console.error("DATABASE_URL must be set.");
    process.exit(1);
  }
  if (!email || !password) {
    console.error("ADMIN_EMAIL and ADMIN_PASSWORD must be set (see .env.example).");
    process.exit(1);
  }

  const pool = new Pool({ connectionString });
  const db = drizzle(pool, { schema });
  const normalizedEmail = email.toLowerCase();

  const [existing] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, normalizedEmail))
    .limit(1);

  if (existing) {
    const passwordHash = await hashPassword(password);
    await db
      .update(schema.users)
      .set({ passwordHash, failedLoginCount: 0, lockedUntil: null })
      .where(eq(schema.users.id, existing.id));
    console.log(`Admin user ${normalizedEmail} updated with current ADMIN_PASSWORD.`);
    await pool.end();
    process.exit(0);
  }

  const passwordHash = await hashPassword(password);

  await db.insert(schema.users).values({
    email: normalizedEmail,
    passwordHash,
    name: "Administrator",
    role: "ADMIN",
  });

  // Password is intentionally never logged, here or anywhere else.
  console.log(`Admin user created for ${normalizedEmail}.`);
  await pool.end();
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
