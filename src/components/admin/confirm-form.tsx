"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Dialog, dialogCancelClass, dialogConfirmClass } from "./dialog";

function Trigger({ label, className }: { label: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={
        className ??
        "rounded-card border-border text-text hover:border-text/40 border px-3.5 py-2 font-sans text-xs transition-colors disabled:opacity-50"
      }
    >
      {pending ? "Working…" : label}
    </button>
  );
}

/** The initial submit only opens the dialog; confirmation submits the real form once. */
export function ConfirmForm({
  action,
  title,
  description,
  label,
  confirmLabel = label,
  children,
  className,
  buttonClassName,
}: {
  action: (data: FormData) => void | Promise<void>;
  title: string;
  description: string;
  label: string;
  confirmLabel?: string;
  children?: ReactNode;
  className?: string;
  buttonClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const confirmed = useRef(false);
  const id = useId();
  return (
    <form
      ref={form}
      id={id}
      action={action}
      className={className}
      onSubmit={(event) => {
        if (!confirmed.current) {
          event.preventDefault();
          setOpen(true);
          return;
        }
        confirmed.current = false;
        setOpen(false);
      }}
    >
      {children}
      <Trigger label={label} className={buttonClassName} />
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        description={description}
        alert
      >
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            autoFocus
            className={dialogCancelClass}
            onClick={() => setOpen(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className={dialogConfirmClass}
            onClick={() => {
              confirmed.current = true;
              form.current?.requestSubmit();
              confirmed.current = false;
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </Dialog>
    </form>
  );
}
