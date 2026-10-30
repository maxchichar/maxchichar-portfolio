"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

import { sendInboxReplyForm, type ReplyFormState } from "./actions";

function SendButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-card bg-accent text-bg px-4 py-2 font-sans text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      {pending ? "Sending…" : "Send reply"}
    </button>
  );
}

const fieldClass =
  "rounded-card border-border bg-bg text-text focus:border-text/40 w-full border px-3 py-2 font-sans text-sm outline-none";

export function ReplyForm({
  id,
  to,
  from,
  defaultSubject,
}: {
  id: string;
  to: string;
  from: string;
  defaultSubject: string;
}) {
  const [state, action] = useActionState<ReplyFormState, FormData>(sendInboxReplyForm, {
    error: "",
    sentAt: null,
  });
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // Clear the draft once a reply has gone out.
  useEffect(() => {
    if (state.sentAt && bodyRef.current) bodyRef.current.value = "";
  }, [state.sentAt]);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <dl className="text-text-muted grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-xs">
        <dt>From</dt>
        <dd className="text-text truncate">{from}</dd>
        <dt>To</dt>
        <dd className="text-text truncate">{to}</dd>
      </dl>
      <label className="block">
        <span className="sr-only">Subject</span>
        <input
          name="subject"
          defaultValue={defaultSubject}
          required
          maxLength={200}
          className={fieldClass}
        />
      </label>
      <label className="block">
        <span className="sr-only">Reply</span>
        <textarea
          ref={bodyRef}
          name="body"
          required
          rows={7}
          maxLength={20000}
          placeholder="Write your reply…"
          className={`${fieldClass} font-serif text-base leading-relaxed`}
        />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <SendButton />
        {state.error ? (
          <p role="alert" className="text-text-muted font-sans text-xs">
            {state.error}
          </p>
        ) : state.sentAt ? (
          <p role="status" className="text-text font-sans text-xs">
            Reply sent.
          </p>
        ) : null}
      </div>
    </form>
  );
}
