import "server-only";

import { logAudit } from "@/lib/audit";
import {
  requestContent,
  serializeArticle,
  type CreateArticleRequest,
  type UpdateDraftRequest,
} from "@/lib/content-api";
import { resolveCanonicalUrl } from "@/lib/metadata";
import { articleDraftUpdateSchema } from "@/lib/validation/article";

import type { ApiCaller } from "./api-keys";
import * as articlesService from "./articles";

// Phase 11.2: what the Content API can do with articles. Read everything,
// create drafts, edit drafts. Nothing here publishes, archives or deletes.

export class ContentApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

const siteUrl = () => resolveCanonicalUrl("/").replace(/\/$/, "");

export async function listArticles() {
  const items = await articlesService.listArticlesOverview();
  return items.map(({ article, draft, published }) => ({
    id: article.id,
    slug: article.slug,
    status: article.status,
    title: (draft ?? published)?.title ?? "",
    hasDraft: Boolean(draft),
    isPublished: Boolean(published),
    publishedAt: published?.publishedAt?.toISOString() ?? null,
    url: published ? `${siteUrl()}/writing/${article.slug}` : null,
  }));
}

export async function getArticle(id: string) {
  const state = await articlesService.getArticleFullState(id);
  if (!state) throw new ContentApiError(404, "not_found", "No article with that id.");
  return serializeArticle(state, siteUrl());
}

/** Validates the merged draft the same way the admin editor does, then saves. */
async function saveMergedDraft(
  articleId: string,
  merged: Record<string, unknown>,
  caller: ApiCaller,
) {
  const parsed = articleDraftUpdateSchema.safeParse(merged);
  if (!parsed.success) {
    throw new ContentApiError(
      422,
      "invalid_content",
      parsed.error.issues[0]?.message ?? "Invalid content.",
    );
  }
  await articlesService.saveDraft(articleId, parsed.data, caller.actor);
}

function serviceError(error: unknown): never {
  if (error instanceof articlesService.ArticleServiceError) {
    throw new ContentApiError(409, "conflict", error.message);
  }
  throw error;
}

export async function createArticle(input: CreateArticleRequest, caller: ApiCaller) {
  const { article } = await articlesService
    .createArticle(
      { slug: input.slug, title: input.title, excerpt: input.excerpt },
      caller.actor,
    )
    .catch(serviceError);

  const content = requestContent(input);
  if (content !== undefined || input.category !== undefined || input.tags) {
    const state = await articlesService.getArticleFullState(article.id);
    await saveMergedDraft(
      article.id,
      {
        title: input.title,
        excerpt: input.excerpt,
        category: input.category ?? null,
        content: content ?? state?.draft?.content,
        tags: input.tags ?? [],
      },
      caller,
    ).catch(serviceError);
  }

  await logAudit({
    userId: caller.actor.id,
    action: "content_api.article.created",
    resourceType: "article",
    resourceId: article.id,
    metadata: { keyId: caller.keyId, slug: input.slug },
  });
  return getArticle(article.id);
}

/** Edits the article's draft, starting one from the live version if needed. */
export async function updateDraft(
  id: string,
  input: UpdateDraftRequest,
  caller: ApiCaller,
) {
  const existing = await articlesService.getArticleFullState(id);
  if (!existing) throw new ContentApiError(404, "not_found", "No article with that id.");
  if (existing.article.status === "ARCHIVED") {
    throw new ContentApiError(409, "archived", "This article is archived.");
  }

  const draft = await articlesService.ensureDraft(id, caller.actor).catch(serviceError);
  const content = requestContent(input);
  await saveMergedDraft(
    id,
    {
      title: input.title ?? draft.title,
      excerpt: input.excerpt ?? draft.excerpt,
      category: input.category !== undefined ? input.category : draft.category,
      content: content ?? draft.content,
      tags: input.tags ?? existing.tags.map((t) => t.name),
    },
    caller,
  ).catch(serviceError);

  await logAudit({
    userId: caller.actor.id,
    action: "content_api.draft.updated",
    resourceType: "article",
    resourceId: id,
    metadata: { keyId: caller.keyId, fields: Object.keys(input) },
  });
  return getArticle(id);
}
