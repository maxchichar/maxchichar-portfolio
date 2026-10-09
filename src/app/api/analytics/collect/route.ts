import { NextResponse, type NextRequest } from "next/server";

import { recordPageView } from "@/server/services/analytics";

const MAX_BODY_BYTES = 2048;

/**
 * First-party page-view beacon. Cookieless; honors Global Privacy Control
 * and Do Not Track; drops bots; never stores the raw IP or user agent.
 * Always answers 204 so it can't be used to probe anything.
 */
export async function POST(request: NextRequest) {
  const noContent = new NextResponse(null, { status: 204 });
  try {
    if (request.headers.get("sec-gpc") === "1" || request.headers.get("dnt") === "1") {
      return noContent;
    }
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) return noContent;
    const body = JSON.parse(text) as { path?: unknown; referrer?: unknown };

    const forwarded = request.headers.get("x-forwarded-for");
    const ip =
      forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "0.0.0.0";

    await recordPageView({
      path: body.path,
      referrer: body.referrer,
      ip,
      userAgent: request.headers.get("user-agent"),
      country:
        request.headers.get("x-vercel-ip-country") ?? request.headers.get("cf-ipcountry"),
      siteHost: request.headers.get("host"),
    });
  } catch (err) {
    // Analytics must never break the site; log and move on.
    console.warn("analytics collect failed:", err instanceof Error ? err.message : err);
  }
  return noContent;
}
