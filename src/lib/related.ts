/**
 * "Read next" across the site. Pure (no I/O) so it's unit tested.
 *
 * Relatedness = 3 points per shared tag + 1 for the same category. The big
 * "Next up" card prefers the most related item of the same kind and falls
 * back to the next item in listing order; the "Related" list surfaces up to
 * a few more topical links of any kind (a project's research and essays),
 * and is empty rather than padded when nothing is actually related.
 */

export type ContentType = "work" | "research" | "writing";

export interface ContentCard {
  type: ContentType;
  slug: string;
  href: string;
  title: string;
  summary: string;
  coverUrl: string | null;
  tags: string[];
  category: string | null;
  /** Published time in ms (0 if unknown), for tie-breaks. */
  date: number;
  /** Position in its own listing (the order the list pages show). */
  order: number;
}

export function relatedScore(a: ContentCard, b: ContentCard): number {
  const tagsA = new Set(a.tags.map((t) => t.trim().toLowerCase()));
  let score = 0;
  for (const t of new Set(b.tags.map((t) => t.trim().toLowerCase()))) {
    if (tagsA.has(t)) score += 3;
  }
  if (a.category && b.category && a.category.toLowerCase() === b.category.toLowerCase()) {
    score += 1;
  }
  return score;
}

export function readNext(
  current: ContentCard,
  all: ContentCard[],
  relatedLimit = 3,
): { next: ContentCard | null; related: ContentCard[] } {
  const others = all.filter((c) => c.href !== current.href);
  const ranked = others
    .map((card) => ({ card, score: relatedScore(current, card) }))
    .sort((a, b) => b.score - a.score || b.card.date - a.card.date);

  const bestSameType = ranked.find((r) => r.card.type === current.type && r.score > 0);
  let next = bestSameType?.card ?? null;
  if (!next) {
    const listing = all
      .filter((c) => c.type === current.type)
      .sort((a, b) => a.order - b.order);
    const idx = listing.findIndex((c) => c.href === current.href);
    const candidate =
      listing.length > 1 ? listing[(idx + 1) % listing.length] : undefined;
    next = candidate && candidate.href !== current.href ? candidate : null;
  }

  const related = ranked
    .filter((r) => r.score > 0 && r.card.href !== next?.href)
    .slice(0, relatedLimit)
    .map((r) => r.card);

  return { next, related };
}
