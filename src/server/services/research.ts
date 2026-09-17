import "server-only";

import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import type { EvidenceCreateInput } from "@/lib/validation/evidence";
import type {
  ResearchCreateInput,
  ResearchDraftUpdateInput,
} from "@/lib/validation/research";

import * as evidenceRepo from "../repositories/evidence";
import * as mediaRepo from "../repositories/media";
import * as researchRepo from "../repositories/research";
import * as tagsRepo from "../repositories/tags";

export class ResearchServiceError extends Error {}

interface Actor {
  id: string;
  type: "HUMAN" | "AI";
}

// Level 5.1 added createResearch and listResearchOverview. Level 5.2 added
// the draft/publish/rollback/archive lifecycle. Level 5.3 wires research
// into the shared tags/evidence/media infrastructure below — same tables,
// same repositories, no second system. Mirrors services/projects.ts
// function-for-function throughout.

/** Creates a new research item + its first DRAFT version, in one transaction. */
export async function createResearch(input: ResearchCreateInput, actor: Actor) {
  return db.transaction(async (tx) => {
    const existing = await researchRepo.findResearchBySlug(tx, input.slug);
    if (existing) {
      throw new ResearchServiceError(
        `A research item with slug "${input.slug}" already exists.`,
      );
    }

    const research = await researchRepo.insertResearch(tx, {
      slug: input.slug,
      createdBy: actor.id,
    });
    const version = await researchRepo.insertVersion(tx, {
      researchId: research.id,
      versionNumber: 1,
      status: "DRAFT",
      title: input.title,
      type: input.type,
      abstract: input.abstract,
      sections: [],
      createdByType: actor.type,
      createdById: actor.id,
      generationMode: actor.type === "HUMAN" ? "HUMAN_CREATED" : "AI_GENERATED",
    });

    await logAudit({
      userId: actor.id,
      action: "research.version.created",
      resourceType: "research",
      resourceId: research.id,
      metadata: { versionId: version.id, versionNumber: version.versionNumber },
    });

    return { research, version };
  });
}

export async function listResearchOverview() {
  const items = await researchRepo.listResearch(db);
  return Promise.all(
    items.map(async (research) => {
      const versions = await researchRepo.listVersions(db, research.id);
      return {
        research,
        draft: versions.find((v) => v.status === "DRAFT") ?? null,
        published: versions.find((v) => v.status === "PUBLISHED") ?? null,
      };
    }),
  );
}

/**
 * Returns the research item's current open draft, creating one by cloning
 * the published version if none exists yet (restore-forward pattern — the
 * published row is never mutated). Idempotent.
 */
export async function ensureDraft(researchId: string, actor: Actor) {
  return db.transaction(async (tx) => {
    const existingDraft = await researchRepo.getDraftVersion(tx, researchId);
    if (existingDraft) return existingDraft;

    const published = await researchRepo.getPublishedVersion(tx, researchId);
    if (!published) {
      throw new ResearchServiceError(
        "No draft and no published version exist for this research item — data integrity issue.",
      );
    }

    const nextNumber = await researchRepo.nextVersionNumber(tx, researchId);
    const draft = await researchRepo.insertVersion(tx, {
      researchId,
      versionNumber: nextNumber,
      status: "DRAFT",
      basedOnVersionId: published.id,
      title: published.title,
      type: published.type,
      abstract: published.abstract,
      sections: published.sections,
      category: published.category,
      coverMediaId: published.coverMediaId,
      seo: published.seo,
      createdByType: actor.type,
      createdById: actor.id,
      generationMode: actor.type === "HUMAN" ? "HUMAN_EDITED" : "AI_ASSISTED",
    });

    await logAudit({
      userId: actor.id,
      action: "research.version.created",
      resourceType: "research",
      resourceId: researchId,
      metadata: { versionId: draft.id, basedOnVersionId: published.id },
    });

    return draft;
  });
}

/** Mutates the current DRAFT version in place. Never touches PUBLISHED rows. */
// `actor` isn't used yet — kept in the signature for when AUTHOR-scoped
// ownership checks are added, matching services/projects.ts's saveDraft.
export async function saveDraft(
  researchId: string,
  patch: ResearchDraftUpdateInput,
  _actor: Actor,
) {
  void _actor;
  return db.transaction(async (tx) => {
    const draft = await researchRepo.getDraftVersion(tx, researchId);
    if (!draft) {
      throw new ResearchServiceError(
        "No open draft for this research item — call ensureDraft first.",
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
        throw new ResearchServiceError(
          "That cover image hasn't finished uploading and validating yet.",
        );
      }
      coverMediaId = media.id;
    }

    const updated = await researchRepo.updateDraftVersion(tx, draft.id, {
      title: patch.title,
      type: patch.type,
      abstract: patch.abstract,
      category: patch.category ?? null,
      sections: patch.sections,
      ...(patch.coverMediaId !== undefined ? { coverMediaId } : {}),
    });

    const tagIds = await tagsRepo.ensureTags(tx, patch.tags);
    await tagsRepo.setResearchTags(tx, researchId, tagIds);

    return updated;
  });
}

/** DRAFT -> PUBLISHED; any existing PUBLISHED version -> SUPERSEDED. Atomic. */
export async function publishResearch(researchId: string, actor: Actor) {
  return db.transaction(async (tx) => {
    const draft = await researchRepo.getDraftVersion(tx, researchId);
    if (!draft) {
      throw new ResearchServiceError("No open draft to publish.");
    }

    const currentPublished = await researchRepo.getPublishedVersion(tx, researchId);
    if (currentPublished) {
      await researchRepo.markSuperseded(tx, currentPublished.id);
    }
    const published = await researchRepo.markPublished(tx, draft.id);

    await logAudit({
      userId: actor.id,
      action: "research.version.published",
      resourceType: "research",
      resourceId: researchId,
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
export async function rollbackResearch(
  researchId: string,
  targetVersionId: string,
  actor: Actor,
) {
  return db.transaction(async (tx) => {
    const target = await researchRepo.getVersionById(tx, targetVersionId);
    if (!target || target.researchId !== researchId) {
      throw new ResearchServiceError("Target version not found for this research item.");
    }

    const existingDraft = await researchRepo.getDraftVersion(tx, researchId);
    if (existingDraft) {
      throw new ResearchServiceError(
        "An open draft already exists — publish or discard it before rolling back.",
      );
    }

    const nextNumber = await researchRepo.nextVersionNumber(tx, researchId);
    const restored = await researchRepo.insertVersion(tx, {
      researchId,
      versionNumber: nextNumber,
      status: "DRAFT",
      basedOnVersionId: target.id,
      title: target.title,
      type: target.type,
      abstract: target.abstract,
      sections: target.sections,
      category: target.category,
      coverMediaId: target.coverMediaId,
      seo: target.seo,
      createdByType: actor.type,
      createdById: actor.id,
      generationMode: "HUMAN_EDITED",
    });

    const currentPublished = await researchRepo.getPublishedVersion(tx, researchId);
    if (currentPublished) {
      await researchRepo.markSuperseded(tx, currentPublished.id);
    }
    const published = await researchRepo.markPublished(tx, restored.id);

    await logAudit({
      userId: actor.id,
      action: "research.version.rollback",
      resourceType: "research",
      resourceId: researchId,
      metadata: { restoredFromVersionId: target.id, newVersionId: published.id },
    });

    return published;
  });
}

export async function archiveResearch(researchId: string, actor: Actor) {
  await researchRepo.setItemStatus(db, researchId, "ARCHIVED");
  await logAudit({
    userId: actor.id,
    action: "research.archived",
    resourceType: "research",
    resourceId: researchId,
  });
}

export async function unarchiveResearch(researchId: string, actor: Actor) {
  await researchRepo.setItemStatus(db, researchId, "ACTIVE");
  await logAudit({
    userId: actor.id,
    action: "research.unarchived",
    resourceType: "research",
    resourceId: researchId,
  });
}

export async function addEvidence(researchId: string, input: EvidenceCreateInput) {
  return db.transaction(async (tx) => {
    return evidenceRepo.insertEvidenceForResearch(tx, researchId, {
      type: input.type,
      label: input.label,
      description: input.description ?? null,
      url: input.url && input.url.length > 0 ? input.url : null,
      data: "data" in input ? (input.data ?? null) : null,
    });
  });
}

export async function removeEvidence(researchId: string, evidenceId: string) {
  const deleted = await db.transaction((tx) =>
    evidenceRepo.deleteEvidenceForResearch(tx, researchId, evidenceId),
  );
  if (!deleted) {
    throw new ResearchServiceError(
      "Evidence not found for this research item — it may belong to a different item, or was already removed.",
    );
  }
}

export async function getMediaById(mediaId: string) {
  return mediaRepo.findById(db, mediaId);
}

export async function getResearchFullState(researchId: string) {
  const research = await researchRepo.findResearchById(db, researchId);
  if (!research) return null;
  const [versions, evidence, tags] = await Promise.all([
    researchRepo.listVersions(db, researchId),
    evidenceRepo.listEvidenceForResearch(db, researchId),
    tagsRepo.getResearchTags(db, researchId),
  ]);
  const draft = versions.find((v) => v.status === "DRAFT") ?? null;
  const published = versions.find((v) => v.status === "PUBLISHED") ?? null;
  return { research, versions, evidence, tags, draft, published };
}
