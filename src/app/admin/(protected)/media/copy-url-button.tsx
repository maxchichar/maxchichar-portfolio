"use client";

import { useState } from "react";

export function CopyUrlButton({ url }: { url: string }) {
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
      className="rounded-card border-border text-text-muted hover:border-accent hover:text-accent border px-3 py-1.5 font-mono text-xs transition-colors"
    >
      {copied ? "Copied" : "Copy URL"}
    </button>
  );
}
