/** Public overview rows only: drafts and archived projects are excluded upstream. */
export function selectHomepageWork<
  T extends {
    project: { featured: boolean; sortOrder: number };
    published: { publishedAt: Date | string | null };
  },
>(work: T[], limit: number): T[] {
  const timestamp = (row: T) =>
    row.published.publishedAt ? new Date(row.published.publishedAt).getTime() || 0 : 0;
  return [...work]
    .sort((a, b) => {
      if (a.project.featured !== b.project.featured) return a.project.featured ? -1 : 1;
      if (a.project.featured && a.project.sortOrder !== b.project.sortOrder) {
        return a.project.sortOrder - b.project.sortOrder;
      }
      return timestamp(b) - timestamp(a);
    })
    .slice(0, limit);
}

/** The same published, active research used by /research, with curation first. */
export function selectHomepageResearch<
  T extends {
    research: { featured: boolean; sortOrder: number };
    published: { publishedAt: Date | string | null };
  },
>(research: T[], limit: number): T[] {
  const timestamp = (row: T) =>
    row.published.publishedAt ? new Date(row.published.publishedAt).getTime() || 0 : 0;
  return [...research]
    .sort((a, b) => {
      if (a.research.featured !== b.research.featured)
        return a.research.featured ? -1 : 1;
      if (a.research.featured && a.research.sortOrder !== b.research.sortOrder) {
        return a.research.sortOrder - b.research.sortOrder;
      }
      return timestamp(b) - timestamp(a);
    })
    .slice(0, limit);
}
