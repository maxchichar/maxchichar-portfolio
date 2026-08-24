import "server-only";

import { eq } from "drizzle-orm";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

import { logAudit } from "@/lib/audit";
import { db, schema } from "@/lib/db";

import { verifyPassword } from "./password";

// Auth.js v5 + Credentials provider + Argon2id + JWT sessions.
//
// Changed from the original "database sessions" decision: Auth.js does
// not support Credentials + database sessions together — verified against
// @auth/core's source (lib/utils/assert.ts throws UnsupportedStrategy
// whenever session.strategy === "database" and every configured provider
// is Credentials). JWT is the fully-supported path for this combination,
// so there's no adapter here — JWT sessions don't use one, and there's no
// OAuth account-linking that would need one either.
//
// The failed-login lockout below is unaffected by this change: it was
// already designed as DB-backed counters on `users` (failedLoginCount /
// lockedUntil), not an in-memory counter, and it lives entirely inside
// `authorize()`, which runs the same way regardless of session strategy.

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours, explicit — shorter than Auth.js's 30-day default, reasonable for an admin panel

const LOGIN_LOCKOUT_THRESHOLD = 5;
const LOGIN_LOCKOUT_DURATION_MS = 15 * 60 * 1000;

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE_SECONDS },
  pages: { signIn: "/admin/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;

        const email = parsed.data.email.toLowerCase();
        const { password } = parsed.data;

        const [user] = await db
          .select()
          .from(schema.users)
          .where(eq(schema.users.email, email))
          .limit(1);

        // No such user — generic failure, same shape as a wrong password.
        // Login errors must never reveal whether an email is registered.
        if (!user) return null;

        if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
          return null;
        }

        const validPassword = await verifyPassword(user.passwordHash, password);

        if (!validPassword) {
          const failedLoginCount = user.failedLoginCount + 1;
          const shouldLock = failedLoginCount >= LOGIN_LOCKOUT_THRESHOLD;

          await db
            .update(schema.users)
            .set({
              failedLoginCount,
              lockedUntil: shouldLock
                ? new Date(Date.now() + LOGIN_LOCKOUT_DURATION_MS)
                : user.lockedUntil,
            })
            .where(eq(schema.users.id, user.id));

          await logAudit({
            userId: user.id,
            action: shouldLock ? "auth.locked" : "auth.login_failed",
          });

          return null;
        }

        await db
          .update(schema.users)
          .set({ failedLoginCount: 0, lockedUntil: null })
          .where(eq(schema.users.id, user.id));

        await logAudit({ userId: user.id, action: "auth.login" });

        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      return session;
    },
  },
});
