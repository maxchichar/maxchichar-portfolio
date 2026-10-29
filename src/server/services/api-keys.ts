import "server-only";

import { after } from "next/server";

import {
  generateApiKey,
  hashApiKey,
  normaliseScopes,
  parseBearerKey,
  type ApiScope,
} from "@/lib/api-keys";
import { logAudit } from "@/lib/audit";
import { apiError } from "@/lib/content-api";

import * as apiKeysRepo from "../repositories/api-keys";

export class ApiKeyServiceError extends Error {}

/** Creates a key and returns it in full. This is the only time it is shown. */
export async function createApiKey(
  input: { name: string; scopes: unknown[] },
  actor: { id: string },
) {
  const name = input.name.trim().slice(0, 80);
  if (!name) throw new ApiKeyServiceError("Give the key a name.");
  const scopes = normaliseScopes(input.scopes);
  if (scopes.length === 0)
    throw new ApiKeyServiceError("Choose at least one permission.");

  const key = generateApiKey();
  const row = await apiKeysRepo.insertApiKey({
    name,
    hashedKey: hashApiKey(key),
    scopes,
    createdBy: actor.id,
  });
  await logAudit({
    userId: actor.id,
    action: "api_key.created",
    resourceType: "api_key",
    resourceId: row.id,
    metadata: { name, scopes },
  });
  return { key, row };
}

export async function listApiKeys() {
  return apiKeysRepo.listApiKeys();
}

export async function revokeApiKey(id: string, actor: { id: string }) {
  const row = await apiKeysRepo.revokeApiKey(id);
  if (row) {
    await logAudit({
      userId: actor.id,
      action: "api_key.revoked",
      resourceType: "api_key",
      resourceId: id,
      metadata: { name: row.name },
    });
  }
  return row;
}

// Per server instance, per key: a burst cap, not a quota.
const MAX_REQUESTS_PER_MINUTE = 60;
const recent = new Map<string, number[]>();
const LAST_USED_EVERY_MS = 5 * 60_000;

export interface ApiCaller {
  keyId: string;
  keyName: string;
  /** Saved versions record the key's creator and that an AI client wrote them. */
  actor: { id: string; type: "AI"; source: string };
}

/**
 * Checks the request's API key and scope. Returns the caller, or the error
 * response to send (401 no/unknown key, 403 missing scope, 429 too many).
 */
export async function authenticate(
  request: Request,
  scope: ApiScope,
): Promise<{ caller: ApiCaller } | { response: Response }> {
  const key = parseBearerKey(request.headers.get("authorization"));
  const row = key ? await apiKeysRepo.findActiveByHash(hashApiKey(key)) : null;
  if (!row || !row.createdBy) {
    return {
      response: apiError(401, "unauthorized", "Missing, unknown or revoked API key.", {
        "WWW-Authenticate": 'Bearer realm="content-api"',
      }),
    };
  }
  if (!row.scopes.includes(scope)) {
    return {
      response: apiError(
        403,
        "forbidden",
        `This key doesn't have the ${scope} permission.`,
      ),
    };
  }

  const now = Date.now();
  const times = (recent.get(row.id) ?? []).filter((t) => now - t < 60_000);
  if (times.length >= MAX_REQUESTS_PER_MINUTE) {
    return {
      response: apiError(
        429,
        "rate_limited",
        "Too many requests. Try again in a minute.",
        {
          "Retry-After": "60",
        },
      ),
    };
  }
  times.push(now);
  recent.set(row.id, times);

  if (!row.lastUsedAt || now - row.lastUsedAt.getTime() > LAST_USED_EVERY_MS) {
    after(() => apiKeysRepo.touchLastUsed(row.id));
  }

  return {
    caller: {
      keyId: row.id,
      keyName: row.name,
      actor: { id: row.createdBy, type: "AI", source: `content-api:${row.name}` },
    },
  };
}
