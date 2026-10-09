import { ContentTable } from "@/components/admin/content-table";
import * as projectService from "@/server/services/projects";

export default async function ProjectsListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const [overview, { status, q }] = await Promise.all([
    projectService.listProjectsOverview(),
    searchParams,
  ]);

  return (
    <ContentTable
      title="Projects"
      description="Case studies shown on /work."
      basePath="/admin/projects"
      newHref="/admin/projects/new"
      newLabel="New project"
      emptyLabel="No projects yet."
      filter={status}
      query={q}
      rows={overview.map(({ project, draft, published }) => ({
        id: project.id,
        title: draft?.title ?? published?.title ?? project.slug,
        slug: project.slug,
        href: `/admin/projects/${project.id}`,
        live: Boolean(published),
        draft: Boolean(draft),
        archived: project.status === "ARCHIVED",
        updatedAt: project.updatedAt,
        meta: (draft ?? published)?.category ?? null,
      }))}
    />
  );
}
