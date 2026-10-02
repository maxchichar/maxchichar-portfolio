export interface SecurityHeaderOptions {
  isDev?: boolean;
  storageEndpoint?: string | null;
  forceHsts?: boolean;
}

/**
 * Extracts the exact origin from a storage endpoint URL.
 * Never leaks access keys, secret tokens, or bucket paths.
 */
export function extractStorageOrigin(endpoint?: string | null): string | null {
  if (!endpoint || typeof endpoint !== "string") return null;
  const trimmed = endpoint.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(
      trimmed.startsWith("http://") || trimmed.startsWith("https://")
        ? trimmed
        : `https://${trimmed}`,
    );
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * Constructs the defensive Content Security Policy (CSP) header value.
 *
 * Restrictive baseline:
 * - default-src 'self'
 * - script-src 'self' 'unsafe-inline' (unsafe-eval is restricted strictly to development)
 * - style-src 'self' 'unsafe-inline' (for Tailwind / Next.js styling)
 * - img-src 'self' data: blob: + exact R2 storage origin if configured
 * - font-src 'self' (self-hosted Fontsource variable fonts)
 * - connect-src 'self' + exact R2 storage origin for presigned PUT uploads
 * - media-src 'self' + exact R2 storage origin
 * - frame-src 'none' (no iframes used)
 * - object-src 'none' (blocks plugins)
 * - base-uri 'self'
 * - form-action 'self' (allows server actions and same-origin forms)
 * - frame-ancestors 'none' (blocks clickjacking alongside X-Frame-Options)
 * - manifest-src 'self'
 * - worker-src 'self' blob:
 */
export function buildCspHeader(options?: SecurityHeaderOptions): string {
  const isDev =
    options?.isDev ??
    (process.env.NODE_ENV === "development" ||
      (!process.env.NODE_ENV && process.env.npm_lifecycle_event === "dev"));

  const storageOrigin = extractStorageOrigin(
    options?.storageEndpoint ?? process.env.STORAGE_ENDPOINT,
  );
  const publicStorageOrigin = extractStorageOrigin(
    process.env.STORAGE_PUBLIC_URL || process.env.NEXT_PUBLIC_STORAGE_URL,
  );

  const scriptSrc = ["'self'", "'unsafe-inline'"];
  if (isDev) {
    // Development-only for Next.js Turbopack / Fast Refresh eval
    scriptSrc.push("'unsafe-eval'");
  }

  const imgSrc = ["'self'", "data:", "blob:"];
  if (storageOrigin) {
    imgSrc.push(storageOrigin);
  }
  if (publicStorageOrigin && !imgSrc.includes(publicStorageOrigin)) {
    imgSrc.push(publicStorageOrigin);
  }

  const connectSrc = ["'self'"];
  if (storageOrigin) {
    connectSrc.push(storageOrigin);
  }
  if (publicStorageOrigin && !connectSrc.includes(publicStorageOrigin)) {
    connectSrc.push(publicStorageOrigin);
  }

  const mediaSrc = ["'self'"];
  if (storageOrigin) {
    mediaSrc.push(storageOrigin);
  }
  if (publicStorageOrigin && !mediaSrc.includes(publicStorageOrigin)) {
    mediaSrc.push(publicStorageOrigin);
  }

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": scriptSrc,
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": imgSrc,
    "font-src": ["'self'"],
    "connect-src": connectSrc,
    "media-src": mediaSrc,
    "frame-src": ["'none'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
    "manifest-src": ["'self'"],
    "worker-src": ["'self'", "blob:"],
  };

  return Object.entries(directives)
    .map(([directive, values]) => `${directive} ${values.join(" ")}`)
    .join("; ");
}

/**
 * Builds the Permissions-Policy header value, explicitly disabling
 * unused browser hardware/sensor/payment capabilities.
 */
export function buildPermissionsPolicy(): string {
  const policies = [
    "camera=()",
    "microphone=()",
    "geolocation=()",
    "payment=()",
    "usb=()",
    "bluetooth=()",
    "serial=()",
    "accelerometer=()",
    "gyroscope=()",
    "magnetometer=()",
  ];
  return policies.join(", ");
}

/**
 * Builds the full array of HTTP security response headers for Next.js.
 */
export function buildSecurityHeaders(
  options?: SecurityHeaderOptions,
): Array<{ key: string; value: string }> {
  const isDev =
    options?.isDev ??
    (process.env.NODE_ENV === "development" ||
      (!process.env.NODE_ENV && process.env.npm_lifecycle_event === "dev"));

  const forceHsts = options?.forceHsts ?? false;

  const headers: Array<{ key: string; value: string }> = [
    {
      key: "Content-Security-Policy",
      value: buildCspHeader(options),
    },
    {
      key: "X-Content-Type-Options",
      value: "nosniff",
    },
    {
      key: "X-Frame-Options",
      value: "DENY",
    },
    {
      key: "Referrer-Policy",
      value: "strict-origin-when-cross-origin",
    },
    {
      key: "Permissions-Policy",
      value: buildPermissionsPolicy(),
    },
    {
      key: "Cross-Origin-Opener-Policy",
      value: "same-origin",
    },
    {
      key: "Cross-Origin-Resource-Policy",
      value: "same-origin",
    },
  ];

  // In production (or when explicitly forced), add HSTS.
  // We strictly omit HSTS on localhost development to avoid breaking plain HTTP workflows.
  // Preload is intentionally omitted per specification to prevent premature permanent domain-wide pinning.
  if (!isDev || forceHsts) {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=31536000; includeSubDomains",
    });
  }

  return headers;
}
