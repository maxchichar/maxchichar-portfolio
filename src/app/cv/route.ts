import { after, type NextRequest } from "next/server";

import { fetchObjectBytes } from "@/lib/storage/r2";
import { recordPageView } from "@/server/services/analytics";
import { getSiteDocument } from "@/server/services/documents";
import { getPublicSiteSettings } from "@/server/services/settings";

export const dynamic = "force-dynamic";

/** "CHIBUEZE MAXWELL" -> "Chibueze-Maxwell-CV.pdf" */
function downloadName(siteName: string): string {
  const words = siteName
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase() + w.slice(1).toLowerCase());
  return `${words.length > 0 ? words.join("-") : "CV"}-CV.pdf`;
}

/**
 * The CV at a stable, shareable URL. Served from our own origin (rather than
 * linking the raw storage URL) so it has a proper filename and PDF headers,
 * and so each open is counted in Analytics as /cv. `?download=1` forces a
 * download instead of opening in the browser's viewer.
 */
export async function GET(request: NextRequest) {
  const cv = await getSiteDocument("cv");
  if (!cv) {
    return new Response("No CV has been published yet.", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  let bytes: Buffer;
  try {
    bytes = await fetchObjectBytes(cv.storageKey);
  } catch (err) {
    console.error("/cv: could not read the CV from storage:", err);
    return new Response("The CV is temporarily unavailable. Please try again shortly.", {
      status: 503,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  const { siteName } = await getPublicSiteSettings();
  const filename = downloadName(siteName);
  const disposition = request.nextUrl.searchParams.has("download")
    ? "attachment"
    : "inline";

  // Count the open like a page view (same privacy rules as the beacon).
  if (request.headers.get("sec-gpc") !== "1" && request.headers.get("dnt") !== "1") {
    after(() =>
      recordPageView({
        path: "/cv",
        referrer: request.headers.get("referer"),
        ip:
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          request.headers.get("x-real-ip") ||
          "0.0.0.0",
        userAgent: request.headers.get("user-agent"),
        country:
          request.headers.get("x-vercel-ip-country") ??
          request.headers.get("cf-ipcountry"),
        siteHost: request.headers.get("host"),
      }).catch((err) => console.warn("/cv analytics failed:", err)),
    );
  }

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(bytes.byteLength),
      "Content-Disposition": `${disposition}; filename="${filename}"`,
      // Not cached at the edge, so every open is counted and a replaced CV
      // is served straight away.
      "Cache-Control": "private, no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
