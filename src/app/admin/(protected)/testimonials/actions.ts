"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/config";
import { deleteTestimonial, saveTestimonial } from "@/server/services/testimonials";

export interface TestimonialFormState {
  error?: string;
  /** What was submitted, so the form can refill itself after an error. */
  values?: {
    quote: string;
    authorName: string;
    authorRole: string;
    authorCompany: string;
    authorUrl: string;
    avatarMediaId: string | null;
    projectId: string;
    featured: boolean;
    visible: boolean;
    sortOrder: number;
  };
}

const text = (formData: FormData, key: string) => {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
};

function revalidatePublic() {
  revalidatePath("/");
  revalidatePath("/work", "layout");
  revalidatePath("/admin/testimonials");
}

export async function saveTestimonialForm(
  _prev: TestimonialFormState,
  formData: FormData,
): Promise<TestimonialFormState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated." };

  const id = formData.get("id");
  const result = await saveTestimonial(
    typeof id === "string" && id ? id : null,
    {
      quote: formData.get("quote"),
      authorName: formData.get("authorName"),
      authorRole: formData.get("authorRole"),
      authorCompany: formData.get("authorCompany"),
      authorUrl: formData.get("authorUrl"),
      avatarMediaId: formData.get("avatarMediaId"),
      projectId: formData.get("projectId"),
      featured: formData.get("featured"),
      visible: formData.get("visible"),
      sortOrder: formData.get("sortOrder"),
    },
    { id: session.user.id },
  );
  if (!result.success) {
    return {
      error: result.error,
      values: {
        quote: text(formData, "quote"),
        authorName: text(formData, "authorName"),
        authorRole: text(formData, "authorRole"),
        authorCompany: text(formData, "authorCompany"),
        authorUrl: text(formData, "authorUrl"),
        avatarMediaId: text(formData, "avatarMediaId") || null,
        projectId: text(formData, "projectId"),
        featured: formData.get("featured") === "on",
        visible: formData.get("visible") === "on",
        sortOrder: Number(text(formData, "sortOrder")) || 0,
      },
    };
  }

  revalidatePublic();
  redirect("/admin/testimonials?saved=1");
}

export async function deleteTestimonialForm(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/admin/login");
  const id = formData.get("id");
  if (typeof id !== "string" || !id) redirect("/admin/testimonials");

  const result = await deleteTestimonial(id, { id: session.user.id });
  revalidatePublic();
  redirect(
    result.success
      ? "/admin/testimonials?deleted=1"
      : `/admin/testimonials?error=${encodeURIComponent(result.error)}`,
  );
}
