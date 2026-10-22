"use client";

import { useRef, useState, type ReactNode } from "react";

/** Evidence is independent of the draft. Never navigate or reset sibling fields. */
export function EvidenceForm({
  action,
  className,
  children,
}: {
  action: (
    data: FormData,
  ) => Promise<void | { error?: string; fieldErrors?: Record<string, string> }>;
  className?: string;
  children: ReactNode;
}) {
  const inFlight = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  return (
    <form
      className={className}
      onSubmit={async (event) => {
        event.preventDefault();
        if (inFlight.current) return;
        const data = new FormData(event.currentTarget);
        inFlight.current = true;
        setPending(true);
        setError(undefined);
        try {
          const result = await action(data);
          setError(
            result?.error ??
              (result?.fieldErrors
                ? Object.entries(result.fieldErrors)
                    .map(([field, message]) => `${field}: ${message}`)
                    .join("; ")
                : undefined),
          );
        } catch {
          setError(
            "Couldn't update evidence. Your entries are still here; please try again.",
          );
        } finally {
          inFlight.current = false;
          setPending(false);
        }
      }}
      aria-busy={pending}
    >
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
      {error ? (
        <p role="alert" className="text-text font-sans text-sm">
          {error}
        </p>
      ) : null}
    </form>
  );
}
