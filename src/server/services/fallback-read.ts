import "server-only";

import { after } from "next/server";

import { withFallback } from "@/lib/with-fallback";

import { recordError } from "./errors";

/**
 * A page's content read that degrades to `fallback` instead of failing the
 * whole page, so a database outage leaves navigation and contact links
 * working. The failure is still logged and reported (error log + alert
 * email), after the response is sent.
 */
export function readOrFallback<T>(
  route: string,
  label: string,
  promise: Promise<T>,
  fallback: T,
) {
  return withFallback(promise, fallback, (err) => {
    console.error(`${route}: ${label} failed, showing fallback:`, err);
    after(() =>
      recordError({
        source: "server",
        message: err instanceof Error ? err.message : err,
        stack: err instanceof Error ? (err.stack ?? null) : null,
        route,
        path: route,
      }),
    );
  });
}
