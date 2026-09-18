import "server-only";

import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { plainTextToTiptapDoc, tiptapDocToPlainText } from "@/lib/validation/project";
import type {
  ArticleCreateInput,
  ArticleDraftUpdateInput,
} from "@/lib/validation/article";

import { publicUrlFor } from "@/lib/storage/r2";
import * as articlesRepo from "../repositories/articles";
import * as mediaRepo from "../repositories/media";
import * as tagsRepo from "../repositories/tags";

export class ArticleServiceError extends Error {}

interface Actor {
  id: string;
  type: "HUMAN" | "AI";
}

// Level 6.1 added createArticle and listArticlesOverview. Level 6.2 added
// the draft/publish/rollback/archive lifecycle. Level 6.3 wired articles
// into the shared tags/media infrastructure. Level 6.4 adds the public
// listPublicArticlesOverview/getPublicArticleDetail queries below,
// mirroring services/research.ts's 5.4 additions function-for-function.
// Articles don't get evidence
// (docs/SPECIFICATION.md), so there's no addEvidence/removeEvidence here.

const WORDS_PER_MINUTE = 200;

/** Word count / 200wpm, rounded up, minimum 1 — computed from actual content. */
function estimateReadingTime(content: unknown): number {
  const text = tiptapDocToPlainText(content);
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

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
      readingTime: estimateReadingTime(plainTextToTiptapDoc("")),
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

/**
 * Returns the article's current open draft, creating one by cloning the
 * published version if none exists yet (restore-forward pattern — the
 * published row is never mutated). Idempotent.
 */
export async function ensureDraft(articleId: string, actor: Actor) {
  return db.transaction(async (tx) => {
    const existingDraft = await articlesRepo.getDraftVersion(tx, articleId);
    if (existingDraft) return existingDraft;

    const published = await articlesRepo.getPublishedVersion(tx, articleId);
    if (!published) {
      throw new ArticleServiceError(
        "No draft and no published version exist for this article — data integrity issue.",
      );
    }

    const nextNumber = await articlesRepo.nextVersionNumber(tx, articleId);
    const draft = await articlesRepo.insertVersion(tx, {
      articleId,
      versionNumber: nextNumber,
      status: "DRAFT",
      basedOnVersionId: published.id,
      title: published.title,
      excerpt: published.excerpt,
      content: published.content,
      readingTime: published.readingTime,
      category: published.category,
      coverMediaId: published.coverMediaId,
      seo: published.seo,
      createdByType: actor.type,
      createdById: actor.id,
      generationMode: actor.type === "HUMAN" ? "HUMAN_EDITED" : "AI_ASSISTED",
    });

    await logAudit({
      userId: actor.id,
      action: "article.version.created",
      resourceType: "article",
      resourceId: articleId,
      metadata: { versionId: draft.id, basedOnVersionId: published.id },
    });

    return draft;
  });
}

/** Mutates the current DRAFT version in place. Never touches PUBLISHED rows. */
// `actor` isn't used yet — kept in the signature for when AUTHOR-scoped
// ownership checks are added, matching services/research.ts's saveDraft.
export async function saveDraft(
  articleId: string,
  patch: ArticleDraftUpdateInput,
  _actor: Actor,
) {
  void _actor;
  return db.transaction(async (tx) => {
    const draft = await articlesRepo.getDraftVersion(tx, articleId);
    if (!draft) {
      throw new ArticleServiceError(
        "No open draft for this article — call ensureDraft first.",
      );
    }

    // A client-supplied coverMediaId is untrusted input, not proof of a
    // real, validated upload — verify the row actually exists and passed
    // the confirm-stage byte validation (status=READY) before accepting
    // it. Never trust that a submitted id was legitimately obtained from
    // the upload flow just because it's a well-formed UUID.
    let coverMediaId: string | null = null;
    if (patch.coverMediaId) {
      const media = await mediaRepo.findById(tx, patch.coverMediaId);
      if (!media || media.status !== "READY") {
        throw new ArticleServiceError(
          "That cover image hasn't finished uploading and validating yet.",
        );
      }
      coverMediaId = media.id;
    }

    const updated = await articlesRepo.updateDraftVersion(tx, draft.id, {
      title: patch.title,
      excerpt: patch.excerpt,
      category: patch.category ?? null,
      content: patch.content,
      readingTime: estimateReadingTime(patch.content),
      ...(patch.coverMediaId !== undefined ? { coverMediaId } : {}),
    });

    const tagIds = await tagsRepo.ensureTags(tx, patch.tags);
    await tagsRepo.setArticleTags(tx, articleId, tagIds);

    return updated;
  });
}

/** DRAFT -> PUBLISHED; any existing PUBLISHED version -> SUPERSEDED. Atomic. */
export async function publishArticle(articleId: string, actor: Actor) {
  return db.transaction(async (tx) => {
    const draft = await articlesRepo.getDraftVersion(tx, articleId);
    if (!draft) {
      throw new ArticleServiceError("No open draft to publish.");
    }

    const currentPublished = await articlesRepo.getPublishedVersion(tx, articleId);
    if (currentPublished) {
      await articlesRepo.markSuperseded(tx, currentPublished.id);
    }
    const published = await articlesRepo.markPublished(tx, draft.id);

    await logAudit({
      userId: actor.id,
      action: "article.version.published",
      resourceType: "article",
      resourceId: articleId,
      metadata: { versionId: published.id, versionNumber: published.versionNumber },
    });

    return published;
  });
}

/**
 * Restore-forward rollback: clones the target (any prior) version's
 * content into a fresh version and publishes it immediately. The target
 * row itself is never resurrected or mutated — history stays append-only.
 */
export async function rollbackArticle(
  articleId: string,
  targetVersionId: string,
  actor: Actor,
) {
  return db.transaction(async (tx) => {
    const target = await articlesRepo.getVersionById(tx, targetVersionId);
    if (!target || target.articleId !== articleId) {
      throw new ArticleServiceError("Target version not found for this article.");
    }

    const existingDraft = await articlesRepo.getDraftVersion(tx, articleId);
    if (existingDraft) {
      throw new ArticleServiceError(
        "An open draft already exists — publish or discard it before rolling back.",
      );
    }

    const nextNumber = await articlesRepo.nextVersionNumber(tx, articleId);
    const restored = await articlesRepo.insertVersion(tx, {
      articleId,
      versionNumber: nextNumber,
      status: "DRAFT",
      basedOnVersionId: target.id,
      title: target.title,
      excerpt: target.excerpt,
      content: target.content,
      readingTime: target.readingTime,
      category: target.category,
      coverMediaId: target.coverMediaId,
      seo: target.seo,
      createdByType: actor.type,
      createdById: actor.id,
      generationMode: "HUMAN_EDITED",
    });

    const currentPublished = await articlesRepo.getPublishedVersion(tx, articleId);
    if (currentPublished) {
      await articlesRepo.markSuperseded(tx, currentPublished.id);
    }
    const published = await articlesRepo.markPublished(tx, restored.id);

    await logAudit({
      userId: actor.id,
      action: "article.version.rollback",
      resourceType: "article",
      resourceId: articleId,
      metadata: { restoredFromVersionId: target.id, newVersionId: published.id },
    });

    return published;
  });
}

export async function archiveArticle(articleId: string, actor: Actor) {
  await articlesRepo.setItemStatus(db, articleId, "ARCHIVED");
  await logAudit({
    userId: actor.id,
    action: "article.archived",
    resourceType: "article",
    resourceId: articleId,
  });
}

export async function unarchiveArticle(articleId: string, actor: Actor) {
  await articlesRepo.setItemStatus(db, articleId, "ACTIVE");
  await logAudit({
    userId: actor.id,
    action: "article.unarchived",
    resourceType: "article",
    resourceId: articleId,
  });
}

export async function getMediaById(mediaId: string) {
  return mediaRepo.findById(db, mediaId);
}

export async function getArticleFullState(articleId: string) {
  const article = await articlesRepo.findArticleById(db, articleId);
  if (!article) return null;
  const [versions, tags] = await Promise.all([
    articlesRepo.listVersions(db, articleId),
    tagsRepo.getArticleTags(db, articleId),
  ]);
  const draft = versions.find((v) => v.status === "DRAFT") ?? null;
  const published = versions.find((v) => v.status === "PUBLISHED") ?? null;
  return { article, versions, tags, draft, published };
}

export async function listPublicArticlesOverview() {
  const rows = await articlesRepo.listPublishedActiveArticles(db);
  return Promise.all(
    rows.map(async ({ article, published }) => {
      const [tags, coverMedia] = await Promise.all([
        tagsRepo.getArticleTags(db, article.id),
        published.coverMediaId ? mediaRepo.findById(db, published.coverMediaId) : null,
      ]);

      const coverUrl =
        coverMedia && coverMedia.status === "READY"
          ? publicUrlFor(coverMedia.storageKey)
          : null;

      return {
        article,
        published,
        tags,
        coverUrl,
      };
    }),
  );
}

export async function getPublicArticleDetail(slug: string) {
  const row = await articlesRepo.getPublishedActiveArticleBySlug(db, slug);
  if (!row) return null;

  const { article, published } = row;

  const [tags, coverMedia] = await Promise.all([
    tagsRepo.getArticleTags(db, article.id),
    published.coverMediaId ? mediaRepo.findById(db, published.coverMediaId) : null,
  ]);

  const coverUrl =
    coverMedia && coverMedia.status === "READY"
      ? publicUrlFor(coverMedia.storageKey)
      : null;

  return {
    article,
    published,
    tags,
    coverUrl,
  };
}
