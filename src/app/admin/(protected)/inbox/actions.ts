"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/config";
import { INBOX_STATUSES, type InboxStatus } from "@/server/repositories/contact";
import {
  ContactServiceError,
  deleteSubmission,
  sendReply,
  setSubmissionStatus,
} from "@/server/services/contact";

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

export async function deleteInboxMessageForm(
  _previous: { error: string },
  formData: FormData,
): Promise<{ error: string }> {
  if (formData.get("confirmDelete") !== "delete") {
    return { error: "Confirm deletion before continuing." };
  }
  try {
    await deleteSubmission(String(formData.get("id") ?? ""));
  } catch (error) {
    return {
      error:
        error instanceof ContactServiceError
          ? error.message
          : "Unable to delete this message. Please try again.",
    };
  }
  revalidatePath("/admin/inbox");
  revalidatePath("/admin");
  const view = String(formData.get("view") ?? "");
  const query = new URLSearchParams({ deleted: "1" });
  if (view === "SENT" || INBOX_STATUSES.includes(view as InboxStatus)) {
    query.set("view", view);
  }
  redirect(`/admin/inbox?${query}`);
}

export interface ReplyFormState {
  error: string;
  sentAt: number | null;
}

export async function sendInboxReplyForm(
  _previous: ReplyFormState,
  formData: FormData,
): Promise<ReplyFormState> {
  try {
    await sendReply({
      id: formData.get("id"),
      subject: formData.get("subject"),
      body: formData.get("body"),
    });
  } catch (error) {
    return {
      error:
        error instanceof ContactServiceError
          ? error.message
          : "Unable to send this reply. Please try again.",
      sentAt: null,
    };
  }
  revalidatePath("/admin/inbox");
  revalidatePath("/admin");
  return { error: "", sentAt: Date.now() };
}
