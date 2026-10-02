import type { Metadata } from "next";

import { DEFAULT_SITE_SETTINGS } from "@/lib/validation/settings";

export const DEFAULT_SITE_TITLE = DEFAULT_SITE_SETTINGS.siteName; // "CHIBUEZE MAXWELL"
export const DEFAULT_SITE_DESCRIPTION =
  "Super Intelligence Engineer & Entrepreneur — I build intelligent systems for real-world problems.";

/**
 * Resolves the canonical base site URL for metadata, canonicals, and sitemaps.
 *
 * Evaluation order:
 * 1. NEXT_PUBLIC_SITE_URL (explicit public site URL)
 * 2. SITE_URL (server-side environment variable)
 * 3. VERCEL_PROJECT_PRODUCTION_URL (Vercel production domain)
 * 4. VERCEL_URL (Vercel deployment preview domain)
 * 5. Local development fallback: http://localhost:${PORT:-3000}
 *
 * Never hardcodes a guessed production domain.
 */
export function getSiteUrl(): string {
  const envUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
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

export const DEFAULT_OG_IMAGE = "/og-default.png";

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
      template: `%s — ${siteName}`,
    },
    description,
    robots: {
      index: true,
      follow: true,
    },
    alternates: {
      canonical: "/",
    },
    openGraph: {
      title: siteName,
      description,
      siteName,
      url: "/",
      type: "website",
      images: [DEFAULT_OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: siteName,
      description,
      images: [DEFAULT_OG_IMAGE],
    },
  };
}

export interface PageMetadataOptions {
  title: string;
  description?: string | null;
  path?: string;
  image?: string | null;
  type?: "website" | "article";
}

/**
 * Builds page-specific metadata with Open Graph, Twitter Card, and Canonical support (Level 9.4 & 9.5).
 * Automatically cleans query parameters and normalizes canonical paths.
 * Supports cover images with automatic fallback to DEFAULT_OG_IMAGE.
 */
export function constructPageMetadata(options: PageMetadataOptions): Metadata {
  const title = options.title;
  const description =
    options.description && options.description.trim().length > 0
      ? options.description.trim()
      : DEFAULT_SITE_DESCRIPTION;
  const image =
    options.image && options.image.trim().length > 0
      ? options.image.trim()
      : DEFAULT_OG_IMAGE;
  const type = options.type || "website";
  const cleanPath = normalizeCanonicalPath(options.path);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type,
      ...(cleanPath ? { url: cleanPath } : {}),
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
    ...(cleanPath
      ? {
          alternates: {
            canonical: cleanPath,
          },
        }
      : {}),
  };
}
