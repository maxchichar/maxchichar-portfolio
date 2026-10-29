import "server-only";

import { db, schema } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { plainTextToTiptapDoc, tiptapDocToPlainText } from "@/lib/validation/project";
import type {
  ArticleCreateInput,
  ArticleDraftUpdateInput,
} from "@/lib/validation/article";
import { hasArticleBody } from "@/lib/validation/article";

import { publicUrlFor } from "@/lib/storage/r2";
import { repairArticleContent } from "@/lib/markdown-doc";
import * as articlesRepo from "../repositories/articles";
import * as mediaRepo from "../repositories/media";
import * as tagsRepo from "../repositories/tags";

export class ArticleServiceError extends Error {}

interface Actor {
  id: string;
  type: "HUMAN" | "AI";
  /** Where an AI actor's change came from, e.g. "content-api:<key name>". */
  source?: string;
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

/**
 * The published version as visitors should see it: an article whose text was
 * stuck in the excerpt, or saved as literal Markdown, is shown formatted (see
 * repairArticleContent). Stored rows are not changed; the admin's "Fix
 * formatting" saves the same repair as a draft.
 */
function presentPublished<
  T extends {
    title: string;
    excerpt: string;
    content: unknown;
    readingTime: number | null;
  },
>(published: T): T {
  const fixed = repairArticleContent(published);
  if (!fixed) return published;
  return {
    ...published,
    excerpt: fixed.excerpt,
    content: fixed.content,
    readingTime: estimateReadingTime(fixed.content),
  };
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
      source: actor.source ?? null,
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
        "No draft and no published version exist for this article. Data integrity issue.",
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
      source: actor.source ?? null,
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
export async function saveDraft(
  articleId: string,
  patch: ArticleDraftUpdateInput,
  actor: Actor,
) {
  return db.transaction(async (tx) => {
    const draft = await articlesRepo.getDraftVersion(tx, articleId);
    if (!draft) {
      throw new ArticleServiceError(
        "No open draft for this article. Call ensureDraft first.",
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

    const repaired = repairArticleContent(patch);
    const content = repaired?.content ?? patch.content;
    const updated = await articlesRepo.updateDraftVersion(tx, draft.id, {
      title: patch.title,
      excerpt: repaired?.excerpt ?? patch.excerpt,
      category: patch.category ?? null,
      content,
      readingTime: estimateReadingTime(content),
      ...(patch.coverMediaId !== undefined ? { coverMediaId } : {}),
      // A person saved it, so it stays HUMAN; the mode records that the
      // writing assistant's suggestion is in it. Later saves keep the mark.
      ...(patch.aiGenerationId
        ? {
            generationMode: "AI_ASSISTED",
            generationId: patch.aiGenerationId,
            source: "admin-assistant",
          }
        : {}),
      // An AI client (the Content API) editing a draft marks it AI-assisted,
      // unless an AI client wrote it from the start.
      ...(actor.type === "AI"
        ? {
            generationMode:
              draft.generationMode === "AI_GENERATED" ? "AI_GENERATED" : "AI_ASSISTED",
            source: actor.source ?? draft.source,
          }
        : {}),
    });

    const tagIds = await tagsRepo.ensureTags(tx, patch.tags);
    await tagsRepo.setArticleTags(tx, articleId, tagIds);

    return updated;
  });
}

/** DRAFT -> PUBLISHED; any existing PUBLISHED version -> SUPERSEDED. Atomic. */
/** Whether a version's text needs the formatting repair. */
export function needsFormattingFix(version: {
  title: string;
  excerpt: string;
  content: unknown;
}): boolean {
  return repairArticleContent(version) !== null;
}

/**
 * Saves the formatting repair (see repairArticleContent) into the article's
 * draft, creating the draft from the live version first if there isn't one.
 * The live page doesn't change until the draft is published.
 */
export async function fixDraftFormatting(articleId: string, actor: Actor) {
  const draft = await ensureDraft(articleId, actor);
  const fixed = repairArticleContent(draft);
  if (!fixed) return draft;
  return db.transaction((tx) =>
    articlesRepo.updateDraftVersion(tx, draft.id, {
      excerpt: fixed.excerpt,
      content: fixed.content,
      readingTime: estimateReadingTime(fixed.content),
    }),
  );
}

export async function publishArticle(articleId: string, actor: Actor) {
  // Publishing is a person's decision; API keys can't carry the publish scope
  // (database CHECK), and this refuses any non-human actor as well.
  if (actor.type !== "HUMAN") {
    throw new ArticleServiceError("Only a person can publish.");
  }
  return db.transaction(async (tx) => {
    const draft = await articlesRepo.getDraftVersion(tx, articleId);
    if (!draft) {
      throw new ArticleServiceError("No open draft to publish.");
    }

    if (!hasArticleBody(draft.content)) {
      throw new ArticleServiceError(
        "Add article text or an image in Body before publishing. Your draft has been saved.",
      );
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
        "An open draft already exists. Publish or discard it before rolling back.",
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

export async function deleteArchivedArticle(articleId: string, actor: Actor) {
  return db.transaction(async (tx) => {
    const deleted = await articlesRepo.deleteArchivedArticle(tx, articleId);
    if (!deleted) {
      throw new ArticleServiceError("Archive the article before deleting it.");
    }
    await tx.insert(schema.auditLogs).values({
      userId: actor.id,
      action: "article.deleted",
      resourceType: "article",
      resourceId: articleId,
      metadata: { slug: deleted.slug },
    });
    return deleted;
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
        published: presentPublished(published),
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
    published: presentPublished(published),
    tags,
    coverUrl,
  };
}
