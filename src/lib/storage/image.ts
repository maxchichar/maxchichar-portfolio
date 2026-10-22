/**
 * Which images go through Next.js image optimization (resized per device,
 * served as WebP, cached at the edge). Only our own R2 uploads qualify: their
 * keys are random UUIDs, so a URL's content never changes and optimized
 * copies can be cached for a long time. Anything else renders as-is.
 */
const UPLOADS_PREFIX = "uploads/";

export function publicStorageBase(): URL | null {
  const raw =
    process.env.STORAGE_PUBLIC_URL?.trim() || process.env.NEXT_PUBLIC_STORAGE_URL?.trim();
  if (!raw) return null;
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.hostname.endsWith(".r2.cloudflarestorage.com")
    )
      return null;
    url.pathname = `${url.pathname.replace(/\/+$/, "")}/`;
    return url;
  } catch {
    return null;
  }
}

/** `images.remotePatterns` for next.config: exactly our uploads path, no query strings. */
export function storageRemotePatterns() {
  const base = publicStorageBase();
  if (!base) return [];
  return [
    {
      protocol: base.protocol.replace(":", "") as "http" | "https",
      hostname: base.hostname,
      port: base.port,
      pathname: `${base.pathname}${UPLOADS_PREFIX}**`,
      search: "",
    },
  ];
}

export function isOptimizableImage(src: string): boolean {
  const base = publicStorageBase();
  if (!base) return false;
  try {
    const url = new URL(src);
    return (
      url.origin === base.origin &&
      url.pathname.startsWith(`${base.pathname}${UPLOADS_PREFIX}`) &&
      !url.search
    );
  } catch {
    return false;
  }
}

/** Use the same normalized base for delivery URLs and Next.js remotePatterns. */
export function storagePublicUrlFor(storageKey: string): string {
  const base = publicStorageBase();
  if (!base) {
    throw new Error(
      "Set STORAGE_PUBLIC_URL to a public R2 delivery domain (r2.dev or a custom domain); the private S3 endpoint cannot serve public images.",
    );
  }
  return `${base.href}${storageKey.replace(/^\/+/, "")}`;
}
