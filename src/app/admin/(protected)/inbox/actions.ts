"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/config";
import { INBOX_STATUSES, type InboxStatus } from "@/server/repositories/contact";
import { setSubmissionStatus } from "@/server/services/contact";

export async function setInboxStatusForm(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated.");

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as InboxStatus;
  if (!id || !INBOX_STATUSES.includes(status)) throw new Error("Invalid request.");

  await setSubmissionStatus(id, status, session.user.id);
  revalidatePath("/admin/inbox");
  revalidatePath("/admin");
  const back = String(formData.get("back") ?? "/admin/inbox");
  redirect(back.startsWith("/admin/inbox") ? back : "/admin/inbox");
}
