import "server-only";

import { eq } from "drizzle-orm";
import type { NeonDatabase } from "drizzle-orm/neon-serverless";

import { schema } from "@/lib/db";
import type { SiteDocumentKey } from "@/lib/db/schema";

type Tx =
  | NeonDatabase<typeof schema>
  | Parameters<Parameters<NeonDatabase<typeof schema>["transaction"]>[0]>[0];

/** The document in a slot joined with its media row, or null. */
export async function findDocument(tx: Tx, key: SiteDocumentKey) {
  const [row] = await tx
    .select({
      key: schema.siteDocuments.key,
      updatedAt: schema.siteDocuments.updatedAt,
      media: schema.media,
    })
    .from(schema.siteDocuments)
    .innerJoin(schema.media, eq(schema.media.id, schema.siteDocuments.mediaId))
    .where(eq(schema.siteDocuments.key, key))
    .limit(1);
  return row ?? null;
}

export async function setDocument(
  tx: Tx,
  key: SiteDocumentKey,
  mediaId: string,
  actorId: string,
) {
  await tx
    .insert(schema.siteDocuments)
    .values({ key, mediaId, updatedBy: actorId, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: schema.siteDocuments.key,
      set: { mediaId, updatedBy: actorId, updatedAt: new Date() },
    });
}

export async function clearDocument(tx: Tx, key: SiteDocumentKey) {
  await tx.delete(schema.siteDocuments).where(eq(schema.siteDocuments.key, key));
}
