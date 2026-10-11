"use client";

import { useSyncExternalStore } from "react";

import { openCommandPalette, prefetchCommandPalette } from "./open";

const noop = () => () => {};
const isApple = () =>
  /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);

/**
 * Nav entry point for the command palette. The shortcut hint (⌘K or Ctrl K)
 * is resolved on the client, so it matches the visitor's platform without a
 * hydration mismatch; touch visitors just see the icon.
 */
export function SearchButton({ className = "" }: { className?: string }) {
  const apple = useSyncExternalStore(noop, isApple, () => null);
  return (
    <button
      type="button"
      onClick={openCommandPalette}
      onPointerEnter={prefetchCommandPalette}
      onFocus={prefetchCommandPalette}
      aria-label="Search"
      aria-keyshortcuts={apple === null ? undefined : apple ? "Meta+K" : "Control+K"}
      title="Search"
      className={`text-text-muted hover:text-text border-border hover:border-text/30 flex h-10 items-center gap-2 rounded-full transition-colors md:border md:px-3 ${className}`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        className="mx-auto h-[18px] w-[18px] md:mx-0"
      >
        <circle cx="9" cy="9" r="5.5" />
        <path d="M13 13l4 4" />
      </svg>
      {apple !== null ? (
        <kbd className="hidden font-mono text-[11px] tracking-wide md:inline">
          {apple ? "⌘K" : "Ctrl K"}
        </kbd>
      ) : null}
    </button>
  );
}
