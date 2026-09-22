"use client";

import { deleteMediaForm } from "../actions";

export function DeleteMediaButton({
  mediaId,
  filename,
}: {
  mediaId: string;
  filename: string;
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
      <button
        type="submit"
        className="rounded-card border-border text-text-muted hover:border-accent hover:text-accent border px-4 py-2 font-sans text-sm transition-colors"
      >
        Delete media
      </button>
    </form>
  );
}
