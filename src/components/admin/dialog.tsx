"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** Native modal behavior supplies focus trapping, background inertness and Escape. */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  alert = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  children: ReactNode;
  alert?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;
    const dialog = ref.current;
    if (!dialog) return;
    const trigger = document.activeElement;
    dialog.showModal();
    return () => {
      dialog.close();
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus();
    };
  }, [open]);

  if (!open) return null;
  // Portals keep dialog forms out of editor forms and clipped/scrolling panels.
  return createPortal(
    <dialog
      ref={ref}
      role={alert ? "alertdialog" : "dialog"}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const controls = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]',
          ),
        ).filter((element) => element.getClientRects().length > 0);
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="rounded-panel border-border bg-surface text-text fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto border p-6 shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm md:p-8"
    >
      <h2 id={titleId} className="font-sans text-xl font-semibold">
        {title}
      </h2>
      <p
        id={descriptionId}
        className="text-text-muted mt-3 font-sans text-sm leading-relaxed"
      >
        {description}
      </p>
      {children}
    </dialog>,
    document.body,
  );
}

export const dialogCancelClass =
  "rounded-card border-border text-text hover:bg-surface-2 border px-4 py-2.5 font-sans text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
export const dialogConfirmClass =
  "rounded-card bg-accent text-bg px-4 py-2.5 font-sans text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
