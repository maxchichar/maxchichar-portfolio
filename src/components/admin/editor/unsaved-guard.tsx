"use client";

import { useEffect, useState } from "react";

/**
 * Tracks unsaved edits in the draft form (by id) and shows a live status.
 * Warns before leaving the page with unsaved changes, and before submitting
 * any form marked `data-needs-saved` (e.g. Publish — which publishes the
 * last *saved* draft, so unsaved edits would silently not be included).
 */
export function UnsavedGuard({ formId }: { formId: string }) {
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const form = document.getElementById(formId);
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

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    const onSubmit = (e: SubmitEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.hasAttribute("data-needs-saved")) return;
      const ok = window.confirm(
        "You have unsaved changes. Publishing uses the last saved draft, so these edits won't be included. Publish anyway?",
      );
      if (!ok) e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("submit", onSubmit, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("submit", onSubmit, true);
    };
  }, [dirty]);

  return (
    <p
      role="status"
      className="text-text-muted flex items-center gap-2 font-sans text-xs"
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${dirty ? "bg-accent animate-pulse" : "bg-text-muted/50"}`}
      />
      {dirty ? "Unsaved changes" : "No unsaved changes"}
    </p>
  );
}
