"use client";
import { ConfirmForm } from "@/components/admin/confirm-form";
import { deleteTestimonialForm } from "../actions";
export function DeleteTestimonialButton({ id, author }: { id: string; author: string }) {
  return (
    <ConfirmForm
      action={deleteTestimonialForm}
      title="Delete testimonial?"
      description={`Permanently delete the testimonial from ${author}? This cannot be undone.`}
      label="Delete"
      confirmLabel="Delete testimonial"
    >
      <input type="hidden" name="id" value={id} />
    </ConfirmForm>
  );
}
