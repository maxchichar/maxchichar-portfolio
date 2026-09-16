import "server-only";

import { and, desc, eq } from "drizzle-orm";
import type { NeonDatabase } from "drizzle-orm/neon-serverless";

import { schema } from "@/lib/db";

type Tx =
  | NeonDatabase<typeof schema>
  | Parameters<Parameters<NeonDatabase<typeof schema>["transaction"]>[0]>[0];

export type ResearchVersionInsert = typeof schema.researchVersions.$inferInsert;
export type ResearchVersionRow = typeof schema.researchVersions.$inferSelect;
export type ResearchRow = typeof schema.research.$inferSelect;

// Level 5.1 (data layer + admin list/create) added find/insert/list.
// Level 5.2 (editor + lifecycle) adds the rest below, mirroring
// repositories/projects.ts function-for-function. Tags/evidence/cover-media
// linkage repository functions are still not here — 5.3 scope.

export async function findResearchBySlug(tx: Tx, slug: string) {
  const [row] = await tx
    .select()
    .from(schema.research)
    .where(eq(schema.research.slug, slug))
    .limit(1);
  return row ?? null;
}

export async function findResearchById(tx: Tx, id: string) {
  const [row] = await tx
    .select()
    .from(schema.research)
    .where(eq(schema.research.id, id))
    .limit(1);
  return row ?? null;
}

export async function listResearch(tx: Tx) {
  return tx.select().from(schema.research).orderBy(desc(schema.research.createdAt));
}

export async function insertResearch(tx: Tx, input: { slug: string; createdBy: string }) {
  const [row] = await tx.insert(schema.research).values(input).returning();
  if (!row) throw new Error("insertResearch: insert returned no row");
  return row;
}

export async function listVersions(
  tx: Tx,
  researchId: string,
): Promise<ResearchVersionRow[]> {
  return tx
    .select()
    .from(schema.researchVersions)
    .where(eq(schema.researchVersions.researchId, researchId))
    .orderBy(desc(schema.researchVersions.versionNumber));
}

export async function insertVersion(
  tx: Tx,
  input: ResearchVersionInsert,
): Promise<ResearchVersionRow> {
  const [row] = await tx.insert(schema.researchVersions).values(input).returning();
  if (!row) throw new Error("insertVersion: insert returned no row");
  return row;
}

export async function getDraftVersion(
  tx: Tx,
  researchId: string,
): Promise<ResearchVersionRow | null> {
  const [row] = await tx
    .select()
    .from(schema.researchVersions)
    .where(
      and(
        eq(schema.researchVersions.researchId, researchId),
        eq(schema.researchVersions.status, "DRAFT"),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getPublishedVersion(
  tx: Tx,
  researchId: string,
): Promise<ResearchVersionRow | null> {
  const [row] = await tx
    .select()
    .from(schema.researchVersions)
    .where(
      and(
        eq(schema.researchVersions.researchId, researchId),
        eq(schema.researchVersions.status, "PUBLISHED"),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getVersionById(
  tx: Tx,
  versionId: string,
): Promise<ResearchVersionRow | null> {
  const [row] = await tx
    .select()
    .from(schema.researchVersions)
    .where(eq(schema.researchVersions.id, versionId))
    .limit(1);
  return row ?? null;
}

export async function nextVersionNumber(tx: Tx, researchId: string): Promise<number> {
  const versions = await listVersions(tx, researchId);
  return (versions[0]?.versionNumber ?? 0) + 1;
}

export async function updateDraftVersion(
  tx: Tx,
  versionId: string,
  patch: Partial<ResearchVersionInsert>,
): Promise<ResearchVersionRow> {
  const [row] = await tx
    .update(schema.researchVersions)
    .set(patch)
    .where(
      and(
        eq(schema.researchVersions.id, versionId),
        eq(schema.researchVersions.status, "DRAFT"),
      ),
    )
    .returning();
  if (!row) {
    throw new Error(
      "updateDraftVersion: no row updated — version is not DRAFT (or does not exist). Published versions are immutable.",
    );
  }
  return row;
}

export async function markSuperseded(tx: Tx, versionId: string): Promise<void> {
  await tx
    .update(schema.researchVersions)
    .set({ status: "SUPERSEDED" })
    .where(
      and(
        eq(schema.researchVersions.id, versionId),
        eq(schema.researchVersions.status, "PUBLISHED"),
      ),
    );
}

export async function markPublished(
  tx: Tx,
  versionId: string,
): Promise<ResearchVersionRow> {
  const [row] = await tx
    .update(schema.researchVersions)
    .set({ status: "PUBLISHED", publishedAt: new Date() })
    .where(
      and(
        eq(schema.researchVersions.id, versionId),
        eq(schema.researchVersions.status, "DRAFT"),
      ),
    )
    .returning();
  if (!row) throw new Error("markPublished: no DRAFT version found to publish");
  return row;
}

export async function setItemStatus(
  tx: Tx,
  researchId: string,
  status: "ACTIVE" | "ARCHIVED",
): Promise<void> {
  await tx
    .update(schema.research)
    .set({ status, updatedAt: new Date() })
    .where(eq(schema.research.id, researchId));
}
