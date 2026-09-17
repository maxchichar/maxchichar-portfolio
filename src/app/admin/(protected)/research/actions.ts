"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/config";
import { evidenceCreateSchema } from "@/lib/validation/evidence";
import { plainTextToTiptapDoc, tiptapDocToPlainText } from "@/lib/validation/project";
import {
  RESEARCH_SECTION_KEYS,
  researchDraftUpdateSchema,
} from "@/lib/validation/research";
import * as researchService from "@/server/services/research";

// Every action re-checks auth() itself, server-side — the route-group
// layout protects page navigation, not individual mutations, matching
// projects/actions.ts's requireActor.
async function requireActor() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not authenticated.");
  }
  return { id: session.user.id, type: "HUMAN" as const };
}

function requireField(formData: FormData, name: string): string {
  const value = formData.get(name);
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing required field: ${name}`);
  }
  return value;
}

export async function ensureDraftForm(formData: FormData): Promise<void> {
  const actor = await requireActor();
  const researchId = requireField(formData, "researchId");
  await researchService.ensureDraft(researchId, actor);
  revalidatePath(`/admin/research/${researchId}`);
  redirect(`/admin/research/${researchId}`);
}

export async function saveDraftForm(formData: FormData): Promise<void> {
  const actor = await requireActor();
  const researchId = requireField(formData, "researchId");

  const sections = RESEARCH_SECTION_KEYS.map((key) => {
    const text = String(formData.get(`section_${key}`) ?? "").trim();
    if (!text) return null;
    return {
      key,
      heading: String(formData.get(`heading_${key}`) ?? key),
      content: plainTextToTiptapDoc(text),
    };
  }).filter((s): s is NonNullable<typeof s> => s !== null);

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

  const parsed = researchDraftUpdateSchema.safeParse({
    title: formData.get("title"),
    type: formData.get("type"),
    abstract: formData.get("abstract"),
    category: formData.get("category") || null,
    sections,
    tags,
    coverMediaId,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  await researchService.saveDraft(researchId, parsed.data, actor);
  revalidatePath(`/admin/research/${researchId}`);
  redirect(`/admin/research/${researchId}`);
}

export async function publishResearchForm(formData: FormData): Promise<void> {
  const actor = await requireActor();
  const researchId = requireField(formData, "researchId");
  await researchService.publishResearch(researchId, actor);
  revalidatePath(`/admin/research/${researchId}`);
  revalidatePath("/admin/research");
  redirect(`/admin/research/${researchId}`);
}

export async function rollbackResearchForm(formData: FormData): Promise<void> {
  const actor = await requireActor();
  const researchId = requireField(formData, "researchId");
  const targetVersionId = requireField(formData, "targetVersionId");
  await researchService.rollbackResearch(researchId, targetVersionId, actor);
  revalidatePath(`/admin/research/${researchId}`);
  redirect(`/admin/research/${researchId}`);
}

export async function archiveResearchForm(formData: FormData): Promise<void> {
  const actor = await requireActor();
  const researchId = requireField(formData, "researchId");
  await researchService.archiveResearch(researchId, actor);
  revalidatePath("/admin/research");
  revalidatePath(`/admin/research/${researchId}`);
  redirect(`/admin/research/${researchId}`);
}

export async function unarchiveResearchForm(formData: FormData): Promise<void> {
  const actor = await requireActor();
  const researchId = requireField(formData, "researchId");
  await researchService.unarchiveResearch(researchId, actor);
  revalidatePath("/admin/research");
  revalidatePath(`/admin/research/${researchId}`);
  redirect(`/admin/research/${researchId}`);
}

export async function addEvidenceForm(formData: FormData): Promise<void> {
  await requireActor();
  const researchId = requireField(formData, "researchId");

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
      `/admin/research/${researchId}?evidenceError=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid evidence.")}`,
    );
  }

  await researchService.addEvidence(researchId, parsed.data);
  revalidatePath(`/admin/research/${researchId}`);
  redirect(`/admin/research/${researchId}`);
}

export async function removeEvidenceForm(formData: FormData): Promise<void> {
  await requireActor();
  const researchId = requireField(formData, "researchId");
  const evidenceId = requireField(formData, "evidenceId");
  await researchService.removeEvidence(researchId, evidenceId);
  revalidatePath(`/admin/research/${researchId}`);
  redirect(`/admin/research/${researchId}`);
}

export { tiptapDocToPlainText };
