import "server-only";
import { createHash } from "node:crypto";

/**
 * Hashes raw IP using SHA-256 so raw IP addresses are never persisted in the database.
 */
export function hashIp(ip: string): string {
  return createHash("sha256").update(ip.trim()).digest("hex");
}
