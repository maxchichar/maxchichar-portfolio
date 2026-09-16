"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/config";
import { evidenceCreateSchema } from "@/lib/validation/evidence";
import {
  plainTextToTiptapDoc,
  PROJECT_SECTION_KEYS,
  projectCreateSchema,
  projectDraftUpdateSchema,
  tiptapDocToPlainText,
} from "@/lib/validation/project";
import * as projectService from "@/server/services/projects";

// Every action re-checks auth() itself, server-side — the route-group
// layout protects page navigation, not individual mutations. Client-side
// UI hiding is never treated as authorization (docs/SPECIFICATION.md).
async function requireActor() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not authenticated.");
  }
  return { id: session.user.id, type: "HUMAN" as const };
}

// Deliberately no `.bind(null, projectId)` anywhere in this file. Bound
// server actions don't render the plain progressive-enhancement
// `$ACTION_ID_*` hidden-field pattern at all — they require a real JS
// runtime to reconstruct the bound argument, the same underlying issue
// `useActionState` forms had (see the projects/new and evidence-panel
// history). Every mutating id (projectId, evidenceId, targetVersionId)
// is threaded through as an ordinary hidden form field instead, so every
// admin form here works identically with or without JavaScript and is
// verifiable with a plain HTTP client, not just a real browser.
function requireField(formData: FormData, name: string): string {
  const value = formData.get(name);
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing required field: ${name}`);
  }
  return value;
}

export async function createProjectFromForm(formData: FormData): Promise<void> {
  const actor = await requireActor();
  const parsed = projectCreateSchema.safeParse({
    slug: formData.get("slug"),
    title: formData.get("title"),
    shortDescription: formData.get("shortDescription"),
  });
  if (!parsed.success) {
    redirect(
      `/admin/projects/new?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "invalid")}`,
    );
  }

  let projectId: string;
  try {
    const { project } = await projectService.createProject(parsed.data, actor);
    projectId = project.id;
  } catch (err) {
    if (err instanceof projectService.ProjectServiceError) {
      redirect(`/admin/projects/new?error=${encodeURIComponent(err.message)}`);
    }
    throw err;
  }
  revalidatePath("/admin/projects");
  redirect(`/admin/projects/${projectId}`);
}

export async function ensureDraftForm(formData: FormData): Promise<void> {
  const actor = await requireActor();
  const projectId = requireField(formData, "projectId");
  await projectService.ensureDraft(projectId, actor);
  revalidatePath(`/admin/projects/${projectId}`);
  redirect(`/admin/projects/${projectId}`);
}

export async function saveDraftForm(formData: FormData): Promise<void> {
  const actor = await requireActor();
  const projectId = requireField(formData, "projectId");

  const sections = PROJECT_SECTION_KEYS.map((key) => {
    const text = String(formData.get(`section_${key}`) ?? "").trim();
    if (!text) return null;
    return {
      key,
      heading: String(formData.get(`heading_${key}`) ?? key),
      content: plainTextToTiptapDoc(text),
    };
  }).filter((s): s is NonNullable<typeof s> => s !== null);

  const technologies = String(formData.get("technologies") ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const tags = String(formData.get("tags") ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  // Tri-state: field absent -> undefined (don't touch existing cover);
  // present but empty -> null (explicit clear); present with a value ->
  // that value (set/keep, verified server-side in the service layer).
  const coverMediaIdRaw = formData.get("coverMediaId");
  const coverMediaId =
    coverMediaIdRaw === null
      ? undefined
      : coverMediaIdRaw === ""
        ? null
        : String(coverMediaIdRaw);

  const parsed = projectDraftUpdateSchema.safeParse({
    title: formData.get("title"),
    shortDescription: formData.get("shortDescription"),
    category: formData.get("category") || null,
    year: formData.get("year") ? Number(formData.get("year")) : null,
    technologies,
    githubUrl: formData.get("githubUrl") || null,
    liveUrl: formData.get("liveUrl") || null,
    documentationUrl: formData.get("documentationUrl") || null,
    sections,
    tags,
    coverMediaId,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  await projectService.saveDraft(projectId, parsed.data, actor);
  revalidatePath(`/admin/projects/${projectId}`);
  redirect(`/admin/projects/${projectId}`);
}

export async function publishProjectForm(formData: FormData): Promise<void> {
  const actor = await requireActor();
  const projectId = requireField(formData, "projectId");
  await projectService.publishProject(projectId, actor);
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath("/admin/projects");
  redirect(`/admin/projects/${projectId}`);
}

export async function rollbackProjectForm(formData: FormData): Promise<void> {
  const actor = await requireActor();
  const projectId = requireField(formData, "projectId");
  const targetVersionId = requireField(formData, "targetVersionId");
  await projectService.rollbackProject(projectId, targetVersionId, actor);
  revalidatePath(`/admin/projects/${projectId}`);
  redirect(`/admin/projects/${projectId}`);
}

export async function archiveProjectForm(formData: FormData): Promise<void> {
  const actor = await requireActor();
  const projectId = requireField(formData, "projectId");
  await projectService.archiveProject(projectId, actor);
  revalidatePath("/admin/projects");
  revalidatePath(`/admin/projects/${projectId}`);
  redirect(`/admin/projects/${projectId}`);
}

export async function unarchiveProjectForm(formData: FormData): Promise<void> {
  const actor = await requireActor();
  const projectId = requireField(formData, "projectId");
  await projectService.unarchiveProject(projectId, actor);
  revalidatePath("/admin/projects");
  revalidatePath(`/admin/projects/${projectId}`);
  redirect(`/admin/projects/${projectId}`);
}

export async function addEvidenceForm(formData: FormData): Promise<void> {
  await requireActor();
  const projectId = requireField(formData, "projectId");

  const type = String(formData.get("type") ?? "");
  const base = {
    label: String(formData.get("label") ?? ""),
    description: String(formData.get("description") ?? "") || undefined,
    url: String(formData.get("url") ?? "") || undefined,
  };

  let candidate: unknown;
  if (type === "measurement" || type === "before_after") {
    candidate = {
      type,
      ...base,
      data: {
        metric: String(formData.get("metric") ?? ""),
        before: String(formData.get("before") ?? ""),
        after: String(formData.get("after") ?? ""),
        unit: String(formData.get("unit") ?? "") || undefined,
      },
    };
  } else {
    candidate = { type, ...base };
  }

  const parsed = evidenceCreateSchema.safeParse(candidate);
  if (!parsed.success) {
    redirect(
      `/admin/projects/${projectId}?evidenceError=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid evidence.")}`,
    );
  }

  await projectService.addEvidence(projectId, parsed.data);
  revalidatePath(`/admin/projects/${projectId}`);
  redirect(`/admin/projects/${projectId}`);
}

export async function removeEvidenceForm(formData: FormData): Promise<void> {
  await requireActor();
  const projectId = requireField(formData, "projectId");
  const evidenceId = requireField(formData, "evidenceId");
  await projectService.removeEvidence(projectId, evidenceId);
  revalidatePath(`/admin/projects/${projectId}`);
  redirect(`/admin/projects/${projectId}`);
}

export { tiptapDocToPlainText };
