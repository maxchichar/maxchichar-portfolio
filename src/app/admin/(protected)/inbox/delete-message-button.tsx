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
    <div>
      <ConfirmForm
        action={action}
        title="Delete message?"
        description={`Permanently delete the message from ${name}? This cannot be undone.`}
        label="Delete message"
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
