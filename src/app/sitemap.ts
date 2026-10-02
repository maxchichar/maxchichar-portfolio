import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/metadata";
import { listPublicArticlesOverview } from "@/server/services/articles";
import { getPublishedAboutPage, getPublishedNowPage } from "@/server/services/pages";
import { listPublicWorkOverview } from "@/server/services/projects";
import { listPublicResearchOverview } from "@/server/services/research";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const STATIC_ROUTES = [
  "",
  "/work",
  "/research",
  "/writing",
  "/now",
  "/about",
  "/contact",
] as const;

export interface SitemapItemWork {
  project: { slug: string; updatedAt?: Date | null };
  published: { publishedAt?: Date | null };
}

export interface SitemapItemResearch {
  research: { slug: string; updatedAt?: Date | null };
  published: { publishedAt?: Date | null };
}

export interface SitemapItemArticle {
  article: { slug: string; updatedAt?: Date | null };
  published: { publishedAt?: Date | null };
}

export interface BuildSitemapOptions {
  siteUrl: string;
  work?: SitemapItemWork[];
  research?: SitemapItemResearch[];
  articles?: SitemapItemArticle[];
  includeAbout?: boolean;
  includeNow?: boolean;
}

/**
 * Builds the canonical sitemap entries deterministically from the given base URL and content items.
 */
export function buildSitemap({
  siteUrl,
  work = [],
  research = [],
  articles = [],
  includeAbout = true,
  includeNow = true,
}: BuildSitemapOptions): MetadataRoute.Sitemap {
  const base = siteUrl.replace(/\/+$/, "");

  const activeStaticRoutes = STATIC_ROUTES.filter((route) => {
    if (route === "/about" && !includeAbout) return false;
    if (route === "/now" && !includeNow) return false;
    return true;
  });

  const staticEntries: MetadataRoute.Sitemap = activeStaticRoutes.map((route) => ({
    url: `${base}${route}`,
  }));

  const workEntries: MetadataRoute.Sitemap = work.map(({ project, published }) => ({
    url: `${base}/work/${project.slug}`,
    lastModified: published.publishedAt
      ? new Date(published.publishedAt)
      : project.updatedAt
        ? new Date(project.updatedAt)
        : undefined,
  }));

  const researchEntries: MetadataRoute.Sitemap = research.map(
    ({ research: item, published }) => ({
      url: `${base}/research/${item.slug}`,
      lastModified: published.publishedAt
        ? new Date(published.publishedAt)
        : item.updatedAt
          ? new Date(item.updatedAt)
          : undefined,
    }),
  );

  const articleEntries: MetadataRoute.Sitemap = articles.map(
    ({ article, published }) => ({
      url: `${base}/writing/${article.slug}`,
      lastModified: published.publishedAt
        ? new Date(published.publishedAt)
        : article.updatedAt
          ? new Date(article.updatedAt)
          : undefined,
    }),
  );

  return [...staticEntries, ...workEntries, ...researchEntries, ...articleEntries];
}

/**
 * Generates the public dynamic sitemap for Portfolio OS (Phase 9, Level 9.3).
 *
 * Publication boundaries:
 * - Includes static public routes (/, /work, /research, /writing, /contact)
 * - Includes /about and /now only when published versions exist (avoids advertising 404 pages)
 * - Includes published active Work (/work/[slug])
 * - Includes published active Research (/research/[slug])
 * - Includes published active Writing (/writing/[slug])
 * - Omits all drafts, superseded/archived items, admin routes, and API endpoints
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();

  const [workResult, researchResult, articlesResult, aboutResult, nowResult] =
    await Promise.allSettled([
      listPublicWorkOverview(),
      listPublicResearchOverview(),
      listPublicArticlesOverview(),
      getPublishedAboutPage(),
      getPublishedNowPage(),
    ]);

  const work = workResult.status === "fulfilled" ? workResult.value : [];
  const research = researchResult.status === "fulfilled" ? researchResult.value : [];
  const articles = articlesResult.status === "fulfilled" ? articlesResult.value : [];
  const hasAbout = aboutResult.status === "fulfilled" ? Boolean(aboutResult.value) : true;
  const hasNow = nowResult.status === "fulfilled" ? Boolean(nowResult.value) : true;

  return buildSitemap({
    siteUrl,
    work,
    research,
    articles,
    includeAbout: hasAbout,
    includeNow: hasNow,
  });
}
