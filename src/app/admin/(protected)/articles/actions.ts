"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/config";
import { plainTextToTiptapDoc, tiptapDocToPlainText } from "@/lib/validation/project";
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

export async function saveDraftForm(formData: FormData): Promise<void> {
  const actor = await requireActor();
  const articleId = requireField(formData, "articleId");

  const contentText = String(formData.get("content") ?? "");

  const parsed = articleDraftUpdateSchema.safeParse({
    title: formData.get("title"),
    excerpt: formData.get("excerpt"),
    category: formData.get("category") || null,
    content: plainTextToTiptapDoc(contentText),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  await articlesService.saveDraft(articleId, parsed.data, actor);
  revalidatePath(`/admin/articles/${articleId}`);
  redirect(`/admin/articles/${articleId}`);
}

export async function publishArticleForm(formData: FormData): Promise<void> {
  const actor = await requireActor();
  const articleId = requireField(formData, "articleId");
  await articlesService.publishArticle(articleId, actor);
  revalidatePath(`/admin/articles/${articleId}`);
  revalidatePath("/admin/articles");
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

export { tiptapDocToPlainText };
