import { hash, verify } from "@node-rs/argon2";

// Argon2id (the package's default algorithm) — locked decision, FINAL
// LOCKED SPECIFICATION §D.5. @node-rs/argon2 is a native Rust binding with
// prebuilt binaries, chosen over the `argon2` package specifically because
// it doesn't require a node-gyp compile step in serverless build environments.
//
// Deliberately no `import "server-only"` here (unlike the rest of
// src/lib/auth): this module is also imported by scripts/seed-admin.ts,
// which runs via plain tsx outside the Next.js bundler, and `server-only`
// throws unconditionally in that context. The native Argon2 binding can't
// run in a browser regardless, so a stray client import still fails loudly
// at bundle time, just via a different, still-obvious error.

export async function hashPassword(password: string): Promise<string> {
  return hash(password);
}

export async function verifyPassword(
  hashedPassword: string,
  password: string,
): Promise<boolean> {
  return verify(hashedPassword, password);
}
