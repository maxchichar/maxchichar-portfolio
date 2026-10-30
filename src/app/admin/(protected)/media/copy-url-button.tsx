"use client";

import { useState } from "react";

export function CopyUrlButton({
  url,
  compact = false,
}: {
  url: string;
  /** Library tiles: fills its grid cell and reads "Copy" on phones. */
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API can be unavailable (permissions, non-secure context).
      // Nothing destructive happened; just leave the button unchanged.
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={compact ? "Copy URL" : undefined}
      className={`rounded-card border-border text-text-muted hover:border-accent hover:text-accent shrink-0 border font-mono text-xs whitespace-nowrap transition-colors ${
        compact ? "w-full px-2 py-2 sm:py-1.5" : "px-3 py-1.5"
      }`}
    >
      {copied ? (
        "Copied"
      ) : compact ? (
        <>
          Copy<span className="hidden sm:inline"> URL</span>
        </>
      ) : (
        "Copy URL"
      )}
    </button>
  );
}
