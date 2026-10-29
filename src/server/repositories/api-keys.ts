import "server-only";

import { and, desc, eq, isNull } from "drizzle-orm";

import { db, schema } from "@/lib/db";

export type ApiKeyRow = typeof schema.apiKeys.$inferSelect;

export async function insertApiKey(input: {
  name: string;
  hashedKey: string;
  scopes: string[];
  createdBy: string;
}): Promise<ApiKeyRow> {
  const [row] = await db.insert(schema.apiKeys).values(input).returning();
  if (!row) throw new Error("Failed to create API key.");
  return row;
}

export async function listApiKeys(): Promise<ApiKeyRow[]> {
  return db.select().from(schema.apiKeys).orderBy(desc(schema.apiKeys.createdAt));
}

/** An unrevoked key by its hash. */
export async function findActiveByHash(hashedKey: string): Promise<ApiKeyRow | null> {
  const [row] = await db
    .select()
    .from(schema.apiKeys)
    .where(and(eq(schema.apiKeys.hashedKey, hashedKey), isNull(schema.apiKeys.revokedAt)))
    .limit(1);
  return row ?? null;
}

export async function revokeApiKey(id: string): Promise<ApiKeyRow | null> {
  const [row] = await db
    .update(schema.apiKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(schema.apiKeys.id, id), isNull(schema.apiKeys.revokedAt)))
    .returning();
  return row ?? null;
}

export async function touchLastUsed(id: string): Promise<void> {
  await db
    .update(schema.apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(schema.apiKeys.id, id));
}
