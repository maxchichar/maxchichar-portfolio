import "server-only";

import { logAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { isMissingTableError } from "@/lib/db/errors";
import { publicUrlFor } from "@/lib/storage/r2";
import { mediaKindOf } from "@/lib/validation/media";
import { testimonialSchema, type TestimonialInput } from "@/lib/validation/testimonial";

import * as mediaRepo from "../repositories/media";
import * as projectsRepo from "../repositories/projects";
import * as repo from "../repositories/testimonials";

export type TestimonialRow = repo.TestimonialRow;

/** What public pages render. */
export interface PublicTestimonial {
  id: string;
  quote: string;
  authorName: string;
  authorRole: string | null;
  authorCompany: string | null;
  authorUrl: string | null;
  avatarUrl: string | null;
}

let warnedMissing = false;
function handleReadError(err: unknown, where: string) {
  if (isMissingTableError(err)) {
    if (!warnedMissing) {
      warnedMissing = true;
      console.warn("testimonials table not found: run `npm run db:push` to enable them.");
    }
    return;
  }
  console.error(`${where} error:`, err);
}

async function toPublic(rows: TestimonialRow[]): Promise<PublicTestimonial[]> {
  return Promise.all(
    rows.map(async (row) => {
      let avatarUrl: string | null = null;
      if (row.avatarMediaId) {
        const media = await mediaRepo.findById(db, row.avatarMediaId);
        if (media && media.status === "READY") avatarUrl = publicUrlFor(media.storageKey);
      }
      return {
        id: row.id,
        quote: row.quote,
        authorName: row.authorName,
        authorRole: row.authorRole,
        authorCompany: row.authorCompany,
        authorUrl: row.authorUrl,
        avatarUrl,
      };
    }),
  );
}

/** Visible + featured, for the homepage. Never throws. */
export async function getFeaturedTestimonials(limit = 5): Promise<PublicTestimonial[]> {
  try {
    const rows = await repo.listVisible(db, { featured: true });
    return await toPublic(rows.slice(0, limit));
  } catch (err) {
    handleReadError(err, "getFeaturedTestimonials");
    return [];
  }
}

/** Visible testimonials linked to a project, for its case study. Never throws. */
export async function getProjectTestimonials(
  projectId: string,
): Promise<PublicTestimonial[]> {
  try {
    return await toPublic(await repo.listVisible(db, { projectId }));
  } catch (err) {
    handleReadError(err, "getProjectTestimonials");
    return [];
  }
}

/** Admin list; `available` is false until the migration has been applied. */
export async function listTestimonialsAdmin(): Promise<{
  available: boolean;
  items: TestimonialRow[];
}> {
  try {
    return { available: true, items: await repo.listAll(db) };
  } catch (err) {
    if (isMissingTableError(err)) return { available: false, items: [] };
    throw err;
  }
}

export async function getTestimonial(id: string): Promise<TestimonialRow | null> {
  try {
    return await repo.findById(db, id);
  } catch (err) {
    if (isMissingTableError(err)) return null;
    throw err;
  }
}

type Result = { success: true; id: string } | { success: false; error: string };

/** Client-supplied ids are untrusted: the photo must be a READY image, the project must exist. */
async function checkReferences(data: TestimonialInput): Promise<string | null> {
  if (data.avatarMediaId) {
    const media = await mediaRepo.findById(db, data.avatarMediaId);
    if (!media || media.status !== "READY") {
      return "That photo hasn't finished uploading and validating yet.";
    }
    if (mediaKindOf(media.mimeType) !== "image") return "The photo must be an image.";
  }
  if (data.projectId && !(await projectsRepo.findProjectById(db, data.projectId))) {
    return "That project no longer exists.";
  }
  return null;
}

function failure(err: unknown, action: string): Result {
  if (isMissingTableError(err)) {
    return {
      success: false,
      error: "Testimonials need a one-time database update. Run `npm run db:push`.",
    };
  }
  console.error(`${action} error:`, err);
  return { success: false, error: `Couldn't ${action}. Please try again.` };
}

export async function saveTestimonial(
  id: string | null,
  raw: unknown,
  actor: { id: string },
): Promise<Result> {
  const parsed = testimonialSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  try {
    const refError = await checkReferences(parsed.data);
    if (refError) return { success: false, error: refError };

    const row = id
      ? await repo.update(db, id, parsed.data)
      : await repo.insert(db, parsed.data);
    if (!row) return { success: false, error: "That testimonial no longer exists." };

    await logAudit({
      userId: actor.id,
      action: id ? "testimonial.updated" : "testimonial.created",
      resourceType: "testimonial",
      resourceId: row.id,
      metadata: { authorName: row.authorName },
    });
    return { success: true, id: row.id };
  } catch (err) {
    return failure(err, "save the testimonial");
  }
}

export async function deleteTestimonial(
  id: string,
  actor: { id: string },
): Promise<Result> {
  try {
    await repo.remove(db, id);
    await logAudit({
      userId: actor.id,
      action: "testimonial.deleted",
      resourceType: "testimonial",
      resourceId: id,
    });
    return { success: true, id };
  } catch (err) {
    return failure(err, "delete the testimonial");
  }
}
