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
          ? "rounded-card border-border text-text-muted hover:border-accent hover:text-accent border px-2.5 py-1 font-mono text-xs transition-colors"
          : undefined
      }
    >
      <input type="hidden" name="mediaId" value={mediaId} />
      {compact ? <input type="hidden" name="returnTo" value="library" /> : null}
    </ConfirmForm>
  );
}
