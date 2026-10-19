import { argon2idAsync } from "@noble/hashes/argon2.js";
import { timingSafeEqual } from "node:crypto";

// Cloudflare build alias for the native binding. Preserve existing Argon2id
// PHC hashes and their work factors; never downgrade passwords for CPU limits.
export async function verify(encoded: string, password: string): Promise<boolean> {
  const match =
    /^\$argon2id\$v=19\$m=(\d+),t=(\d+),p=(\d+)\$([A-Za-z0-9+/]+)\$([A-Za-z0-9+/]+)$/.exec(
      encoded,
    );
  if (!match) return false;
  const [, memory, iterations, lanes, salt64, digest64] = match;
  const m = Number(memory),
    t = Number(iterations),
    p = Number(lanes);
  // Bound malformed/stale DB values before allocating memory in a 128 MiB isolate.
  // Unsupported hashes fail closed and require an operator review, never rehashing.
  if (m < 8 * p || m > 65536 || t < 1 || t > 10 || p < 1 || p > 16) return false;
  const salt = Buffer.from(salt64!, "base64");
  const expected = Buffer.from(digest64!, "base64");
  if (salt.length < 8 || expected.length < 16 || expected.length > 64) return false;
  const actual = await argon2idAsync(password, salt, {
    m,
    t,
    p,
    dkLen: expected.length,
    version: 0x13,
    maxmem: 64 * 1024 * 1024,
  });
  try {
    return timingSafeEqual(actual, expected);
  } finally {
    actual.fill(0);
  }
}

export async function hash(): Promise<string> {
  // Admin seeding runs in Node through tsx and keeps the original native binding.
  throw new Error("Create password hashes with npm run seed:admin in Node.js.");
}
