import type { Metadata, Viewport } from "next";

import { DEFAULT_SITE_SETTINGS } from "@/lib/validation/settings";

export const DEFAULT_SITE_TITLE = DEFAULT_SITE_SETTINGS.siteName; // "CHIBUEZE MAXWELL"
export const PRODUCTION_SITE_URL = "https://chibuezemaxwell.com";
export const DEFAULT_SITE_DESCRIPTION =
  "AI Engineer, entrepreneur, researcher, and writer. Explore my projects, research, and ideas under Chibueze Maxwell (MAXCHICHAR).";

/** The person behind the site, as search engines should attribute it. */
export const SITE_AUTHOR = "Chibueze Maxwell";
export const SITE_ALTERNATE_NAME = "MAXCHICHAR";

export const SITE_KEYWORDS = [
  "Chibueze Maxwell",
  "MAXCHICHAR",
  "AI engineer",
  "artificial intelligence",
  "machine learning",
  "entrepreneur",
  "research",
  "writing",
  "portfolio",
];

/**
 * The site name is styled in capitals ("CHIBUEZE MAXWELL"), but search
 * engines should see the person's name as it is written. The canonical name
 * wins on a case-insensitive match; any other all-caps name is title-cased.
 */
export function toPersonName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.toLowerCase() === SITE_AUTHOR.toLowerCase()) return SITE_AUTHOR;
  if (trimmed !== trimmed.toUpperCase()) return trimmed;
  return trimmed.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (m) => m.toUpperCase());
}

/**
 * Google Search Console token. It used to live on the home page only; it is
 * now site-wide so every page verifies, and can be overridden from the env.
 */
const GOOGLE_SITE_VERIFICATION = "6oW8w0a8eNljvhIuI2bd51M-1GC4qctVVFECy5xtnq4";

/**
 * Ownership tokens for each search engine's webmaster console. Bing's also
 * covers the engines it feeds (DuckDuckGo, Yahoo, Ecosia); Brave Search has
 * no console and simply crawls what robots.txt and the sitemap allow.
 */
export function buildVerification(): Metadata["verification"] {
  const env = (name: string) => process.env[name]?.trim() || undefined;
  const bing = env("BING_SITE_VERIFICATION");
  const pinterest = env("PINTEREST_SITE_VERIFICATION");
  const other: Record<string, string> = {};
  if (bing) other["msvalidate.01"] = bing;
  if (pinterest) other["p:domain_verify"] = pinterest;
  return {
    google: env("GOOGLE_SITE_VERIFICATION") ?? GOOGLE_SITE_VERIFICATION,
    ...(env("YANDEX_SITE_VERIFICATION")
      ? { yandex: env("YANDEX_SITE_VERIFICATION") }
      : {}),
    ...(Object.keys(other).length > 0 ? { other } : {}),
  };
}

/**
 * Browser chrome colours (address bar, task switcher, PWA title bar) for
 * Chrome, Brave, Edge, Samsung Internet and Safari; they match `--bg` in
 * globals.css for each OS colour scheme.
 */
export const SITE_VIEWPORT: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark light",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0b" },
    { media: "(prefers-color-scheme: light)", color: "#f6f5f1" },
  ],
};

/**
 * Meta descriptions read best under ~160 characters; page text can be
 * longer than that, so flatten it and trim on a word boundary.
 */
export function toDescription(text: string): string {
  const flat = text
    .replace(/^\s*[-*•]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
  if (flat.length <= 160) return flat;
  return `${flat.slice(0, 157).replace(/\s+\S*$/, "")}…`;
}

/**
 * Resolves the canonical base site URL for metadata, canonicals, and sitemaps.
 *
 * Evaluation order:
 * 1. NEXT_PUBLIC_SITE_URL (explicit public site URL)
 * 2. SITE_URL (server-side environment variable)
 * 3. The confirmed custom domain in production (including preview builds)
 * 4. Vercel URL hints outside production
 * 5. Local development fallback: http://localhost:${PORT:-3000}
 *
 * Deployment hostnames must never become production canonical URLs.
 */
export function getSiteUrl(): string {
  const envUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    (process.env.NODE_ENV === "production" ? PRODUCTION_SITE_URL : undefined) ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined) ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);

  if (envUrl && envUrl.trim().length > 0) {
    const trimmed = envUrl.trim();
    return trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : `https://${trimmed}`;
  }

  const port = process.env.PORT || "3000";
  return `http://localhost:${port}`;
}

/**
 * Returns a valid URL instance for metadataBase.
 */
export function getMetadataBase(): URL {
  return new URL(getSiteUrl());
}

/**
 * Static homepage card, also used by structured data and external checks.
 * The root opengraph-image route serves this asset; other segments generate
 * their own cards. Explicit page images still override those cards.
 */
export const DEFAULT_OG_IMAGE = "/og-default.png";

/**
 * RSS discovery (<link rel="alternate" type="application/rss+xml">). Repeated
 * wherever `alternates` is set, because a page's `alternates` replaces the
 * layout's rather than merging with it.
 */
export const FEED_ALTERNATE = {
  "application/rss+xml": [{ url: "/feed.xml", title: "RSS feed" }],
};

export interface BaseMetadataOptions {
  siteName?: string | null;
  siteDescription?: string | null;
}

/**
 * Normalizes a route path for canonical and Open Graph URLs (Level 9.5).
 * Strips query parameters, hash fragments, extra leading/trailing slashes,
 * and ensures a clean single-slash prefix (or "/" for root).
 */
export function normalizeCanonicalPath(rawPath?: string | null): string | undefined {
  if (!rawPath) return undefined;
  const trimmed = rawPath.trim();
  if (!trimmed) return undefined;

  // Strip query parameters and hash fragments (e.g., /work/foo?ref=twitter#section -> /work/foo)
  const [clean] = trimmed.split(/[?#]/);
  if (!clean || clean.length === 0) return "/";

  // Collapse consecutive slashes and remove trailing slashes except for root
  const collapsed = clean.replace(/\/+/g, "/");
  const withoutTrailing = collapsed.replace(/\/+$/, "");

  if (withoutTrailing === "" || withoutTrailing === "/") {
    return "/";
  }

  return withoutTrailing.startsWith("/") ? withoutTrailing : `/${withoutTrailing}`;
}

/**
 * Resolves a fully-qualified canonical URL using the canonical site URL mechanism.
 * Guarantees no query parameters and consistent slashes.
 */
export function resolveCanonicalUrl(rawPath?: string | null): string {
  const norm = normalizeCanonicalPath(rawPath) || "/";
  const siteUrl = getSiteUrl().replace(/\/+$/, "");
  if (norm === "/") {
    return `${siteUrl}/`;
  }
  return `${siteUrl}${norm}`;
}

/**
 * Builds the Phase 9 Level 9.1, 9.4 & 9.5 Base Metadata foundation.
 * Provides metadataBase, title template, default title, default description,
 * default robots configuration (index: true, follow: true),
 * Open Graph metadata, Twitter Card metadata, and root canonical alternate.
 */
export function constructBaseMetadata(options?: BaseMetadataOptions): Metadata {
  const siteName = options?.siteName?.trim() || DEFAULT_SITE_TITLE;
  const description =
    options?.siteDescription &&
    options.siteDescription.trim().length > 0 &&
    options.siteDescription !== DEFAULT_SITE_SETTINGS.siteDescription
      ? options.siteDescription.trim()
      : DEFAULT_SITE_DESCRIPTION;

  return {
    metadataBase: getMetadataBase(),
    title: {
      default: siteName,
      template: `%s | ${siteName}`,
    },
    description,
    applicationName: siteName,
    authors: [{ name: SITE_AUTHOR, url: "/" }],
    creator: SITE_AUTHOR,
    publisher: SITE_AUTHOR,
    keywords: SITE_KEYWORDS,
    category: "technology",
    // Stops iOS/Safari from turning numbers and addresses into links.
    formatDetection: { telephone: false, email: false, address: false },
    appleWebApp: { capable: true, title: siteName, statusBarStyle: "black-translucent" },
    robots: {
      index: true,
      follow: true,
      // Lets Google, Bing and Brave show large image previews and full snippets.
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    verification: buildVerification(),
    alternates: {
      canonical: "/",
      types: FEED_ALTERNATE,
    },
    openGraph: {
      title: siteName,
      description,
      siteName,
      locale: "en_US",
      url: "/",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: siteName,
      description,
    },
  };
}

export interface PageMetadataOptions {
  title: string;
  description?: string | null;
  path?: string;
  image?: string | null;
  type?: "website" | "article";
  /** Article-only Open Graph fields (ignored for "website"). */
  publishedTime?: Date | string | null;
  modifiedTime?: Date | string | null;
  tags?: string[];
}

function toIso(date?: Date | string | null): string | undefined {
  if (!date) return undefined;
  const d = typeof date === "string" ? new Date(date) : date;
  return isNaN(d.getTime()) ? undefined : d.toISOString();
}

/**
 * Keeps a page out of search results while it shows fallback content (for
 * example during a database outage), so the outage never gets indexed.
 */
export function withNoIndex(metadata: Metadata): Metadata {
  return { ...metadata, robots: { index: false, follow: true } };
}

/**
 * Builds page-specific metadata with Open Graph, Twitter Card, and Canonical support (Level 9.4 & 9.5).
 * Automatically cleans query parameters and normalizes canonical paths.
 * An explicit `image` overrides the segment's generated preview card.
 */
export function constructPageMetadata(options: PageMetadataOptions): Metadata {
  const title = options.title;
  const description =
    options.description && options.description.trim().length > 0
      ? options.description.trim()
      : DEFAULT_SITE_DESCRIPTION;
  const image = options.image?.trim() || null;
  const type = options.type || "website";
  const cleanPath = normalizeCanonicalPath(options.path);
  const publishedTime = toIso(options.publishedTime);
  const modifiedTime = toIso(options.modifiedTime);
  const articleFields =
    type === "article"
      ? {
          authors: [SITE_AUTHOR],
          ...(publishedTime ? { publishedTime } : {}),
          ...(modifiedTime ? { modifiedTime } : {}),
          ...(options.tags && options.tags.length > 0 ? { tags: options.tags } : {}),
        }
      : {};

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: DEFAULT_SITE_TITLE,
      locale: "en_US",
      type,
      ...articleFields,
      ...(cleanPath ? { url: cleanPath } : {}),
      ...(image ? { images: [image] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
    ...(cleanPath
      ? {
          alternates: {
            canonical: cleanPath,
            types: FEED_ALTERNATE,
          },
        }
      : {}),
  };
}
