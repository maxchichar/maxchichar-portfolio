"use client";

import { deleteTestimonialForm } from "../actions";

export function DeleteTestimonialButton({ id, author }: { id: string; author: string }) {
  return (
    <form
      action={deleteTestimonialForm}
      onSubmit={(e) => {
        if (!confirm(`Delete the testimonial from ${author}? This can't be undone.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="rounded-card border-border text-text-muted hover:border-text hover:text-text border px-3 py-1.5 font-sans text-xs transition-colors"
      >
        Delete
      </button>
    </form>
  );
}
