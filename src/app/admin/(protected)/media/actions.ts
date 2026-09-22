"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/config";
import { altTextUpdateSchema } from "@/lib/validation/media";
import * as mediaService from "@/server/services/media";

// Re-checks auth() itself, server-side — the route-group layout protects
// page navigation, not individual mutations, matching every other
// actions.ts in this codebase.
async function requireActor() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not authenticated.");
  }
  return { id: session.user.id };
}

function requireField(formData: FormData, name: string): string {
  const value = formData.get(name);
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing required field: ${name}`);
  }
  return value;
}

export async function updateAltTextForm(formData: FormData): Promise<void> {
  const actor = await requireActor();
  const mediaId = requireField(formData, "mediaId");

  const parsed = altTextUpdateSchema.safeParse({
    altText: formData.get("altText") || null,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  await mediaService.updateAltText(mediaId, parsed.data.altText ?? null, actor);
  revalidatePath(`/admin/media/${mediaId}`);
  redirect(`/admin/media/${mediaId}?saved=1`);
}
