/**
 * Which images go through Next.js image optimization (resized per device,
 * served as WebP, cached at the edge). Only our own R2 uploads qualify: their
 * keys are random UUIDs, so a URL's content never changes and optimized
 * copies can be cached for a long time. Anything else renders as-is.
 */
const UPLOADS_PREFIX = "uploads/";

function publicStorageBase(): URL | null {
  const raw =
    process.env.STORAGE_PUBLIC_URL?.trim() || process.env.NEXT_PUBLIC_STORAGE_URL?.trim();
  if (!raw) return null;
  try {
    const url = new URL(/^https?:\/\//.test(raw) ? raw : `https://${raw}`);
    if (!url.pathname.endsWith("/")) url.pathname += "/";
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
