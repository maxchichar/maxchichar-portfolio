import { routeVercelAdmin } from "./src/lib/cloudflare-admin.ts";

const READ_PATH =
  /^\/(?:$|(?:work|research|writing|topics)(?:\/[^/]+)?\/?$|(?:about|now|contact)\/?$|api\/search$|(?:sitemap\.xml|robots\.txt|feed\.xml|favicon\.ico|og-default\.png)$|_next\/|(?:work|research|writing|topics|about|now|contact)(?:\/[^/]+)?\/opengraph-image$|opengraph-image$)/;
const WRITE_PATHS = new Set(["/contact", "/api/analytics/collect", "/api/errors"]);
const FORWARDED_HEADERS = [
  "accept",
  "accept-language",
  "content-type",
  "user-agent",
  "rsc",
  "next-router-state-tree",
  "next-router-prefetch",
  "next-router-segment-prefetch",
  "next-url",
  "next-action",
  "sec-gpc",
  "dnt",
  "range",
  "if-none-match",
  "if-modified-since",
];
const noStore = (message, status) =>
  new Response(message, { status, headers: { "Cache-Control": "no-store" } });

export function createEdgeWorker(fetchOrigin = fetch) {
  return {
    async fetch(request, env, ctx) {
      const url = new URL(request.url);
      if (url.hostname === "www.chibuezemaxwell.com") {
        const canonical = new URL(url);
        canonical.protocol = "https:";
        canonical.hostname = "chibuezemaxwell.com";
        canonical.port = "";
        return new Response(null, {
          status: 308,
          headers: { Location: canonical.href, "Cache-Control": "public, max-age=300" },
        });
      }
      const admin = routeVercelAdmin(request, env.ADMIN_ORIGIN);
      if (admin) return admin;
      const reading = request.method === "GET" || request.method === "HEAD";
      if (
        reading
          ? !READ_PATH.test(url.pathname)
          : request.method !== "POST" || !WRITE_PATHS.has(url.pathname)
      )
        return noStore("Not found", 404);
      // Verify the browser's original origin before translating it for the
      // upstream host. Never relay an anonymous cross-origin mutation.
      if (!reading && request.headers.get("origin") !== url.origin)
        return noStore("Forbidden", 403);
      const origin = new URL(env.ADMIN_ORIGIN);
      if (
        origin.protocol !== "https:" ||
        origin.origin === url.origin ||
        origin.username ||
        origin.password
      )
        return noStore("Origin unavailable", 503);
      const target = new URL(url.pathname + url.search, origin);
      const headers = new Headers();
      for (const key of FORWARDED_HEADERS) {
        const value = request.headers.get(key);
        if (value !== null) headers.set(key, value);
      }
      if (!reading) headers.set("origin", origin.origin);
      const ip = request.headers.get("cf-connecting-ip");
      if (ip) {
        headers.set("x-forwarded-for", ip);
        headers.set("x-real-ip", ip);
      }
      const country = request.headers.get("cf-ipcountry");
      if (country) headers.set("cf-ipcountry", country);
      // Only ordinary, anonymous HTML navigation is shared. RSC, API responses,
      // query variants, contact forms and mutations always reach the origin.
      const cacheable =
        request.method === "GET" &&
        !url.search &&
        !request.headers.has("cookie") &&
        !request.headers.has("authorization") &&
        !request.headers.has("rsc") &&
        !request.headers.has("next-router-prefetch") &&
        !request.headers.has("next-router-state-tree") &&
        !request.headers.has("next-router-segment-prefetch") &&
        !request.headers.has("next-url") &&
        request.headers.get("accept")?.includes("text/html") &&
        url.pathname !== "/contact" &&
        !url.pathname.startsWith("/api/") &&
        !url.pathname.startsWith("/_next/");
      const cache = caches.default;
      const cacheKey = new Request(url.href, { method: "GET" });
      if (cacheable) {
        const cached = await cache.match(cacheKey);
        if (cached) {
          const result = new Response(cached.body, cached);
          result.headers.set("X-Portfolio-Cache", "HIT");
          result.headers.set("Cache-Control", "private, no-store");
          return result;
        }
      }
      let upstream;
      try {
        upstream = await fetchOrigin(target.href, {
          method: request.method,
          headers,
          body: reading ? undefined : request.body,
          redirect: "manual",
          signal: AbortSignal.timeout(25_000),
          // Content-hashed Next assets can also use Cloudflare's global fetch
          // cache. Never cache API responses or failures with this override.
          cf:
            url.pathname.startsWith("/_next/static/") && reading
              ? {
                  cacheEverything: true,
                  cacheTtlByStatus: { "200-299": 31536000, "400-599": 0 },
                }
              : undefined,
        });
      } catch {
        return noStore(
          "The portfolio is temporarily unavailable. Please try again.",
          502,
        );
      }
      const result = new Response(upstream.body, upstream);
      result.headers.delete("set-cookie");
      result.headers.set("X-Portfolio-Cache", cacheable ? "MISS" : "BYPASS");
      const location = result.headers.get("location");
      if (location) {
        const redirect = new URL(location, target);
        if (redirect.origin === origin.origin)
          result.headers.set(
            "location",
            url.origin + redirect.pathname + redirect.search + redirect.hash,
          );
      }
      if (
        cacheable &&
        upstream.status === 200 &&
        !upstream.headers.has("set-cookie") &&
        upstream.headers.get("content-type")?.includes("text/html")
      ) {
        const stored = result.clone();
        stored.headers.set("Cache-Control", "public, max-age=60");
        // Safe because only normal HTML is cached; RSC variants bypass above.
        stored.headers.delete("vary");
        ctx.waitUntil(cache.put(cacheKey, stored));
        result.headers.set("Cache-Control", "private, no-store");
      }
      return result;
    },
  };
}

export default createEdgeWorker();
