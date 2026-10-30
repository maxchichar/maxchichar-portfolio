"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/config";
import { evidenceCreateSchema } from "@/lib/validation/evidence";
import { projectCreateSchema } from "@/lib/validation/project";
import { parseProjectDraftForm } from "@/lib/validation/project-form";
import * as projectService from "@/server/services/projects";
import { announceToSearchEngines } from "@/server/services/indexnow";

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
  revalidatePath("/", "layout");
  redirect(`/admin/projects/${projectId}`);
}

export async function ensureDraftForm(formData: FormData): Promise<void> {
  const actor = await requireActor();
  const projectId = requireField(formData, "projectId");
  await projectService.ensureDraft(projectId, actor);
  revalidatePath(`/admin/projects/${projectId}`);
  redirect(`/admin/projects/${projectId}`);
}

async function saveSubmittedDraft(formData: FormData) {
  const actor = await requireActor();
  const projectId = requireField(formData, "projectId");

  const patch = parseProjectDraftForm(formData);

  await projectService.ensureDraft(projectId, actor);
  await projectService.saveDraft(projectId, patch, actor);
  revalidatePath(`/admin/projects/${projectId}`);
  return { projectId, actor };
}

export async function saveDraftForm(formData: FormData): Promise<void> {
  const { projectId } = await saveSubmittedDraft(formData);
  redirect(`/admin/projects/${projectId}`);
}

export async function previewProjectForm(formData: FormData): Promise<void> {
  const { projectId } = await saveSubmittedDraft(formData);
  redirect(`/preview/work/${projectId}`);
}

export async function publishProjectForm(formData: FormData): Promise<void> {
  const { projectId, actor } = await saveSubmittedDraft(formData);
  await projectService.publishProject(projectId, actor);
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath("/admin/projects");
  revalidatePath("/", "layout");
  announceToSearchEngines(async () => {
    const state = await projectService.getProjectFullState(projectId);
    return state ? [`/work/${state.project.slug}`, "/work", "/"] : [];
  });
  redirect(`/admin/projects/${projectId}`);
}

export async function rollbackProjectForm(formData: FormData): Promise<void> {
  const actor = await requireActor();
  const projectId = requireField(formData, "projectId");
  const targetVersionId = requireField(formData, "targetVersionId");
  await projectService.rollbackProject(projectId, targetVersionId, actor);
  revalidatePath("/", "layout");
  revalidatePath(`/admin/projects/${projectId}`);
  redirect(`/admin/projects/${projectId}`);
}

export async function archiveProjectForm(formData: FormData): Promise<void> {
  const actor = await requireActor();
  const projectId = requireField(formData, "projectId");
  await projectService.archiveProject(projectId, actor);
  revalidatePath("/", "layout");
  revalidatePath("/admin/projects");
  revalidatePath(`/admin/projects/${projectId}`);
  redirect(`/admin/projects/${projectId}`);
}

export async function unarchiveProjectForm(formData: FormData): Promise<void> {
  const actor = await requireActor();
  const projectId = requireField(formData, "projectId");
  await projectService.unarchiveProject(projectId, actor);
  revalidatePath("/", "layout");
  revalidatePath("/admin/projects");
  revalidatePath(`/admin/projects/${projectId}`);
  redirect(`/admin/projects/${projectId}`);
}

export async function addEvidenceForm(formData: FormData): Promise<{ error?: string }> {
  await requireActor();
  const projectId = requireField(formData, "projectId");

  const type = String(formData.get("type") ?? "");
  const base = {
    mediaId: formData.get("mediaId") || null,
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
    return { error: parsed.error.issues[0]?.message ?? "Invalid evidence." };
  }

  await projectService.addEvidence(projectId, parsed.data);
  revalidatePath(`/admin/projects/${projectId}`);
  return {};
}

export async function removeEvidenceForm(formData: FormData): Promise<void> {
  await requireActor();
  const projectId = requireField(formData, "projectId");
  const evidenceId = requireField(formData, "evidenceId");
  await projectService.removeEvidence(projectId, evidenceId);
  revalidatePath(`/admin/projects/${projectId}`);
}

export async function deleteProjectForm(formData: FormData): Promise<void> {
  const actor = await requireActor();
  const projectId = requireField(formData, "projectId");
  if (formData.get("confirmDelete") !== "delete") {
    throw new Error("Confirm permanent deletion first.");
  }
  const project = await projectService.deleteArchivedProject(projectId, actor);
  revalidatePath(`/work/${project.slug}`);
  revalidatePath("/", "layout");
  redirect("/admin/projects");
}
