import "server-only";

import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import type { EvidenceCreateInput } from "@/lib/validation/evidence";
import type {
  ProjectCreateInput,
  ProjectDraftUpdateInput,
} from "@/lib/validation/project";

import { publicUrlFor } from "@/lib/storage/r2";
import * as evidenceRepo from "../repositories/evidence";
import * as mediaRepo from "../repositories/media";
import * as projectsRepo from "../repositories/projects";
import * as tagsRepo from "../repositories/tags";

export class ProjectServiceError extends Error {}

interface Actor {
  id: string;
  type: "HUMAN" | "AI";
}

function toDbUrl(value: string | null | undefined): string | null {
  return value && value.length > 0 ? value : null;
}

/** Creates a new project item + its first DRAFT version, in one transaction. */
export async function createProject(input: ProjectCreateInput, actor: Actor) {
  return db.transaction(async (tx) => {
    const existing = await projectsRepo.findProjectBySlug(tx, input.slug);
    if (existing) {
      throw new ProjectServiceError(
        `A project with slug "${input.slug}" already exists.`,
      );
    }

    const project = await projectsRepo.insertProject(tx, {
      slug: input.slug,
      createdBy: actor.id,
    });
    const version = await projectsRepo.insertVersion(tx, {
      projectId: project.id,
      versionNumber: 1,
      status: "DRAFT",
      title: input.title,
      shortDescription: input.shortDescription,
      sections: [],
      technologies: [],
      createdByType: actor.type,
      createdById: actor.id,
      generationMode: actor.type === "HUMAN" ? "HUMAN_CREATED" : "AI_GENERATED",
    });

    await logAudit({
      userId: actor.id,
      action: "project.version.created",
      resourceType: "project",
      resourceId: project.id,
      metadata: { versionId: version.id, versionNumber: version.versionNumber },
    });

    return { project, version };
  });
}

/**
 * Returns the project's current open draft, creating one by cloning the
 * published version if none exists yet (restore-forward pattern — the
 * published row is never mutated). Idempotent: calling this twice returns
 * the same draft the second time.
 */
export async function ensureDraft(projectId: string, actor: Actor) {
  return db.transaction(async (tx) => {
    const existingDraft = await projectsRepo.getDraftVersion(tx, projectId);
    if (existingDraft) return existingDraft;

    const published = await projectsRepo.getPublishedVersion(tx, projectId);
    if (!published) {
      throw new ProjectServiceError(
        "No draft and no published version exist for this project — data integrity issue.",
      );
    }

    const nextNumber = await projectsRepo.nextVersionNumber(tx, projectId);
    const draft = await projectsRepo.insertVersion(tx, {
      projectId,
      versionNumber: nextNumber,
      status: "DRAFT",
      basedOnVersionId: published.id,
      title: published.title,
      shortDescription: published.shortDescription,
      sections: published.sections,
      category: published.category,
      year: published.year,
      technologies: published.technologies,
      githubUrl: published.githubUrl,
      liveUrl: published.liveUrl,
      documentationUrl: published.documentationUrl,
      coverMediaId: published.coverMediaId,
      seo: published.seo,
      createdByType: actor.type,
      createdById: actor.id,
      generationMode: actor.type === "HUMAN" ? "HUMAN_EDITED" : "AI_ASSISTED",
    });

    await logAudit({
      userId: actor.id,
      action: "project.version.created",
      resourceType: "project",
      resourceId: projectId,
      metadata: { versionId: draft.id, basedOnVersionId: published.id },
    });

    return draft;
  });
}

/** Mutates the current DRAFT version in place. Never touches PUBLISHED rows. */
// `actor` isn't used yet — kept in the signature for when AUTHOR-scoped
// ownership checks (own content only) are added, per the deferred
// multi-role authorization in docs/SPECIFICATION.md.
export async function saveDraft(
  projectId: string,
  patch: ProjectDraftUpdateInput,
  _actor: Actor,
) {
  void _actor;
  return db.transaction(async (tx) => {
    const draft = await projectsRepo.getDraftVersion(tx, projectId);
    if (!draft) {
      throw new ProjectServiceError(
        "No open draft for this project — call ensureDraft first.",
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
        throw new ProjectServiceError(
          "That cover image hasn't finished uploading and validating yet.",
        );
      }
      coverMediaId = media.id;
    }

    const updated = await projectsRepo.updateDraftVersion(tx, draft.id, {
      title: patch.title,
      shortDescription: patch.shortDescription,
      category: patch.category ?? null,
      year: patch.year ?? null,
      technologies: patch.technologies,
      githubUrl: toDbUrl(patch.githubUrl),
      liveUrl: toDbUrl(patch.liveUrl),
      documentationUrl: toDbUrl(patch.documentationUrl),
      sections: patch.sections,
      ...(patch.coverMediaId !== undefined ? { coverMediaId } : {}),
    });

    const tagIds = await tagsRepo.ensureTags(tx, patch.tags);
    await tagsRepo.setProjectTags(tx, projectId, tagIds);

    return updated;
  });
}

/** DRAFT -> PUBLISHED; any existing PUBLISHED version -> SUPERSEDED. Atomic. */
export async function publishProject(projectId: string, actor: Actor) {
  return db.transaction(async (tx) => {
    const draft = await projectsRepo.getDraftVersion(tx, projectId);
    if (!draft) {
      throw new ProjectServiceError("No open draft to publish.");
    }

    const currentPublished = await projectsRepo.getPublishedVersion(tx, projectId);
    if (currentPublished) {
      await projectsRepo.markSuperseded(tx, currentPublished.id);
    }
    const published = await projectsRepo.markPublished(tx, draft.id);

    await logAudit({
      userId: actor.id,
      action: "project.version.published",
      resourceType: "project",
      resourceId: projectId,
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
export async function rollbackProject(
  projectId: string,
  targetVersionId: string,
  actor: Actor,
) {
  return db.transaction(async (tx) => {
    const target = await projectsRepo.getVersionById(tx, targetVersionId);
    if (!target || target.projectId !== projectId) {
      throw new ProjectServiceError("Target version not found for this project.");
    }

    const existingDraft = await projectsRepo.getDraftVersion(tx, projectId);
    if (existingDraft) {
      throw new ProjectServiceError(
        "An open draft already exists — publish or discard it before rolling back.",
      );
    }

    const nextNumber = await projectsRepo.nextVersionNumber(tx, projectId);
    const restored = await projectsRepo.insertVersion(tx, {
      projectId,
      versionNumber: nextNumber,
      status: "DRAFT",
      basedOnVersionId: target.id,
      title: target.title,
      shortDescription: target.shortDescription,
      sections: target.sections,
      category: target.category,
      year: target.year,
      technologies: target.technologies,
      githubUrl: target.githubUrl,
      liveUrl: target.liveUrl,
      documentationUrl: target.documentationUrl,
      coverMediaId: target.coverMediaId,
      seo: target.seo,
      createdByType: actor.type,
      createdById: actor.id,
      generationMode: "HUMAN_EDITED",
    });

    const currentPublished = await projectsRepo.getPublishedVersion(tx, projectId);
    if (currentPublished) {
      await projectsRepo.markSuperseded(tx, currentPublished.id);
    }
    const published = await projectsRepo.markPublished(tx, restored.id);

    await logAudit({
      userId: actor.id,
      action: "project.version.rollback",
      resourceType: "project",
      resourceId: projectId,
      metadata: { restoredFromVersionId: target.id, newVersionId: published.id },
    });

    return published;
  });
}

export async function archiveProject(projectId: string, actor: Actor) {
  await projectsRepo.setItemStatus(db, projectId, "ARCHIVED");
  await logAudit({
    userId: actor.id,
    action: "project.archived",
    resourceType: "project",
    resourceId: projectId,
  });
}

export async function unarchiveProject(projectId: string, actor: Actor) {
  await projectsRepo.setItemStatus(db, projectId, "ACTIVE");
  await logAudit({
    userId: actor.id,
    action: "project.unarchived",
    resourceType: "project",
    resourceId: projectId,
  });
}

export async function addEvidence(projectId: string, input: EvidenceCreateInput) {
  return db.transaction(async (tx) => {
    return evidenceRepo.insertEvidenceForProject(tx, projectId, {
      type: input.type,
      label: input.label,
      description: input.description ?? null,
      url: input.url && input.url.length > 0 ? input.url : null,
      data: "data" in input ? (input.data ?? null) : null,
    });
  });
}

export async function removeEvidence(projectId: string, evidenceId: string) {
  const deleted = await db.transaction((tx) =>
    evidenceRepo.deleteEvidenceForProject(tx, projectId, evidenceId),
  );
  if (!deleted) {
    throw new ProjectServiceError(
      "Evidence not found for this project — it may belong to a different project, or was already removed.",
    );
  }
}

export async function getMediaById(mediaId: string) {
  return mediaRepo.findById(db, mediaId);
}

export async function getProjectFullState(projectId: string) {
  const project = await projectsRepo.findProjectById(db, projectId);
  if (!project) return null;
  const [versions, evidence, tags] = await Promise.all([
    projectsRepo.listVersions(db, projectId),
    evidenceRepo.listEvidenceForProject(db, projectId),
    tagsRepo.getProjectTags(db, projectId),
  ]);
  const draft = versions.find((v) => v.status === "DRAFT") ?? null;
  const published = versions.find((v) => v.status === "PUBLISHED") ?? null;
  return { project, versions, evidence, tags, draft, published };
}

export async function listProjectsOverview() {
  const projects = await projectsRepo.listProjects(db);
  return Promise.all(
    projects.map(async (project) => {
      const versions = await projectsRepo.listVersions(db, project.id);
      return {
        project,
        draft: versions.find((v) => v.status === "DRAFT") ?? null,
        published: versions.find((v) => v.status === "PUBLISHED") ?? null,
      };
    }),
  );
}

export async function listPublicWorkOverview() {
  const rows = await projectsRepo.listPublishedActiveProjects(db);
  return Promise.all(
    rows.map(async ({ project, published }) => {
      const [tags, coverMedia] = await Promise.all([
        tagsRepo.getProjectTags(db, project.id),
        published.coverMediaId ? mediaRepo.findById(db, published.coverMediaId) : null,
      ]);

      const coverUrl =
        coverMedia && coverMedia.status === "READY"
          ? publicUrlFor(coverMedia.storageKey)
          : null;

      return {
        project,
        published,
        tags,
        coverUrl,
      };
    }),
  );
}

export async function getPublicWorkCaseStudy(slug: string) {
  const row = await projectsRepo.getPublishedActiveProjectBySlug(db, slug);
  if (!row) return null;

  const { project, published } = row;

  const [evidence, tags, coverMedia] = await Promise.all([
    evidenceRepo.listEvidenceForProject(db, project.id),
    tagsRepo.getProjectTags(db, project.id),
    published.coverMediaId ? mediaRepo.findById(db, published.coverMediaId) : null,
  ]);

  const coverUrl =
    coverMedia && coverMedia.status === "READY"
      ? publicUrlFor(coverMedia.storageKey)
      : null;

  return {
    project,
    published,
    evidence,
    tags,
    coverUrl,
  };
}
