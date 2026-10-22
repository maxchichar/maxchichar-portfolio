"use client";

import { useEffect, useRef, useState } from "react";

import { Dialog, dialogCancelClass, dialogConfirmClass } from "@/components/admin/dialog";

/**
 * Tracks unsaved edits in the draft form (by id) and shows a live status.
 * Warns before leaving the page with unsaved changes, and before submitting
 * any form marked `data-needs-saved` (e.g. Publish — which publishes the
 * last *saved* draft, so unsaved edits would silently not be included).
 */
export function UnsavedGuard({ formId }: { formId: string }) {
  const [dirty, setDirty] = useState(false);
  const [publishRequest, setPublishRequest] = useState<{
    form: HTMLFormElement;
    submitter: HTMLElement | null;
  } | null>(null);
  const approved = useRef<HTMLFormElement | null>(null);

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
      const target = e.target;
      if (
        !(target instanceof HTMLFormElement) ||
        !target.hasAttribute("data-needs-saved")
      )
        return;
      if (approved.current === target) {
        approved.current = null;
        return;
      }
      e.preventDefault();
      e.stopImmediatePropagation();
      setPublishRequest({ form: target, submitter: e.submitter });
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("submit", onSubmit, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("submit", onSubmit, true);
    };
  }, [dirty]);

  return (
    <>
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
      <Dialog
        open={publishRequest !== null}
        onClose={() => setPublishRequest(null)}
        title="Publish without saving?"
        description="You have unsaved changes. Publishing uses the last saved draft, so these edits will not be included."
        alert
      >
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            autoFocus
            className={dialogCancelClass}
            onClick={() => setPublishRequest(null)}
          >
            Keep editing
          </button>
          <button
            type="button"
            className={dialogConfirmClass}
            onClick={() => {
              if (!publishRequest) return;
              const { form, submitter } = publishRequest;
              approved.current = form;
              setPublishRequest(null);
              form.requestSubmit(
                submitter instanceof HTMLButtonElement ||
                  submitter instanceof HTMLInputElement
                  ? submitter
                  : undefined,
              );
              approved.current = null;
            }}
          >
            Publish saved draft
          </button>
        </div>
      </Dialog>
    </>
  );
}
