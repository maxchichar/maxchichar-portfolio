// Pure helpers for first-party analytics (no I/O). Shared by the collect
// endpoint and tests.

const BOT_PATTERN =
  /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|quora link|whatsapp|telegram|discord|slack|preview|headless|lighthouse|pagespeed|curl|wget|python-requests|axios|node-fetch|go-http|java\//i;

export function isBot(userAgent: string | null): boolean {
  return !userAgent || BOT_PATTERN.test(userAgent);
}

export type Device = "desktop" | "mobile" | "tablet";

export function deviceFrom(userAgent: string): Device {
  if (/ipad|tablet|(android(?!.*mobile))/i.test(userAgent)) return "tablet";
  if (/mobi|iphone|ipod|android.*mobile|windows phone/i.test(userAgent)) return "mobile";
  return "desktop";
}

export function browserFrom(userAgent: string): string {
  if (/edg\//i.test(userAgent)) return "Edge";
  if (/opr\/|opera/i.test(userAgent)) return "Opera";
  if (/samsungbrowser/i.test(userAgent)) return "Samsung Internet";
  if (/firefox|fxios/i.test(userAgent)) return "Firefox";
  if (/chrome|crios|chromium/i.test(userAgent)) return "Chrome";
  if (/safari/i.test(userAgent)) return "Safari";
  return "Other";
}

/** Referrer reduced to its host; same-site referrers count as internal (null). */
export function referrerHostFrom(
  referrer: string | null | undefined,
  siteHost: string | null,
) {
  if (!referrer) return null;
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "").toLowerCase();
    const site = siteHost
      ?.split(":")[0]
      ?.replace(/^www\./, "")
      .toLowerCase();
    if (!host || host === site) return null;
    return host.slice(0, 120);
  } catch {
    return null;
  }
}

/** Normalizes a path for storage; null for anything that shouldn't be counted. */
export function normalizePath(path: unknown): string | null {
  if (typeof path !== "string" || !path.startsWith("/") || path.startsWith("//"))
    return null;
  const clean = path.split(/[?#]/)[0]!.slice(0, 300) || "/";
  if (/^\/(admin|api|_next)(\/|$)/.test(clean)) return null;
  return clean.length > 1 ? clean.replace(/\/+$/, "") : clean;
}
