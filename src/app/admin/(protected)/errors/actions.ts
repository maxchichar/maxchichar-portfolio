"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth/config";
import { deleteError, setErrorResolved } from "@/server/services/errors";

export async function resolveErrorForm(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return;
  await setErrorResolved(id, formData.get("resolved") === "true");
  revalidatePath("/admin/errors");
}

export async function deleteErrorForm(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return;
  await deleteError(id);
  revalidatePath("/admin/errors");
}
