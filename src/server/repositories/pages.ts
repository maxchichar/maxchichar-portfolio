import "server-only";

import { and, desc, eq } from "drizzle-orm";
import type { NeonDatabase } from "drizzle-orm/neon-serverless";

import { schema } from "@/lib/db";

type Tx =
  | NeonDatabase<typeof schema>
  | Parameters<Parameters<NeonDatabase<typeof schema>["transaction"]>[0]>[0];

export type PageRow = typeof schema.pages.$inferSelect;
export type PageVersionInsert = typeof schema.pageVersions.$inferInsert;
export type PageVersionRow = typeof schema.pageVersions.$inferSelect;

// Level 8.1 added find/insert/list. Level 8.2 adds the rest below,
// mirroring repositories/research.ts's 5.2 additions — with one
// deliberate omission: no setItemStatus. Unlike projects/research/
// articles, the pages item table has no status column at all (schema.ts:
// just { id, slug, createdAt }) — archiving a fixed page like "about"
// isn't a concept the schema supports, and doesn't make sense for one
// either. Rollback IS included: page_versions.based_on_version_id exists
// and supports the identical restore-forward pattern.

export async function findPageBySlug(tx: Tx, slug: string): Promise<PageRow | null> {
  const [row] = await tx
    .select()
    .from(schema.pages)
    .where(eq(schema.pages.slug, slug))
    .limit(1);
  return row ?? null;
}

export async function findPageById(tx: Tx, id: string): Promise<PageRow | null> {
  const [row] = await tx
    .select()
    .from(schema.pages)
    .where(eq(schema.pages.id, id))
    .limit(1);
  return row ?? null;
}

export async function listPages(tx: Tx): Promise<PageRow[]> {
  return tx.select().from(schema.pages).orderBy(desc(schema.pages.createdAt));
}

/** No createdBy — the pages item table doesn't track one (unlike projects/research/articles). */
export async function insertPage(tx: Tx, slug: string): Promise<PageRow> {
  const [row] = await tx.insert(schema.pages).values({ slug }).returning();
  if (!row) throw new Error("insertPage: insert returned no row");
  return row;
}

export async function listVersions(tx: Tx, pageId: string): Promise<PageVersionRow[]> {
  return tx
    .select()
    .from(schema.pageVersions)
    .where(eq(schema.pageVersions.pageId, pageId))
    .orderBy(desc(schema.pageVersions.versionNumber));
}

export async function insertVersion(
  tx: Tx,
  input: PageVersionInsert,
): Promise<PageVersionRow> {
  const [row] = await tx.insert(schema.pageVersions).values(input).returning();
  if (!row) throw new Error("insertVersion: insert returned no row");
  return row;
}

export async function getDraftVersion(
  tx: Tx,
  pageId: string,
): Promise<PageVersionRow | null> {
  const [row] = await tx
    .select()
    .from(schema.pageVersions)
    .where(
      and(
        eq(schema.pageVersions.pageId, pageId),
        eq(schema.pageVersions.status, "DRAFT"),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getPublishedVersion(
  tx: Tx,
  pageId: string,
): Promise<PageVersionRow | null> {
  const [row] = await tx
    .select()
    .from(schema.pageVersions)
    .where(
      and(
        eq(schema.pageVersions.pageId, pageId),
        eq(schema.pageVersions.status, "PUBLISHED"),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getVersionById(
  tx: Tx,
  versionId: string,
): Promise<PageVersionRow | null> {
  const [row] = await tx
    .select()
    .from(schema.pageVersions)
    .where(eq(schema.pageVersions.id, versionId))
    .limit(1);
  return row ?? null;
}

export async function nextVersionNumber(tx: Tx, pageId: string): Promise<number> {
  const versions = await listVersions(tx, pageId);
  return (versions[0]?.versionNumber ?? 0) + 1;
}

export async function updateDraftVersion(
  tx: Tx,
  versionId: string,
  patch: Partial<PageVersionInsert>,
): Promise<PageVersionRow> {
  const [row] = await tx
    .update(schema.pageVersions)
    .set(patch)
    .where(
      and(eq(schema.pageVersions.id, versionId), eq(schema.pageVersions.status, "DRAFT")),
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
    .update(schema.pageVersions)
    .set({ status: "SUPERSEDED" })
    .where(
      and(
        eq(schema.pageVersions.id, versionId),
        eq(schema.pageVersions.status, "PUBLISHED"),
      ),
    );
}

export async function markPublished(tx: Tx, versionId: string): Promise<PageVersionRow> {
  const [row] = await tx
    .update(schema.pageVersions)
    .set({ status: "PUBLISHED", publishedAt: new Date() })
    .where(
      and(eq(schema.pageVersions.id, versionId), eq(schema.pageVersions.status, "DRAFT")),
    )
    .returning();
  if (!row) throw new Error("markPublished: no DRAFT version found to publish");
  return row;
}
