import "server-only";

import { desc, eq } from "drizzle-orm";
import type { NeonDatabase } from "drizzle-orm/neon-serverless";

import { schema } from "@/lib/db";

type Tx =
  | NeonDatabase<typeof schema>
  | Parameters<Parameters<NeonDatabase<typeof schema>["transaction"]>[0]>[0];

export type PageRow = typeof schema.pages.$inferSelect;
export type PageVersionInsert = typeof schema.pageVersions.$inferInsert;
export type PageVersionRow = typeof schema.pageVersions.$inferSelect;

// Level 8.1 (data layer + fixed-row initialization) only. Unlike
// projects/research/articles, pages has no "status" (archive/unarchive
// don't apply to a fixed page), "featured", "sortOrder", or "createdBy" —
// the item table is just { id, slug, createdAt }, per schema.ts. Draft
// editing, publish, and rollback repository functions mirror the
// research/articles pattern and land in Level 8.2 alongside the editor
// that uses them.

export async function findPageBySlug(tx: Tx, slug: string): Promise<PageRow | null> {
  const [row] = await tx
    .select()
    .from(schema.pages)
    .where(eq(schema.pages.slug, slug))
    .limit(1);
  return row ?? null;
}

export async function findPageById(tx: Tx, id: string): Promise<PageRow | null> {
  const [row] = await tx.select().from(schema.pages).where(eq(schema.pages.id, id)).limit(1);
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
