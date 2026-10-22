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
