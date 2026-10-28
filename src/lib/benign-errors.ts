/**
 * Browser messages that aren't bugs, so they never reach the error log or
 * alert emails:
 *
 * - View Transitions (the animation between pages) are cancelled by the
 *   browser when the visitor switches tabs or minimises the window mid-
 *   animation ("Transition was aborted because of invalid state. Document
 *   hidden"), or when a newer navigation replaces them ("Transition was
 *   skipped"). The page itself loads normally.
 * - "ResizeObserver loop …" is a browser notice that layout settled over
 *   more than one frame; nothing breaks.
 */
const BENIGN = [/^Transition was (?:aborted|skipped)\b/i, /^ResizeObserver loop\b/i];

export function isBenignClientError(error: unknown): boolean {
  const message =
    typeof error === "string"
      ? error
      : typeof (error as { message?: unknown } | null)?.message === "string"
        ? (error as { message: string }).message
        : "";
  return BENIGN.some((re) => re.test(message.trim()));
}
