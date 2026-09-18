import "server-only";

import { and, desc, eq } from "drizzle-orm";
import type { NeonDatabase } from "drizzle-orm/neon-serverless";

import { schema } from "@/lib/db";

type Tx =
  | NeonDatabase<typeof schema>
  | Parameters<Parameters<NeonDatabase<typeof schema>["transaction"]>[0]>[0];

export type ArticleVersionInsert = typeof schema.articleVersions.$inferInsert;
export type ArticleVersionRow = typeof schema.articleVersions.$inferSelect;
export type ArticleRow = typeof schema.articles.$inferSelect;

// Level 6.1 added find/insert/list. Level 6.2 added the draft/publish/
// rollback/archive lifecycle. Level 6.3 wired tags/cover-media via the
// shared repositories (not here). Level 6.4 adds the public
// listPublishedActiveArticles/getPublishedActiveArticleBySlug queries
// below, mirroring repositories/research.ts's 5.4 additions
// function-for-function.

export async function findArticleBySlug(tx: Tx, slug: string) {
  const [row] = await tx
    .select()
    .from(schema.articles)
    .where(eq(schema.articles.slug, slug))
    .limit(1);
  return row ?? null;
}

export async function findArticleById(tx: Tx, id: string) {
  const [row] = await tx
    .select()
    .from(schema.articles)
    .where(eq(schema.articles.id, id))
    .limit(1);
  return row ?? null;
}

export async function listArticles(tx: Tx) {
  return tx.select().from(schema.articles).orderBy(desc(schema.articles.createdAt));
}

export async function insertArticle(tx: Tx, input: { slug: string; createdBy: string }) {
  const [row] = await tx.insert(schema.articles).values(input).returning();
  if (!row) throw new Error("insertArticle: insert returned no row");
  return row;
}

export async function listVersions(
  tx: Tx,
  articleId: string,
): Promise<ArticleVersionRow[]> {
  return tx
    .select()
    .from(schema.articleVersions)
    .where(eq(schema.articleVersions.articleId, articleId))
    .orderBy(desc(schema.articleVersions.versionNumber));
}

export async function insertVersion(
  tx: Tx,
  input: ArticleVersionInsert,
): Promise<ArticleVersionRow> {
  const [row] = await tx.insert(schema.articleVersions).values(input).returning();
  if (!row) throw new Error("insertVersion: insert returned no row");
  return row;
}

export async function getDraftVersion(
  tx: Tx,
  articleId: string,
): Promise<ArticleVersionRow | null> {
  const [row] = await tx
    .select()
    .from(schema.articleVersions)
    .where(
      and(
        eq(schema.articleVersions.articleId, articleId),
        eq(schema.articleVersions.status, "DRAFT"),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getPublishedVersion(
  tx: Tx,
  articleId: string,
): Promise<ArticleVersionRow | null> {
  const [row] = await tx
    .select()
    .from(schema.articleVersions)
    .where(
      and(
        eq(schema.articleVersions.articleId, articleId),
        eq(schema.articleVersions.status, "PUBLISHED"),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getVersionById(
  tx: Tx,
  versionId: string,
): Promise<ArticleVersionRow | null> {
  const [row] = await tx
    .select()
    .from(schema.articleVersions)
    .where(eq(schema.articleVersions.id, versionId))
    .limit(1);
  return row ?? null;
}

export async function nextVersionNumber(tx: Tx, articleId: string): Promise<number> {
  const versions = await listVersions(tx, articleId);
  return (versions[0]?.versionNumber ?? 0) + 1;
}

export async function updateDraftVersion(
  tx: Tx,
  versionId: string,
  patch: Partial<ArticleVersionInsert>,
): Promise<ArticleVersionRow> {
  const [row] = await tx
    .update(schema.articleVersions)
    .set(patch)
    .where(
      and(
        eq(schema.articleVersions.id, versionId),
        eq(schema.articleVersions.status, "DRAFT"),
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
    .update(schema.articleVersions)
    .set({ status: "SUPERSEDED" })
    .where(
      and(
        eq(schema.articleVersions.id, versionId),
        eq(schema.articleVersions.status, "PUBLISHED"),
      ),
    );
}

export async function markPublished(
  tx: Tx,
  versionId: string,
): Promise<ArticleVersionRow> {
  const [row] = await tx
    .update(schema.articleVersions)
    .set({ status: "PUBLISHED", publishedAt: new Date() })
    .where(
      and(
        eq(schema.articleVersions.id, versionId),
        eq(schema.articleVersions.status, "DRAFT"),
      ),
    )
    .returning();
  if (!row) throw new Error("markPublished: no DRAFT version found to publish");
  return row;
}

export async function setItemStatus(
  tx: Tx,
  articleId: string,
  status: "ACTIVE" | "ARCHIVED",
): Promise<void> {
  await tx
    .update(schema.articles)
    .set({ status, updatedAt: new Date() })
    .where(eq(schema.articles.id, articleId));
}

export async function listPublishedActiveArticles(tx: Tx) {
  return tx
    .select({
      article: schema.articles,
      published: schema.articleVersions,
    })
    .from(schema.articles)
    .innerJoin(
      schema.articleVersions,
      and(
        eq(schema.articleVersions.articleId, schema.articles.id),
        eq(schema.articleVersions.status, "PUBLISHED"),
      ),
    )
    .where(eq(schema.articles.status, "ACTIVE"))
    .orderBy(desc(schema.articleVersions.publishedAt));
}

export async function getPublishedActiveArticleBySlug(tx: Tx, slug: string) {
  const [row] = await tx
    .select({
      article: schema.articles,
      published: schema.articleVersions,
    })
    .from(schema.articles)
    .innerJoin(
      schema.articleVersions,
      and(
        eq(schema.articleVersions.articleId, schema.articles.id),
        eq(schema.articleVersions.status, "PUBLISHED"),
      ),
    )
    .where(and(eq(schema.articles.slug, slug), eq(schema.articles.status, "ACTIVE")))
    .limit(1);
  return row ?? null;
}
