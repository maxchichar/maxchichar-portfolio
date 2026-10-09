"use client";

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
    <form
      action={deleteMediaForm}
      onSubmit={(e) => {
        if (!window.confirm(`Delete "${filename}" permanently? This cannot be undone.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="mediaId" value={mediaId} />
      {compact ? <input type="hidden" name="returnTo" value="library" /> : null}
      <button
        type="submit"
        aria-label={compact ? `Delete ${filename}` : undefined}
        className={
          compact
            ? "rounded-card border-border text-text-muted hover:border-accent hover:text-accent border px-2.5 py-1 font-mono text-xs transition-colors"
            : "rounded-card border-border text-text-muted hover:border-accent hover:text-accent border px-4 py-2 font-sans text-sm transition-colors"
        }
      >
        {compact ? "Delete" : "Delete media"}
      </button>
    </form>
  );
}
