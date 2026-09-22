import "server-only";

import { and, desc, eq, ilike } from "drizzle-orm";
import type { NeonDatabase } from "drizzle-orm/neon-serverless";

import { schema } from "@/lib/db";

type Tx =
  | NeonDatabase<typeof schema>
  | Parameters<Parameters<NeonDatabase<typeof schema>["transaction"]>[0]>[0];

export type MediaInsert = typeof schema.media.$inferInsert;
export type MediaRow = typeof schema.media.$inferSelect;
export type MediaStatus = "PENDING" | "READY" | "REJECTED";

export async function insertPendingMedia(tx: Tx, input: MediaInsert): Promise<MediaRow> {
  const [row] = await tx.insert(schema.media).values(input).returning();
  if (!row) throw new Error("insertPendingMedia: insert returned no row");
  return row;
}

export async function findById(tx: Tx, id: string): Promise<MediaRow | null> {
  const [row] = await tx
    .select()
    .from(schema.media)
    .where(eq(schema.media.id, id))
    .limit(1);
  return row ?? null;
}

/**
 * Newest-first, optionally filtered by status and/or a filename substring
 * (case-insensitive, via Postgres ILIKE — no external search dependency).
 * Uses the existing media_status_idx for the status filter.
 */
export async function listMedia(
  tx: Tx,
  options?: { status?: MediaStatus; filenameQuery?: string },
): Promise<MediaRow[]> {
  const conditions = [
    options?.status ? eq(schema.media.status, options.status) : undefined,
    options?.filenameQuery
      ? ilike(schema.media.filename, `%${options.filenameQuery}%`)
      : undefined,
  ].filter((c) => c !== undefined);

  return tx
    .select()
    .from(schema.media)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(schema.media.createdAt));
}

export async function updateAltText(
  tx: Tx,
  id: string,
  altText: string | null,
): Promise<MediaRow> {
  const [row] = await tx
    .update(schema.media)
    .set({ altText })
    .where(eq(schema.media.id, id))
    .returning();
  if (!row) throw new Error("updateAltText: no row updated");
  return row;
}

export async function markReady(
  tx: Tx,
  id: string,
  patch: {
    mimeType: string;
    sizeBytes: number;
    width: number | null;
    height: number | null;
  },
): Promise<MediaRow> {
  const [row] = await tx
    .update(schema.media)
    .set({ ...patch, status: "READY", validatedAt: new Date() })
    .where(eq(schema.media.id, id))
    .returning();
  if (!row) throw new Error("markReady: no row updated");
  return row;
}

export async function markRejected(tx: Tx, id: string): Promise<void> {
  await tx
    .update(schema.media)
    .set({ status: "REJECTED", validatedAt: new Date() })
    .where(eq(schema.media.id, id));
}
