"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/config";
import { contentSchemaForSlug, PAGE_SLUGS, type PageSlug } from "@/lib/validation/page";
import * as pagesService from "@/server/services/pages";

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

// Field lists per slug, matching validation/page.ts's three schemas
// exactly — used to pull the right form fields for whichever page is
// being saved, since each shape is genuinely different (Decision 2).
const FIELDS_BY_SLUG: Record<PageSlug, readonly string[]> = {
  home: [
    "heroEyebrow",
    "heroHeadline",
    "heroBody",
    "heroPrimaryCtaLabel",
    "heroPrimaryCtaHref",
    "heroSecondaryCtaLabel",
    "heroSecondaryCtaHref",
    "currentFocusSummary",
  ],
  about: [
    "intro",
    "bio",
    "whatIBuild",
    "howIThink",
    "interests",
    "capabilities",
    "direction",
  ],
  now: [
    "currentlyBuilding",
    "researching",
    "learning",
    "interests",
    "thesis",
    "recentChanges",
  ],
};

export async function ensureDraftForm(formData: FormData): Promise<void> {
  const actor = await requireActor();
  const pageId = requireField(formData, "pageId");
  const slug = requireField(formData, "slug");
  await pagesService.ensureDraft(pageId, actor);
  revalidatePath(`/admin/pages/${slug}`);
  redirect(`/admin/pages/${slug}`);
}

export async function saveDraftForm(formData: FormData): Promise<void> {
  const actor = await requireActor();
  const pageId = requireField(formData, "pageId");
  const slug = requireField(formData, "slug");

  if (!isPageSlug(slug)) {
    throw new Error(`Unknown page slug: ${slug}`);
  }

  const fields = Object.fromEntries(
    FIELDS_BY_SLUG[slug].map((name) => [name, String(formData.get(name) ?? "")]),
  );

  const parsed = contentSchemaForSlug(slug).safeParse({ slug, ...fields });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  await pagesService.saveDraft(pageId, parsed.data, actor);
  revalidatePath(`/admin/pages/${slug}`);
  redirect(`/admin/pages/${slug}`);
}

export async function publishPageForm(formData: FormData): Promise<void> {
  const actor = await requireActor();
  const pageId = requireField(formData, "pageId");
  const slug = requireField(formData, "slug");
  await pagesService.publishPage(pageId, actor);
  revalidatePath(`/admin/pages/${slug}`);
  revalidatePath("/admin/pages");
  redirect(`/admin/pages/${slug}`);
}

export async function rollbackPageForm(formData: FormData): Promise<void> {
  const actor = await requireActor();
  const pageId = requireField(formData, "pageId");
  const slug = requireField(formData, "slug");
  const targetVersionId = requireField(formData, "targetVersionId");
  await pagesService.rollbackPage(pageId, targetVersionId, actor);
  revalidatePath(`/admin/pages/${slug}`);
  redirect(`/admin/pages/${slug}`);
}
