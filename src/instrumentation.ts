import type { Instrumentation } from "next";

/**
 * Every server error Next.js catches (page renders, route handlers, server
 * actions) is recorded and, when new, emailed to the site owner. See
 * src/server/services/errors.ts. Node runtime only; never throws.
 */
export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { recordError } = await import("./server/services/errors");
    const err = error as { message?: unknown; digest?: unknown; stack?: unknown };
    await recordError({
      source: "server",
      message: err?.message ?? error,
      route: context.routePath,
      path: request.path,
      method: request.method,
      digest: typeof err?.digest === "string" ? err.digest : null,
      stack: typeof err?.stack === "string" ? err.stack : null,
    });
  } catch (reportingError) {
    console.error("onRequestError: reporting failed:", reportingError);
  }
};
