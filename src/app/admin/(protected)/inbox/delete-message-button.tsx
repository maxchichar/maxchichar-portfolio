"use client";

import { useActionState } from "react";
import { deleteInboxMessageForm } from "./actions";

export function DeleteMessageButton({
  id,
  name,
  view,
}: {
  id: string;
  name: string;
  view: string;
}) {
  const [state, action, pending] = useActionState(deleteInboxMessageForm, { error: "" });
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (
          !window.confirm(
            `Permanently delete the message from ${name}? This cannot be undone.`,
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="view" value={view} />
      <input type="hidden" name="confirmDelete" value="delete" />
      <button
        type="submit"
        disabled={pending}
        className="rounded-card border-border text-text hover:border-text/40 border px-3.5 py-2 font-sans text-xs transition-colors disabled:opacity-50"
      >
        {pending ? "Deleting…" : "Delete message"}
      </button>
      {state.error ? (
        <p role="alert" className="text-text-muted mt-2 font-sans text-xs">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
