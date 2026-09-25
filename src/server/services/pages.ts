import "server-only";

import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import type { PageContent } from "@/lib/validation/page";

import * as pagesRepo from "../repositories/pages";

export class PageServiceError extends Error {}

interface Actor {
  id: string;
  type: "HUMAN" | "AI";
}

// Level 8.1 added listPagesOverview. Level 8.2 adds the rest below,
// mirroring services/research.ts's 5.2 additions — with the same
// deliberate omission as the repository: no archiveResearch-equivalent,
// since pages has no status to archive. saveDraft additionally cross-
// checks that the content's own `slug` discriminator matches the page
// it's being saved to, since a page is identified by both pageId and an
// immutable slug and a mismatch here would silently corrupt which shape
// a page's content is — cheap to catch here, hard to notice later.
//
// Row creation for the three fixed pages still deliberately does NOT
// live here — scripts/seed-pages.ts owns that; see the Level 8.1 note
// above listPagesOverview for why.

export async function listPagesOverview() {
  const items = await pagesRepo.listPages(db);
  return Promise.all(
    items.map(async (page) => {
      const versions = await pagesRepo.listVersions(db, page.id);
      return {
        page,
        draft: versions.find((v) => v.status === "DRAFT") ?? null,
        published: versions.find((v) => v.status === "PUBLISHED") ?? null,
      };
    }),
  );
}

/**
 * Returns the page's current open draft, creating one by cloning the
 * published version if none exists yet (restore-forward pattern — the
 * published row is never mutated). Idempotent.
 */
export async function ensureDraft(pageId: string, actor: Actor) {
  return db.transaction(async (tx) => {
    const existingDraft = await pagesRepo.getDraftVersion(tx, pageId);
    if (existingDraft) return existingDraft;

    const published = await pagesRepo.getPublishedVersion(tx, pageId);
    if (!published) {
      throw new PageServiceError(
        "No draft and no published version exist for this page — run `npm run seed:pages`.",
      );
    }

    const nextNumber = await pagesRepo.nextVersionNumber(tx, pageId);
    const draft = await pagesRepo.insertVersion(tx, {
      pageId,
      versionNumber: nextNumber,
      status: "DRAFT",
      basedOnVersionId: published.id,
      content: published.content,
      createdByType: actor.type,
      createdById: actor.id,
      generationMode: actor.type === "HUMAN" ? "HUMAN_EDITED" : "AI_ASSISTED",
    });

    await logAudit({
      userId: actor.id,
      action: "page.version.created",
      resourceType: "page",
      resourceId: pageId,
      metadata: { versionId: draft.id, basedOnVersionId: published.id },
    });

    return draft;
  });
}

/**
 * Mutates the current DRAFT version in place. Never touches PUBLISHED
 * rows. `content` must already be validated against the correct per-slug
 * schema by the caller (mirrors saveDraft's contract in every other
 * content-type service) — this function additionally verifies the
 * content's own slug discriminator actually matches the page being
 * saved to, refusing the write rather than silently storing a
 * mismatched shape.
 */
export async function saveDraft(pageId: string, content: PageContent, actor: Actor) {
  void actor; // not used yet — kept for future AUTHOR-scoped ownership checks, matching every other saveDraft
  return db.transaction(async (tx) => {
    const page = await pagesRepo.findPageById(tx, pageId);
    if (!page) {
      throw new PageServiceError("Page not found.");
    }
    if (content.slug !== page.slug) {
      throw new PageServiceError(
        `Content shape ("${content.slug}") does not match this page's slug ("${page.slug}").`,
      );
    }

    const draft = await pagesRepo.getDraftVersion(tx, pageId);
    if (!draft) {
      throw new PageServiceError("No open draft for this page — call ensureDraft first.");
    }

    return pagesRepo.updateDraftVersion(tx, draft.id, { content });
  });
}

/** DRAFT -> PUBLISHED; any existing PUBLISHED version -> SUPERSEDED. Atomic. */
export async function publishPage(pageId: string, actor: Actor) {
  return db.transaction(async (tx) => {
    const draft = await pagesRepo.getDraftVersion(tx, pageId);
    if (!draft) {
      throw new PageServiceError("No open draft to publish.");
    }

    const currentPublished = await pagesRepo.getPublishedVersion(tx, pageId);
    if (currentPublished) {
      await pagesRepo.markSuperseded(tx, currentPublished.id);
    }
    const published = await pagesRepo.markPublished(tx, draft.id);

    await logAudit({
      userId: actor.id,
      action: "page.version.published",
      resourceType: "page",
      resourceId: pageId,
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
export async function rollbackPage(
  pageId: string,
  targetVersionId: string,
  actor: Actor,
) {
  return db.transaction(async (tx) => {
    const target = await pagesRepo.getVersionById(tx, targetVersionId);
    if (!target || target.pageId !== pageId) {
      throw new PageServiceError("Target version not found for this page.");
    }

    const existingDraft = await pagesRepo.getDraftVersion(tx, pageId);
    if (existingDraft) {
      throw new PageServiceError(
        "An open draft already exists — publish or discard it before rolling back.",
      );
    }

    const nextNumber = await pagesRepo.nextVersionNumber(tx, pageId);
    const restored = await pagesRepo.insertVersion(tx, {
      pageId,
      versionNumber: nextNumber,
      status: "DRAFT",
      basedOnVersionId: target.id,
      content: target.content,
      createdByType: actor.type,
      createdById: actor.id,
      generationMode: "HUMAN_EDITED",
    });

    const currentPublished = await pagesRepo.getPublishedVersion(tx, pageId);
    if (currentPublished) {
      await pagesRepo.markSuperseded(tx, currentPublished.id);
    }
    const published = await pagesRepo.markPublished(tx, restored.id);

    await logAudit({
      userId: actor.id,
      action: "page.version.rollback",
      resourceType: "page",
      resourceId: pageId,
      metadata: { restoredFromVersionId: target.id, newVersionId: published.id },
    });

    return published;
  });
}

export async function getPageFullState(pageId: string) {
  const page = await pagesRepo.findPageById(db, pageId);
  if (!page) return null;
  const versions = await pagesRepo.listVersions(db, pageId);
  const draft = versions.find((v) => v.status === "DRAFT") ?? null;
  const published = versions.find((v) => v.status === "PUBLISHED") ?? null;
  return { page, versions, draft, published };
}

export async function getPageBySlug(slug: string) {
  return pagesRepo.findPageBySlug(db, slug);
}
