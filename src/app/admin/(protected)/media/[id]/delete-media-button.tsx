"use client";

import { ConfirmForm } from "@/components/admin/confirm-form";

import { deleteMediaForm } from "../actions";

export function DeleteMediaButton({
  mediaId,
  filename,
  compact = false,
}: {
  mediaId: string;
  filename: string;
  /** Small variant for library tiles; errors return to the library. */
  compact?: boolean;
}) {
  return (
    <ConfirmForm
      action={deleteMediaForm}
      title="Delete media?"
      description={`Permanently delete “${filename}”? This cannot be undone.`}
      label={compact ? "Delete" : "Delete media"}
      confirmLabel="Delete media"
      buttonClassName={
        compact
          ? "rounded-card border-border text-text-muted hover:border-accent hover:text-accent w-full border px-2 py-2 font-mono text-xs whitespace-nowrap transition-colors disabled:opacity-50 sm:py-1.5"
          : "rounded-card border-border text-text hover:border-text/40 w-full border px-3.5 py-2.5 font-sans text-sm transition-colors disabled:opacity-50 sm:w-auto sm:py-2 sm:text-xs"
      }
    >
      <input type="hidden" name="mediaId" value={mediaId} />
      {compact ? <input type="hidden" name="returnTo" value="library" /> : null}
    </ConfirmForm>
  );
}
