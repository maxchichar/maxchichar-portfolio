import { ContentTable } from "@/components/admin/content-table";
import * as researchService from "@/server/services/research";

export default async function ResearchListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const [overview, { status, q }] = await Promise.all([
    researchService.listResearchOverview(),
    searchParams,
  ]);

  return (
    <ContentTable
      title="Research"
      description="Papers, notes and experiments shown on /research."
      basePath="/admin/research"
      newHref="/admin/research/new"
      newLabel="New research"
      emptyLabel="No research yet."
      filter={status}
      query={q}
      rows={overview.map(({ research, draft, published }) => ({
        id: research.id,
        title: draft?.title ?? published?.title ?? research.slug,
        slug: research.slug,
        href: `/admin/research/${research.id}`,
        live: Boolean(published),
        draft: Boolean(draft),
        archived: research.status === "ARCHIVED",
        updatedAt: research.updatedAt,
        meta: (draft ?? published)?.type ?? null,
      }))}
    />
  );
}
