"use client";

import { useActionState } from "react";
import { ConfirmForm } from "@/components/admin/confirm-form";
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
  const [state, action] = useActionState(deleteInboxMessageForm, { error: "" });
  return (
    <div className="col-span-2 sm:col-span-1">
      <ConfirmForm
        action={action}
        title="Delete message?"
        description={`Permanently delete the message from ${name}? This cannot be undone.`}
        label="Delete message"
        buttonClassName="rounded-card border-border text-text hover:border-text/40 w-full border px-3.5 py-2.5 font-sans text-xs transition-colors disabled:opacity-50 sm:w-auto sm:py-2"
      >
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="view" value={view} />
        <input type="hidden" name="confirmDelete" value="delete" />
      </ConfirmForm>
      {state.error ? (
        <p role="alert" className="text-text-muted mt-2 font-sans text-xs">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
