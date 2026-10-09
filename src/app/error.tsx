"use client"; // Error boundaries must be Client Components

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="container-site flex min-h-[80svh] flex-col justify-center py-24">
      <p className="index-label">
        <span>Error</span>
        <span>Something went wrong</span>
      </p>
      <h1 className="text-h1 text-text mt-6 max-w-3xl font-sans font-semibold text-balance">
        This page didn&apos;t load properly.
      </h1>
      <p className="text-lede text-text-muted mt-6 max-w-xl font-serif">
        It&apos;s on our side, not yours. Try again, or head back to the homepage.
      </p>
      {error.digest ? (
        <p className="text-text-muted mt-4 font-mono text-xs">
          Reference: {error.digest}
        </p>
      ) : null}
      <div className="mt-10 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => retry()}
          className="bg-text text-bg hover:bg-accent rounded-full px-6 py-3 font-sans text-sm font-medium transition-colors"
        >
          Try again
        </button>
        <Link
          href="/"
          className="border-border text-text hover:border-accent hover:text-accent rounded-full border px-6 py-3 font-sans text-sm transition-colors"
        >
          Back home
        </Link>
      </div>
    </main>
  );
}
