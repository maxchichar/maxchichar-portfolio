import { createHash, randomBytes } from "node:crypto";

// Content API keys (Phase 11.2). A key is shown once when it's created; only
// its SHA-256 hash is stored (keys are 32 random bytes, so a fast hash is
// enough). Publishing is never grantable: the database itself rejects the
// content:publish scope (api_keys_no_publish_scope).

export const API_KEY_PREFIX = "cmx_";

export {
  GRANTABLE_SCOPES,
  normaliseScopes,
  SCOPE_LABELS,
  type ApiScope,
} from "./api-scopes";

export function generateApiKey(): string {
  return `${API_KEY_PREFIX}${randomBytes(32).toString("base64url")}`;
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/** The key from an `Authorization: Bearer cmx_…` header, or null. */
export function parseBearerKey(header: string | null): string | null {
  const match = /^Bearer\s+(\S+)\s*$/i.exec(header ?? "");
  const key = match?.[1];
  if (!key || !key.startsWith(API_KEY_PREFIX) || key.length > 200) return null;
  return key;
}
