import { NextResponse, type NextRequest } from "next/server";

import { isBenignClientError } from "@/lib/benign-errors";
import { recordError } from "@/server/services/errors";

const MAX_BODY_BYTES = 8 * 1024;
// Per server instance: a burst cap on browser reports. Alert emails are
// additionally capped site-wide in the service.
let window: number[] = [];
const MAX_REPORTS_PER_MINUTE = 30;

/**
 * Browser-side crashes (error boundaries, uncaught errors) are reported here.
 * Only accepted from our own pages (same origin), small, and rate limited;
 * always answers 204 so it can't be used to probe anything.
 */
export async function POST(request: NextRequest) {
  const noContent = new NextResponse(null, { status: 204 });
  try {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");
    if (!origin || !host || new URL(origin).host !== host) return noContent;

    const now = Date.now();
    window = window.filter((t) => now - t < 60_000);
    if (window.length >= MAX_REPORTS_PER_MINUTE) return noContent;
    window.push(now);

    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) return noContent;
    const body = JSON.parse(text) as {
      message?: unknown;
      path?: unknown;
      stack?: unknown;
      digest?: unknown;
    };
    const path =
      typeof body.path === "string" && body.path.startsWith("/") ? body.path : null;
    if (!path || path.startsWith("/api/")) return noContent;
    // Harmless browser notices (also filtered in the browser; this covers
    // pages still running an older script).
    if (isBenignClientError(body.message)) return noContent;

    await recordError({
      source: "client",
      message: body.message,
      route: path.split(/[?#]/)[0],
      path,
      stack: typeof body.stack === "string" ? body.stack : null,
      digest: typeof body.digest === "string" ? body.digest : null,
    });
  } catch {
    // Malformed report: ignore.
  }
  return noContent;
}
