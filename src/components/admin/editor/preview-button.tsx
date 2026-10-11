"use client";

import { useEffect, useState } from "react";

/**
 * Opens the draft preview in a new tab. The preview shows the last *saved*
 * draft (like Publish), so while the form has unsaved edits a note says so.
 */
export function PreviewButton({ href, formId }: { href: string; formId?: string }) {
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const form = formId ? document.getElementById(formId) : null;
    if (!form) return;
    const markDirty = () => setDirty(true);
    const clear = () => setDirty(false);
    form.addEventListener("input", markDirty);
    form.addEventListener("change", markDirty);
    form.addEventListener("submit", clear);
    return () => {
      form.removeEventListener("input", markDirty);
      form.removeEventListener("change", markDirty);
      form.removeEventListener("submit", clear);
    };
  }, [formId]);

  return (
    <div>
      <a
        href={href}
        target="_blank"
        rel="noopener"
        className="rounded-card border-border text-text hover:border-text/40 flex w-full items-center justify-center gap-2 border px-4 py-2.5 font-sans text-sm font-medium transition-colors"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <path d="M1.5 10S4.5 4 10 4s8.5 6 8.5 6-3 6-8.5 6-8.5-6-8.5-6z" />
          <circle cx="10" cy="10" r="2.5" />
        </svg>
        Preview draft
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
      {dirty ? (
        <p role="status" className="text-text-muted mt-1.5 font-sans text-xs">
          Save the draft first to see your latest edits in the preview.
        </p>
      ) : null}
    </div>
  );
}
