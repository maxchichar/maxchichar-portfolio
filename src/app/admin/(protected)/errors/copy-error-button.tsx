"use client";

import { useEffect, useState } from "react";

/** Clipboard API first; a hidden textarea where it's unavailable (non-secure context). */
async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}

/** Copies a plain-text report of an error, ready to paste into an issue or a chat. */
export function CopyErrorButton({ report }: { report: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (state === "idle") return;
    const timer = setTimeout(() => setState("idle"), 2000);
    return () => clearTimeout(timer);
  }, [state]);

  return (
    <button
      type="button"
      onClick={async () => setState((await copyText(report)) ? "copied" : "failed")}
      className="rounded-card border-border text-text hover:border-text/40 inline-flex w-full items-center justify-center gap-2 border px-4 py-2.5 font-sans text-sm transition-colors sm:w-auto sm:px-3.5 sm:py-1.5 sm:text-xs"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`h-4 w-4 shrink-0 sm:h-3.5 sm:w-3.5 ${state === "copied" ? "text-accent" : ""}`}
      >
        {state === "copied" ? (
          <path d="M4.5 10.5l3.5 3.5 7.5-8" />
        ) : (
          <>
            <rect x="7" y="7" width="9.5" height="9.5" rx="1.5" />
            <path d="M13 7V5a1.5 1.5 0 00-1.5-1.5h-6A1.5 1.5 0 004 5v6a1.5 1.5 0 001.5 1.5H7" />
          </>
        )}
      </svg>
      <span aria-live="polite">
        {state === "copied"
          ? "Copied"
          : state === "failed"
            ? "Couldn't copy"
            : "Copy error"}
      </span>
    </button>
  );
}
