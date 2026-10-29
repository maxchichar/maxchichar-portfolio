"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth/config";
import * as apiKeysService from "@/server/services/api-keys";

export type CreateKeyState = { key?: string; name?: string; error?: string } | null;

export async function createApiKeyAction(
  _prev: CreateKeyState,
  formData: FormData,
): Promise<CreateKeyState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not signed in." };
  try {
    const { key, row } = await apiKeysService.createApiKey(
      { name: String(formData.get("name") ?? ""), scopes: formData.getAll("scopes") },
      { id: session.user.id },
    );
    revalidatePath("/admin/api-keys");
    return { key, name: row.name };
  } catch (error) {
    if (error instanceof apiKeysService.ApiKeyServiceError)
      return { error: error.message };
    throw error;
  }
}

export async function revokeApiKeyForm(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return;
  await apiKeysService.revokeApiKey(id, { id: session.user.id });
  revalidatePath("/admin/api-keys");
}
