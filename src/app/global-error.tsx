"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";

import { reportClientError } from "@/lib/report-client-error";

/**
 * Last resort when the root layout itself fails. It replaces the whole
 * document, so global CSS and fonts don't apply: styles are inline and
 * follow the visitor's OS colour scheme.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    reportClientError(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: 24,
          fontFamily: "system-ui, -apple-system, Segoe UI, Helvetica, Arial, sans-serif",
          colorScheme: "light dark",
          background: "Canvas",
          color: "CanvasText",
        }}
      >
        <title>Something went wrong</title>
        <main style={{ maxWidth: 520 }}>
          <p
            style={{
              fontSize: 12,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              opacity: 0.6,
            }}
          >
            Error
          </p>
          <h1 style={{ fontSize: 32, lineHeight: 1.15, margin: "12px 0" }}>
            The site didn&apos;t load properly.
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.5, opacity: 0.75 }}>
            It&apos;s on our side, not yours, and it has been reported. Try again in a
            moment.
          </p>
          {error.digest ? (
            <p
              style={{
                fontFamily: "ui-monospace, Menlo, monospace",
                fontSize: 12,
                opacity: 0.6,
              }}
            >
              Reference: {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => retry()}
            style={{
              marginTop: 16,
              padding: "12px 22px",
              borderRadius: 999,
              border: 0,
              font: "inherit",
              fontSize: 14,
              background: "CanvasText",
              color: "Canvas",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
