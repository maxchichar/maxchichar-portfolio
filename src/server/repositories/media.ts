import "server-only";

import { and, desc, eq, ilike, or } from "drizzle-orm";
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

export interface MediaReferenceCheck {
  projects: boolean;
  research: boolean;
  articles: boolean;
  evidence: boolean;
  siteSettings: boolean;
}

/**
 * Checked against every FK column that actually references media.id in
 * the schema (grep-verified, not assumed): project_versions.cover_media_id,
 * research_versions.cover_media_id, article_versions.cover_media_id,
 * evidence.media_id, and site_settings.{logo,favicon,og_default}_media_id.
 * All seven are plain `references()` with no onDelete action, so Postgres
 * itself would reject a DELETE while any of them still point here — this
 * is the pre-check that turns that into a clear, attributable message
 * instead of a raw constraint-violation error.
 *
 * Checks EVERY version row (draft/published/superseded), not just the
 * current draft/published — a superseded version's stored cover is still
 * a real reference the database enforces, even though it's no longer the
 * "active" one.
 */
export async function checkReferences(tx: Tx, mediaId: string): Promise<MediaReferenceCheck> {
  const [[projectRow], [researchRow], [articleRow], [evidenceRow], [settingsRow]] =
    await Promise.all([
      tx
        .select({ id: schema.projectVersions.id })
        .from(schema.projectVersions)
        .where(eq(schema.projectVersions.coverMediaId, mediaId))
        .limit(1),
      tx
        .select({ id: schema.researchVersions.id })
        .from(schema.researchVersions)
        .where(eq(schema.researchVersions.coverMediaId, mediaId))
        .limit(1),
      tx
        .select({ id: schema.articleVersions.id })
        .from(schema.articleVersions)
        .where(eq(schema.articleVersions.coverMediaId, mediaId))
        .limit(1),
      tx
        .select({ id: schema.evidence.id })
        .from(schema.evidence)
        .where(eq(schema.evidence.mediaId, mediaId))
        .limit(1),
      tx
        .select({ id: schema.siteSettings.id })
        .from(schema.siteSettings)
        .where(
          or(
            eq(schema.siteSettings.logoMediaId, mediaId),
            eq(schema.siteSettings.faviconMediaId, mediaId),
            eq(schema.siteSettings.ogDefaultMediaId, mediaId),
          ),
        )
        .limit(1),
    ]);

  return {
    projects: Boolean(projectRow),
    research: Boolean(researchRow),
    articles: Boolean(articleRow),
    evidence: Boolean(evidenceRow),
    siteSettings: Boolean(settingsRow),
  };
}

export async function deleteById(tx: Tx, id: string): Promise<MediaRow> {
  const [row] = await tx.delete(schema.media).where(eq(schema.media.id, id)).returning();
  if (!row) throw new Error("deleteById: no row deleted — media not found.");
  return row;
}
