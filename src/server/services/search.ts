import "server-only";

import type { SearchItem } from "@/lib/search";
import { tiptapDocToPlainText } from "@/lib/validation/project";

import { listPublicArticlesOverview } from "./articles";
import { getSiteDocument } from "./documents";
import { listPublicWorkOverview } from "./projects";
import { listPublicResearchOverview } from "./research";
import { getPublicSiteSettings } from "./settings";

const MAX_BODY_CHARS = 4000;

export interface SearchIndex {
  items: SearchItem[];
  links: {
    email: string | null;
    socials: { label: string; href: string }[];
    cv: boolean;
  };
}

function sectionsText(sections: unknown): string {
  if (!Array.isArray(sections)) return "";
  return sections
    .map((s) => {
      const section = s as { heading?: string; content?: unknown };
      return `${section.heading ?? ""}\n${tiptapDocToPlainText(section.content)}`;
    })
    .join("\n");
}

const clip = (text: string) => text.replace(/\s+/g, " ").trim().slice(0, MAX_BODY_CHARS);

/** Each list fails on its own, so one broken query doesn't empty the palette. */
async function safe<T>(promise: Promise<T[]>): Promise<T[]> {
  try {
    return await promise;
  } catch (err) {
    console.error("search index:", err);
    return [];
  }
}

/** Everything the command palette can find: published, active content only. */
export async function getSearchIndex(): Promise<SearchIndex> {
  const [work, research, writing, settings, cv] = await Promise.all([
    safe(listPublicWorkOverview()),
    safe(listPublicResearchOverview()),
    safe(listPublicArticlesOverview()),
    getPublicSiteSettings(),
    getSiteDocument("cv"),
  ]);

  const items: SearchItem[] = [
    ...work.map(({ project, published, tags }) => ({
      type: "work" as const,
      title: published.title,
      summary: published.shortDescription,
      href: `/work/${project.slug}`,
      meta: [published.category, published.year].filter(Boolean).join(" · ") || null,
      tags: tags.map((t) => t.name),
      body: clip(sectionsText(published.sections)),
    })),
    ...research.map(({ research: r, published, tags }) => ({
      type: "research" as const,
      title: published.title,
      summary: published.abstract,
      href: `/research/${r.slug}`,
      meta: published.category ?? null,
      tags: tags.map((t) => t.name),
      body: clip(sectionsText(published.sections)),
    })),
    ...writing.map(({ article, published, tags }) => ({
      type: "writing" as const,
      title: published.title,
      summary: published.excerpt,
      href: `/writing/${article.slug}`,
      meta: published.publishedAt
        ? new Date(published.publishedAt).toLocaleDateString("en-US", {
            month: "short",
            year: "numeric",
          })
        : null,
      tags: tags.map((t) => t.name),
      body: clip(tiptapDocToPlainText(published.content)),
    })),
  ];

  const socials = [
    { label: "GitHub", href: settings.socialGithub },
    { label: "LinkedIn", href: settings.socialLinkedin },
    { label: "X", href: settings.socialX },
    { label: "Instagram", href: settings.socialInstagram },
    { label: "YouTube", href: settings.socialYoutube },
    { label: "TikTok", href: settings.socialTiktok },
  ].filter((s): s is { label: string; href: string } => Boolean(s.href));

  return {
    items,
    links: { email: settings.primaryEmail, socials, cv: Boolean(cv) },
  };
}
