import { unstable_isUnrecognizedActionError } from "next/navigation";

const RELOADED_AT = "stale-deploy-reloaded-at";

/**
 * A tab opened before a deploy still holds the old build's Server Action
 * ids, so its next form submit fails with "Server Action … was not found on
 * the server". That's version skew, not a bug: reload once to pick up the
 * new build. Returns true when it reloaded (the error needs no report).
 * Only one reload per 30s, so a real fault can't loop the page.
 */
export function reloadIfStaleDeploy(error: unknown): boolean {
  if (!unstable_isUnrecognizedActionError(error)) return false;
  try {
    const last = Number(sessionStorage.getItem(RELOADED_AT) ?? 0);
    if (Date.now() - last < 30_000) return false;
    sessionStorage.setItem(RELOADED_AT, String(Date.now()));
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}
