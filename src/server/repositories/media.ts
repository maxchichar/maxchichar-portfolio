import "server-only";

import { desc, eq } from "drizzle-orm";
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

/** Newest-first, optionally filtered by status. Uses the existing media_status_idx. */
export async function listMedia(
  tx: Tx,
  options?: { status?: MediaStatus },
): Promise<MediaRow[]> {
  return tx
    .select()
    .from(schema.media)
    .where(options?.status ? eq(schema.media.status, options.status) : undefined)
    .orderBy(desc(schema.media.createdAt));
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
