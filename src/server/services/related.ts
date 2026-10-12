import "server-only";

import { readNext, type ContentType } from "@/lib/related";
import type { TaggedCard } from "@/lib/topics";

import { listPublicArticlesOverview } from "./articles";
import { listPublicWorkOverview } from "./projects";
import { listPublicResearchOverview } from "./research";

const time = (d: Date | null | undefined) => (d ? new Date(d).getTime() : 0);

async function safe<T>(promise: Promise<T[]>): Promise<T[]> {
  try {
    return await promise;
  } catch (err) {
    console.error("read next:", err);
    return [];
  }
}

/** Every published item as a card, in each listing's own order. */
export async function listContentCards(): Promise<TaggedCard[]> {
  const [work, research, writing] = await Promise.all([
    safe(listPublicWorkOverview()),
    safe(listPublicResearchOverview()),
    safe(listPublicArticlesOverview()),
  ]);
  return [
    ...work.map(({ project, published, tags, coverUrl }, order) => ({
      type: "work" as const,
      slug: project.slug,
      href: `/work/${project.slug}`,
      title: published.title,
      summary: published.shortDescription,
      coverUrl,
      tags: tags.map((t) => t.name),
      tagRefs: tags.map((t) => ({ name: t.name, slug: t.slug })),
      category: published.category,
      date: time(published.publishedAt),
      order,
    })),
    ...research.map(({ research: r, published, tags, coverUrl }, order) => ({
      type: "research" as const,
      slug: r.slug,
      href: `/research/${r.slug}`,
      title: published.title,
      summary: published.abstract,
      coverUrl,
      tags: tags.map((t) => t.name),
      tagRefs: tags.map((t) => ({ name: t.name, slug: t.slug })),
      category: published.category,
      date: time(published.publishedAt),
      order,
    })),
    ...writing.map(({ article, published, tags, coverUrl }, order) => ({
      type: "writing" as const,
      slug: article.slug,
      href: `/writing/${article.slug}`,
      title: published.title,
      summary: published.excerpt,
      coverUrl,
      tags: tags.map((t) => t.name),
      tagRefs: tags.map((t) => ({ name: t.name, slug: t.slug })),
      category: published.category,
      date: time(published.publishedAt),
      order,
    })),
  ];
}

/** "Next up" and "Related" for a detail page. */
export async function getReadNext(type: ContentType, slug: string) {
  const all = await listContentCards();
  const current = all.find((c) => c.type === type && c.slug === slug);
  if (!current) return { next: null, related: [] };
  return readNext(current, all);
}
