import { ContentTable } from "@/components/admin/content-table";
import * as articlesService from "@/server/services/articles";

export default async function WritingListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const [overview, { status, q }] = await Promise.all([
    articlesService.listArticlesOverview(),
    searchParams,
  ]);

  return (
    <ContentTable
      title="Writing"
      description="Essays and notes shown on /writing."
      basePath="/admin/articles"
      newHref="/admin/articles/new"
      newLabel="New article"
      emptyLabel="No articles yet."
      filter={status}
      query={q}
      rows={overview.map(({ article, draft, published }) => ({
        id: article.id,
        title: draft?.title ?? published?.title ?? article.slug,
        slug: article.slug,
        href: `/admin/articles/${article.id}`,
        live: Boolean(published),
        draft: Boolean(draft),
        archived: article.status === "ARCHIVED",
        updatedAt: article.updatedAt,
        meta: (draft ?? published)?.category ?? null,
      }))}
    />
  );
}
