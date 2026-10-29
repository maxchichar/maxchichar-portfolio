// Content API permissions. Safe to import in the browser (the admin key form);
// key generation and hashing live in api-keys.ts, which needs node:crypto.

export const GRANTABLE_SCOPES = ["content:read", "content:draft"] as const;
export type ApiScope = (typeof GRANTABLE_SCOPES)[number];

export const SCOPE_LABELS: Record<ApiScope, string> = {
  "content:read": "Read articles and drafts",
  "content:draft": "Create and edit drafts",
};

/** Keeps known scopes only, in a fixed order; content:draft implies read. */
export function normaliseScopes(input: unknown[]): ApiScope[] {
  const wanted = new Set(input.filter((s): s is string => typeof s === "string"));
  if (wanted.has("content:draft")) wanted.add("content:read");
  return GRANTABLE_SCOPES.filter((scope) => wanted.has(scope));
}
