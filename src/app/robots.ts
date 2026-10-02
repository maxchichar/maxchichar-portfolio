import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/metadata";

export const dynamic = "force-dynamic";

/**
 * Generates the robots.txt crawler policy for Portfolio OS (Phase 9, Level 9.2).
 *
 * Directives:
 * - Allow all standard web crawlers on public routes (/, /work, /research, /writing, /about, /now, /contact)
 * - Disallow crawlers from private administrative surfaces (/admin/, /admin/*)
 * - Disallow crawlers from backend API endpoints (/api/, /api/*)
 * - Point to the canonical sitemap index location (/sitemap.xml)
 */
export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl().replace(/\/+$/, "");

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/admin/*", "/api/", "/api/*"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
