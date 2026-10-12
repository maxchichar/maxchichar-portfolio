/**
 * Resolves to the promise's value, or to `fallback` if it rejects, so one
 * failed read degrades a single section instead of failing a whole page.
 * `onError` hears about the failure (for logging and alerts) and can't throw.
 */
export async function withFallback<T>(
  promise: Promise<T>,
  fallback: T,
  onError: (err: unknown) => void,
): Promise<{ value: T; failed: boolean }> {
  try {
    return { value: await promise, failed: false };
  } catch (err) {
    try {
      onError(err);
    } catch {
      // Reporting must never be what breaks the page.
    }
    return { value: fallback, failed: true };
  }
}
