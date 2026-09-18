import "server-only";

import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { plainTextToTiptapDoc } from "@/lib/validation/project";
import type { ArticleCreateInput } from "@/lib/validation/article";

import * as articlesRepo from "../repositories/articles";

export class ArticleServiceError extends Error {}

interface Actor {
  id: string;
  type: "HUMAN" | "AI";
}

// Level 6.1 (data layer + admin list/create) only — createArticle and
// listArticlesOverview. saveDraft, publishArticle, rollbackArticle,
// archiveArticle, tags, and cover-media mirror the equivalent functions
// in services/research.ts and land in 6.2/6.3.

/** Creates a new article + its first DRAFT version, in one transaction. */
export async function createArticle(input: ArticleCreateInput, actor: Actor) {
  return db.transaction(async (tx) => {
    const existing = await articlesRepo.findArticleBySlug(tx, input.slug);
    if (existing) {
      throw new ArticleServiceError(
        `An article with slug "${input.slug}" already exists.`,
      );
    }

    const article = await articlesRepo.insertArticle(tx, {
      slug: input.slug,
      createdBy: actor.id,
    });
    const version = await articlesRepo.insertVersion(tx, {
      articleId: article.id,
      versionNumber: 1,
      status: "DRAFT",
      title: input.title,
      excerpt: input.excerpt,
      // Empty Tiptap doc — content is written from Level 6.2's editor.
      content: plainTextToTiptapDoc(""),
      createdByType: actor.type,
      createdById: actor.id,
      generationMode: actor.type === "HUMAN" ? "HUMAN_CREATED" : "AI_GENERATED",
    });

    await logAudit({
      userId: actor.id,
      action: "article.version.created",
      resourceType: "article",
      resourceId: article.id,
      metadata: { versionId: version.id, versionNumber: version.versionNumber },
    });

    return { article, version };
  });
}

export async function listArticlesOverview() {
  const items = await articlesRepo.listArticles(db);
  return Promise.all(
    items.map(async (article) => {
      const versions = await articlesRepo.listVersions(db, article.id);
      return {
        article,
        draft: versions.find((v) => v.status === "DRAFT") ?? null,
        published: versions.find((v) => v.status === "PUBLISHED") ?? null,
      };
    }),
  );
}
