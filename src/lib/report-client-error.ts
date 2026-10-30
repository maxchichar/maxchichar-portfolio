import { isBenignClientError } from "@/lib/benign-errors";
import { reloadIfStaleDeploy } from "@/lib/stale-deploy";

/**
 * Sends a browser-side crash to /api/errors (best effort, never throws).
 * Errors that carry a `digest` came from the server, which already reported
 * them, so they're skipped. At most a few reports per page load.
 */
let sent = 0;
// The same crash can surface twice (an error boundary and the window error
// event); report each error object, and each message, once per page load.
const seen = new WeakSet<object>();
const seenMessages = new Set<string>();

export function reportClientError(error: unknown) {
  try {
    if (typeof window === "undefined") return;
    // A tab left open across a deploy: reload rather than log it.
    if (reloadIfStaleDeploy(error)) return;
    if (sent >= 3) return;
    const err = error as { message?: unknown; stack?: unknown; digest?: unknown };
    if (typeof err?.digest === "string" && err.digest) return;
    if (isBenignClientError(error)) return;
    const message = typeof err?.message === "string" ? err.message : String(error);
    if (typeof error === "object" && error !== null) {
      if (seen.has(error)) return;
      seen.add(error);
    }
    if (seenMessages.has(message)) return;
    seenMessages.add(message);
    sent += 1;
    const body = JSON.stringify({
      message,
      stack: typeof err?.stack === "string" ? err.stack.slice(0, 4000) : undefined,
      path: window.location.pathname,
    });
    const blob = new Blob([body], { type: "application/json" });
    if (!navigator.sendBeacon?.("/api/errors", blob)) {
      void fetch("/api/errors", { method: "POST", body, keepalive: true }).catch(
        () => {},
      );
    }
  } catch {
    // Reporting must never cause errors of its own.
  }
}
