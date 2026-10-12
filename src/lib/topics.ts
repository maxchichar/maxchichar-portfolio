/**
 * Topic pages built from content tags. Pure (no I/O) so it's unit tested.
 *
 * A topic is one tag slug plus every published item carrying it, across work,
 * research and writing. Related topics are the tags that most often appear on
 * the same items.
 */

import type { ContentCard, ContentType } from "@/lib/related";

export interface TagRef {
  name: string;
  slug: string;
}

/** A content card that also knows its tags' slugs. */
export type TaggedCard = ContentCard & { tagRefs: TagRef[] };

export interface Topic {
  slug: string;
  name: string;
  count: number;
  counts: Record<ContentType, number>;
  items: TaggedCard[];
}

export const TOPIC_TYPE_ORDER: ContentType[] = ["work", "research", "writing"];

/** Path for a tag's topic page, or null when the tag has no usable slug. */
export function topicHref(tag: { slug: string | null | undefined }): string | null {
  const slug = tag.slug?.trim();
  return slug ? `/topics/${encodeURIComponent(slug)}` : null;
}

/** Each card's tags, de-duplicated by slug, without empty slugs. */
function cardTags(card: TaggedCard): TagRef[] {
  const seen = new Map<string, TagRef>();
  for (const tag of card.tagRefs) {
    const slug = tag.slug.trim();
    if (slug && !seen.has(slug)) seen.set(slug, { name: tag.name.trim() || slug, slug });
  }
  return [...seen.values()];
}

/**
 * Every topic with at least one item, most used first (ties alphabetical).
 * Items within a topic are newest first.
 */
export function buildTopics(cards: TaggedCard[]): Topic[] {
  const bySlug = new Map<string, Topic>();
  for (const card of cards) {
    for (const tag of cardTags(card)) {
      let topic = bySlug.get(tag.slug);
      if (!topic) {
        topic = {
          slug: tag.slug,
          name: tag.name,
          count: 0,
          counts: { work: 0, research: 0, writing: 0 },
          items: [],
        };
        bySlug.set(tag.slug, topic);
      }
      topic.count += 1;
      topic.counts[card.type] += 1;
      topic.items.push(card);
    }
  }
  const topics = [...bySlug.values()];
  for (const topic of topics) {
    topic.items.sort((a, b) => b.date - a.date || a.order - b.order);
  }
  return topics.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** Items of one topic, grouped by type in site order, skipping empty groups. */
export function groupTopicItems(
  topic: Topic,
): { type: ContentType; items: TaggedCard[] }[] {
  return TOPIC_TYPE_ORDER.map((type) => ({
    type,
    items: topic.items.filter((i) => i.type === type),
  })).filter((g) => g.items.length > 0);
}

/** Topics that share the most items with this one. */
export function relatedTopics(topic: Topic, topics: Topic[], limit = 8): Topic[] {
  const shared = new Map<string, number>();
  for (const item of topic.items) {
    for (const tag of cardTags(item)) {
      if (tag.slug !== topic.slug) shared.set(tag.slug, (shared.get(tag.slug) ?? 0) + 1);
    }
  }
  return topics
    .filter((t) => shared.has(t.slug))
    .sort(
      (a, b) =>
        shared.get(b.slug)! - shared.get(a.slug)! ||
        b.count - a.count ||
        a.name.localeCompare(b.name),
    )
    .slice(0, limit);
}

/** "3 projects, 1 research piece and 2 essays" style summary. */
export function describeCounts(counts: Record<ContentType, number>): string {
  const parts = [
    counts.work ? `${counts.work} ${counts.work === 1 ? "project" : "projects"}` : null,
    counts.research
      ? `${counts.research} research ${counts.research === 1 ? "piece" : "pieces"}`
      : null,
    counts.writing
      ? `${counts.writing} ${counts.writing === 1 ? "essay" : "essays"}`
      : null,
  ].filter((p): p is string => Boolean(p));
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;
}
