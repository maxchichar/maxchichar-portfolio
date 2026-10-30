import React from "react";

import {
  DEFAULT_OG_IMAGE,
  DEFAULT_SITE_DESCRIPTION,
  DEFAULT_SITE_TITLE,
  resolveCanonicalUrl,
  SITE_ALTERNATE_NAME,
  SITE_AUTHOR,
  toPersonName,
} from "./metadata";

export { toPersonName };

export interface WebSiteJsonLdOptions {
  siteName?: string | null;
  siteDescription?: string | null;
  siteUrl?: string | null;
}

export interface PersonJsonLdOptions {
  name?: string | null;
  jobTitle?: string | null;
  siteUrl?: string | null;
  socialLinks?: Array<string | null | undefined> | null;
  description?: string | null;
  image?: string | null;
  /** Subjects the person demonstrably publishes about (e.g. content tags). */
  knowsAbout?: string[] | null;
}

export type ProfilePageJsonLdOptions = PersonJsonLdOptions;

export interface WorkJsonLdOptions {
  title: string;
  description: string;
  slug: string;
  category?: string | null;
  coverUrl?: string | null;
  publishedAt?: Date | string | null;
  updatedAt?: Date | string | null;
  authorName?: string | null;
}

export interface ResearchJsonLdOptions {
  title: string;
  abstract: string;
  slug: string;
  coverUrl?: string | null;
  publishedAt?: Date | string | null;
  updatedAt?: Date | string | null;
  authorName?: string | null;
}

export interface ArticleJsonLdOptions {
  title: string;
  excerpt: string;
  slug: string;
  coverUrl?: string | null;
  publishedAt?: Date | string | null;
  updatedAt?: Date | string | null;
  authorName?: string | null;
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

function isCanonicalPerson(name: string): boolean {
  return name.toLowerCase() === SITE_AUTHOR.toLowerCase();
}

/**
 * The subjects someone's published work is most often tagged with, most
 * frequent first: evidence-backed `knowsAbout` values, never invented ones.
 */
export function topTopics(
  items: Array<{ tags: Array<{ name: string }> }>,
  limit = 12,
): string[] {
  const counts = new Map<string, number>();
  for (const item of items)
    for (const tag of item.tags) {
      const name = tag.name.trim();
      if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([name]) => name);
}

/** A reference to the site's Person node, for author/publisher fields. */
function personRef(siteUrl: string, authorName: string): Record<string, unknown> {
  return {
    "@type": "Person",
    "@id": `${siteUrl}/#person`,
    name: toPersonName(authorName),
    url: `${siteUrl}/`,
  };
}

/** Fields shared by every content page that lives on this site. */
function contentPageFields(
  siteUrl: string,
  canonicalUrl: string,
  authorName?: string | null,
): Record<string, unknown> {
  return {
    mainEntityOfPage: canonicalUrl,
    inLanguage: "en",
    isPartOf: { "@id": `${siteUrl}/#website` },
    ...(authorName
      ? {
          author: personRef(siteUrl, authorName),
          publisher: { "@id": `${siteUrl}/#person` },
        }
      : {}),
  };
}

/**
 * Resolves a public image URL for structured data.
 * Falls back to the canonical default OG image if no cover is provided.
 */
function resolveStructuredDataImage(coverUrl?: string | null): string {
  if (coverUrl && coverUrl.trim().length > 0) {
    const trimmed = coverUrl.trim();
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return trimmed;
    }
    return resolveCanonicalUrl(trimmed);
  }
  return resolveCanonicalUrl(DEFAULT_OG_IMAGE);
}

/**
 * Safely parses and converts a date to an ISO 8601 string without fabrication.
 */
function toIsoDate(date?: Date | string | null): string | undefined {
  if (!date) return undefined;
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return undefined;
    return d.toISOString();
  } catch {
    return undefined;
  }
}

/**
 * Serializes JSON-LD data to a string with XSS protection by escaping '<' characters.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/**
 * React component for embedding structured data in a secure <script> tag.
 */
export function JsonLdScript({ data }: { data: unknown }): React.JSX.Element | null {
  if (!data) return null;
  return React.createElement("script", {
    type: "application/ld+json",
    dangerouslySetInnerHTML: {
      __html: serializeJsonLd(data),
    },
  });
}

/**
 * Builds Schema.org WebSite structured data.
 */
export function buildWebSiteJsonLd(
  options?: WebSiteJsonLdOptions,
): Record<string, unknown> {
  const siteUrl = (options?.siteUrl?.trim() || resolveCanonicalUrl("/")).replace(
    /\/+$/,
    "",
  );
  const name = toPersonName(options?.siteName?.trim() || DEFAULT_SITE_TITLE);
  const description = options?.siteDescription?.trim() || DEFAULT_SITE_DESCRIPTION;

  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    name,
    ...(isCanonicalPerson(name) ? { alternateName: SITE_ALTERNATE_NAME } : {}),
    url: `${siteUrl}/`,
    description,
    inLanguage: "en",
    publisher: {
      "@id": `${siteUrl}/#person`,
    },
  };
}

/**
 * Builds Schema.org Person structured data.
 * Returns null if no identity name is present.
 * Never invents social profiles or credentials.
 */
export function buildPersonJsonLd(
  options?: PersonJsonLdOptions,
): Record<string, unknown> | null {
  const rawName = options?.name?.trim();
  if (!rawName) return null;
  const name = toPersonName(rawName);

  const siteUrl = (options?.siteUrl?.trim() || resolveCanonicalUrl("/")).replace(
    /\/+$/,
    "",
  );
  const jobTitle = options?.jobTitle?.trim() || "AI Engineer";
  const description = options?.description?.trim();
  const image = options?.image?.trim();
  const knowsAbout = [
    ...new Set((options?.knowsAbout || []).map((t) => t.trim()).filter(Boolean)),
  ];

  const sameAs = (options?.socialLinks || [])
    .filter(
      (link): link is string =>
        typeof link === "string" &&
        link.trim().length > 0 &&
        /^https?:\/\//i.test(link.trim()),
    )
    .map((link) => link.trim());

  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${siteUrl}/#person`,
    name,
    ...(isCanonicalPerson(name) ? { alternateName: SITE_ALTERNATE_NAME } : {}),
    url: `${siteUrl}/`,
    mainEntityOfPage: `${siteUrl}/about`,
    jobTitle,
    ...(description ? { description } : {}),
    ...(image ? { image } : {}),
    ...(knowsAbout.length > 0 ? { knowsAbout } : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };
}

/**
 * Connects the published About page to the same Person entity used by articles
 * and the home page, using only configured public profile information.
 */
export function buildProfilePageJsonLd(
  options: ProfilePageJsonLdOptions,
): Record<string, unknown> | null {
  const person = buildPersonJsonLd(options);
  if (!person) return null;
  const siteUrl = (options.siteUrl?.trim() || resolveCanonicalUrl("/")).replace(
    /\/+$/,
    "",
  );
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "@id": `${siteUrl}/about#profile`,
    url: `${siteUrl}/about`,
    name: `About ${person.name as string}`,
    inLanguage: "en",
    isPartOf: { "@id": `${siteUrl}/#website` },
    mainEntity: person,
  };
}

/** Builds structured data for a published work detail page. */
export function buildWorkJsonLd(options: WorkJsonLdOptions): Record<string, unknown> {
  const canonicalUrl = resolveCanonicalUrl(`/work/${options.slug}`);
  const siteUrl = resolveCanonicalUrl("/").replace(/\/+$/, "");
  const isSoftware =
    Boolean(options.category) &&
    /software|application|app\b/i.test(options.category || "");
  const type = isSoftware ? "SoftwareApplication" : "CreativeWork";
  const datePublished = toIsoDate(options.publishedAt);
  const dateModified = toIsoDate(options.updatedAt);
  const image = resolveStructuredDataImage(options.coverUrl);

  return {
    "@context": "https://schema.org",
    "@type": type,
    "@id": `${canonicalUrl}/#${type.toLowerCase()}`,
    name: options.title,
    headline: options.title,
    description: options.description,
    url: canonicalUrl,
    image,
    ...(datePublished ? { datePublished } : {}),
    ...(dateModified ? { dateModified } : {}),
    ...contentPageFields(siteUrl, canonicalUrl, options.authorName),
    ...(isSoftware && options.category ? { applicationCategory: options.category } : {}),
  };
}

/**
 * Builds Schema.org ScholarlyArticle structured data for Research detail.
 */
export function buildResearchJsonLd(
  options: ResearchJsonLdOptions,
): Record<string, unknown> {
  const canonicalUrl = resolveCanonicalUrl(`/research/${options.slug}`);
  const siteUrl = resolveCanonicalUrl("/").replace(/\/+$/, "");
  const datePublished = toIsoDate(options.publishedAt);
  const dateModified = toIsoDate(options.updatedAt);
  const image = resolveStructuredDataImage(options.coverUrl);

  return {
    "@context": "https://schema.org",
    "@type": "ScholarlyArticle",
    "@id": `${canonicalUrl}/#scholarlyarticle`,
    headline: options.title,
    name: options.title,
    description: options.abstract,
    url: canonicalUrl,
    image,
    ...(datePublished ? { datePublished } : {}),
    ...(dateModified ? { dateModified } : {}),
    ...contentPageFields(siteUrl, canonicalUrl, options.authorName),
  };
}

/**
 * Builds Schema.org Article structured data for Writing detail.
 */
export function buildArticleJsonLd(
  options: ArticleJsonLdOptions,
): Record<string, unknown> {
  const canonicalUrl = resolveCanonicalUrl(`/writing/${options.slug}`);
  const siteUrl = resolveCanonicalUrl("/").replace(/\/+$/, "");
  const datePublished = toIsoDate(options.publishedAt);
  const dateModified = toIsoDate(options.updatedAt);
  const image = resolveStructuredDataImage(options.coverUrl);

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${canonicalUrl}/#article`,
    headline: options.title,
    name: options.title,
    description: options.excerpt,
    url: canonicalUrl,
    image,
    ...(datePublished ? { datePublished } : {}),
    ...(dateModified ? { dateModified } : {}),
    ...contentPageFields(siteUrl, canonicalUrl, options.authorName),
  };
}

/**
 * Builds Schema.org BreadcrumbList structured data for public detail routes.
 */
export function buildBreadcrumbJsonLd(items: BreadcrumbItem[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: resolveCanonicalUrl(item.url),
    })),
  };
}

/**
 * Combines multiple Schema.org entities into a single `@graph` object.
 */
export function buildJsonLdGraph(
  nodes: Array<Record<string, unknown> | null | undefined>,
): Record<string, unknown> {
  const filtered = nodes.filter(
    (node): node is Record<string, unknown> => node !== null && node !== undefined,
  );
  const cleaned = filtered.map((node) => {
    const copy = { ...node };
    delete copy["@context"];
    return copy;
  });
  return {
    "@context": "https://schema.org",
    "@graph": cleaned,
  };
}
