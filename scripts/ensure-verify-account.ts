// Ensures a DEDICATED verification-only account exists and is unlocked.
// Used by scripts/verify-neon-auth.sh at both the start (idempotent setup)
// and the end (cleanup) of a run, so the real ADMIN_EMAIL/ADMIN_PASSWORD
// account is never subjected to a failed-login attempt during
// verification and can never end up locked by running this suite.
//
// Same server-only caveat as scripts/seed-admin.ts: builds its own
// connection rather than importing src/lib/db (which is guarded for the
// Next.js bundler and throws when run under plain tsx).
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

import { hashPassword } from "../src/lib/auth/password";
import * as schema from "../src/lib/db/schema";

neonConfig.webSocketConstructor = ws;

async function main() {
  const connectionString = process.env.DATABASE_URL;
  const email = process.env.VERIFY_ADMIN_EMAIL;
  const password = process.env.VERIFY_ADMIN_PASSWORD;

  if (!connectionString) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  if (!email || !password) {
    console.error(
      "VERIFY_ADMIN_EMAIL and VERIFY_ADMIN_PASSWORD must be set — a dedicated " +
        "account used only by verification, kept separate from the real admin.",
    );
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
    await db
      .update(schema.users)
      .set({ failedLoginCount: 0, lockedUntil: null })
      .where(eq(schema.users.id, existing.id));
    console.log(`Verification account ${normalizedEmail} exists — lockout state reset.`);
  } else {
    const passwordHash = await hashPassword(password);
    await db.insert(schema.users).values({
      email: normalizedEmail,
      passwordHash,
      name: "Verification Account (not a real admin)",
      role: "ADMIN",
    });
    console.log(`Verification account ${normalizedEmail} created.`);
  }

  await pool.end();
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("ensure-verify-account failed:", error);
  process.exit(1);
});
