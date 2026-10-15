"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/config";
import { parseRichTextField } from "@/lib/validation/project";
import { articleDraftUpdateSchema } from "@/lib/validation/article";
import * as articlesService from "@/server/services/articles";

// Every action re-checks auth() itself, server-side — the route-group
// layout protects page navigation, not individual mutations, matching
// research/actions.ts's requireActor.
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
  const articleId = requireField(formData, "articleId");
  await articlesService.ensureDraft(articleId, actor);
  revalidatePath(`/admin/articles/${articleId}`);
  redirect(`/admin/articles/${articleId}`);
}

/** Repairs lost formatting into the draft (creating it if needed). */
export async function fixFormattingForm(formData: FormData): Promise<void> {
  const actor = await requireActor();
  const articleId = requireField(formData, "articleId");
  await articlesService.fixDraftFormatting(articleId, actor);
  revalidatePath(`/admin/articles/${articleId}`);
  redirect(`/admin/articles/${articleId}?fixed=1`);
}

async function saveSubmittedDraft(formData: FormData) {
  const actor = await requireActor();
  const articleId = requireField(formData, "articleId");

  const content = parseRichTextField(requireField(formData, "content"));

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

  const parsed = articleDraftUpdateSchema.safeParse({
    title: formData.get("title"),
    excerpt: formData.get("excerpt"),
    category: formData.get("category") || null,
    content,
    tags,
    coverMediaId,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  await articlesService.saveDraft(articleId, parsed.data, actor);
  revalidatePath(`/admin/articles/${articleId}`);
  return { articleId, actor };
}

export async function saveDraftForm(formData: FormData): Promise<void> {
  const { articleId } = await saveSubmittedDraft(formData);
  redirect(`/admin/articles/${articleId}`);
}

export async function previewArticleForm(formData: FormData): Promise<void> {
  const { articleId } = await saveSubmittedDraft(formData);
  redirect(`/preview/writing/${articleId}`);
}

export async function publishArticleForm(formData: FormData): Promise<void> {
  const { articleId, actor } = await saveSubmittedDraft(formData);
  try {
    await articlesService.publishArticle(articleId, actor);
  } catch (error) {
    if (!(error instanceof articlesService.ArticleServiceError)) throw error;
    redirect(`/admin/articles/${articleId}?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath(`/admin/articles/${articleId}`);
  revalidatePath("/admin/articles");
  revalidatePath("/", "layout");
  redirect(`/admin/articles/${articleId}`);
}

export async function rollbackArticleForm(formData: FormData): Promise<void> {
  const actor = await requireActor();
  const articleId = requireField(formData, "articleId");
  const targetVersionId = requireField(formData, "targetVersionId");
  await articlesService.rollbackArticle(articleId, targetVersionId, actor);
  revalidatePath(`/admin/articles/${articleId}`);
  redirect(`/admin/articles/${articleId}`);
}

export async function archiveArticleForm(formData: FormData): Promise<void> {
  const actor = await requireActor();
  const articleId = requireField(formData, "articleId");
  await articlesService.archiveArticle(articleId, actor);
  revalidatePath("/admin/articles");
  revalidatePath(`/admin/articles/${articleId}`);
  redirect(`/admin/articles/${articleId}`);
}

export async function unarchiveArticleForm(formData: FormData): Promise<void> {
  const actor = await requireActor();
  const articleId = requireField(formData, "articleId");
  await articlesService.unarchiveArticle(articleId, actor);
  revalidatePath("/admin/articles");
  revalidatePath(`/admin/articles/${articleId}`);
  redirect(`/admin/articles/${articleId}`);
}

export async function deleteArticleForm(formData: FormData): Promise<void> {
  const actor = await requireActor();
  const articleId = requireField(formData, "articleId");
  if (formData.get("confirmDelete") !== "delete") {
    throw new Error("Confirm permanent deletion first.");
  }
  const article = await articlesService.deleteArchivedArticle(articleId, actor);
  revalidatePath("/admin/articles");
  revalidatePath(`/admin/articles/${articleId}`);
  revalidatePath(`/writing/${article.slug}`);
  revalidatePath("/writing");
  revalidatePath("/");
  revalidatePath("/api/search");
  revalidatePath("/feed.xml");
  revalidatePath("/sitemap.xml");
  redirect("/admin/articles");
}
