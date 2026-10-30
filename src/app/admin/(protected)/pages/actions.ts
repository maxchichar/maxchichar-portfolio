"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/config";
import { contentSchemaForSlug, PAGE_SLUGS, type PageSlug } from "@/lib/validation/page";
import * as pagesService from "@/server/services/pages";
import { announceToSearchEngines } from "@/server/services/indexnow";

import { pageFields } from "./fields";

// Every action re-checks auth() itself, server-side — the route-group
// layout protects page navigation, not individual mutations, matching
// every other actions.ts in this codebase.
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

function isPageSlug(value: string): value is PageSlug {
  return (PAGE_SLUGS as readonly string[]).includes(value);
}

// The page's own slug, looked up from its id — forms from the shared
// publish panel (Edit, Restore) only carry the id.
async function slugOf(pageId: string): Promise<PageSlug> {
  const state = await pagesService.getPageFullState(pageId);
  const slug = state?.page.slug;
  if (!slug || !isPageSlug(slug)) {
    throw new Error("Page not found.");
  }
  return slug;
}

export async function ensureDraftForm(formData: FormData): Promise<void> {
  const actor = await requireActor();
  const pageId = requireField(formData, "pageId");
  const slug = await slugOf(pageId);
  await pagesService.ensureDraft(pageId, actor);
  revalidatePath(`/admin/pages/${slug}`);
  redirect(`/admin/pages/${slug}`);
}

// Validates the submitted fields and saves them into the open draft. An
// invalid field sends the editor back with the message rather than throwing
// to the error page, so nothing typed is lost to a crash screen.
async function saveSubmittedDraft(formData: FormData) {
  const actor = await requireActor();
  const pageId = requireField(formData, "pageId");
  const slug = await slugOf(pageId);

  const fields = Object.fromEntries(
    pageFields(slug).map(({ name }) => [name, String(formData.get(name) ?? "").trim()]),
  );

  const parsed = contentSchemaForSlug(slug).safeParse({ slug, ...fields });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = pageFields(slug).find(({ name }) => name === issue?.path[0]);
    const message = `${field ? `${field.label}: ` : ""}${issue?.message ?? "Invalid input."}`;
    redirect(`/admin/pages/${slug}?error=${encodeURIComponent(message)}`);
  }

  // The form can outlive its draft (a second tab, or a repeat Publish click
  // after the first one already published it), so reopen one if needed
  // instead of failing the save.
  await pagesService.ensureDraft(pageId, actor);
  await pagesService.saveDraft(pageId, parsed.data, actor);
  revalidatePath(`/admin/pages/${slug}`);
  return { actor, pageId, slug };
}

export async function saveDraftForm(formData: FormData): Promise<void> {
  const { slug } = await saveSubmittedDraft(formData);
  redirect(`/admin/pages/${slug}?saved=1`);
}

export async function previewPageForm(formData: FormData): Promise<void> {
  const { slug } = await saveSubmittedDraft(formData);
  redirect(`/preview/page/${slug}`);
}

// Saves what's on screen first, so Publish never silently drops unsaved edits.
export async function publishPageForm(formData: FormData): Promise<void> {
  const { actor, pageId, slug } = await saveSubmittedDraft(formData);
  await pagesService.publishPage(pageId, actor);
  revalidatePath("/admin/pages");
  revalidatePath(slug === "home" ? "/" : `/${slug}`);
  announceToSearchEngines(() => [slug === "home" ? "/" : `/${slug}`]);
  redirect(`/admin/pages/${slug}?published=1`);
}

export async function rollbackPageForm(formData: FormData): Promise<void> {
  const actor = await requireActor();
  const pageId = requireField(formData, "pageId");
  const slug = await slugOf(pageId);
  const targetVersionId = requireField(formData, "targetVersionId");
  await pagesService.rollbackPage(pageId, targetVersionId, actor);
  revalidatePath(`/admin/pages/${slug}`);
  redirect(`/admin/pages/${slug}`);
}
