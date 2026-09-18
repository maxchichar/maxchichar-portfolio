import "server-only";

import { desc, eq } from "drizzle-orm";
import type { NeonDatabase } from "drizzle-orm/neon-serverless";

import { schema } from "@/lib/db";

type Tx =
  | NeonDatabase<typeof schema>
  | Parameters<Parameters<NeonDatabase<typeof schema>["transaction"]>[0]>[0];

export type ArticleVersionInsert = typeof schema.articleVersions.$inferInsert;
export type ArticleVersionRow = typeof schema.articleVersions.$inferSelect;
export type ArticleRow = typeof schema.articles.$inferSelect;

// Level 6.1 (data layer + admin list/create) only — find/insert/list.
// Draft-editing, publish, rollback, and archive repository functions
// mirror repositories/research.ts's 5.2 additions and land in 6.2.

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
