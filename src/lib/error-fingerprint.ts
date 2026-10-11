import { createHash } from "node:crypto";

/** One line, no runaway length: what we store and email as the message. */
export function cleanErrorMessage(message: unknown): string {
  const text = typeof message === "string" ? message : String(message ?? "");
  return text.replace(/\s+/g, " ").trim().slice(0, 500) || "Unknown error";
}

/**
 * Groups repeats of the same problem: same source, same route, same message
 * once volatile parts (ids, numbers, hashes) are masked. So "Post 123 not
 * found" and "Post 456 not found" on the same route are one entry.
 */
export function errorFingerprint(
  source: string,
  route: string | null | undefined,
  message: string,
): string {
  const stable = message
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "<uuid>")
    .replace(/\b[0-9a-f]{12,}\b/gi, "<hex>")
    .replace(/\d+/g, "<n>");
  return createHash("sha256")
    .update(`${source}|${route ?? ""}|${stable}`)
    .digest("hex")
    .slice(0, 32);
}
