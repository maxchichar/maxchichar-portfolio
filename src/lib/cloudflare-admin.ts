const PRIVATE_PREFIXES = ["/api/auth", "/api/media"];
const ADMIN_PREFIXES = ["/admin", "/preview"];
const matches = (path: string, prefix: string) =>
  path === prefix || path.startsWith(`${prefix}/`);

export function routeVercelAdmin(request: Request, adminOrigin: string): Response | null {
  const url = new URL(request.url);
  let path: string;
  try {
    path = decodeURIComponent(url.pathname);
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  if (PRIVATE_PREFIXES.some((prefix) => matches(path, prefix))) {
    return new Response("Not found", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }
  if (!ADMIN_PREFIXES.some((prefix) => matches(path, prefix))) return null;
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Use the admin site", {
      status: 405,
      headers: { Allow: "GET, HEAD", "Cache-Control": "no-store" },
    });
  }
  let target: URL;
  try {
    target = new URL(adminOrigin);
  } catch {
    return new Response("Admin host is not configured", { status: 503 });
  }
  if (
    target.protocol !== "https:" ||
    target.username ||
    target.password ||
    target.origin === url.origin
  ) {
    return new Response("Admin host is not configured", { status: 503 });
  }
  target.pathname = url.pathname;
  target.search = url.search;
  target.hash = "";
  return new Response(null, {
    status: 302,
    headers: { Location: target.href, "Cache-Control": "no-store" },
  });
}
