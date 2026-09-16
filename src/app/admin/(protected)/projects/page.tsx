import Link from "next/link";

import * as projectService from "@/server/services/projects";

function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: "draft" | "published" | "archived";
}) {
  const toneClass =
    tone === "published"
      ? "border-accent/40 text-accent"
      : tone === "draft"
        ? "border-border text-text-muted"
        : "border-border text-text-muted opacity-60";
  return (
    <span className={`rounded-badge border px-2 py-0.5 font-mono text-xs ${toneClass}`}>
      {label}
    </span>
  );
}

export default async function ProjectsListPage() {
  const overview = await projectService.listProjectsOverview();

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-text font-sans text-2xl font-semibold">Projects</h1>
        <Link
          href="/admin/projects/new"
          className="rounded-card bg-accent text-bg px-4 py-2 font-sans text-sm font-medium transition-opacity hover:opacity-90"
        >
          New Project
        </Link>
      </div>

      <div className="mt-8 space-y-3">
        {overview.length === 0 ? (
          <p className="text-text-muted font-serif text-sm">No projects yet.</p>
        ) : (
          overview.map(({ project, draft, published }) => (
            <Link
              key={project.id}
              href={`/admin/projects/${project.id}`}
              className="rounded-panel border-border bg-surface hover:border-accent/40 flex items-center justify-between border p-4 transition-colors"
            >
              <div>
                <p className="text-text font-sans text-sm font-medium">
                  {published?.title ?? draft?.title ?? project.slug}
                </p>
                <p className="text-text-muted mt-0.5 font-mono text-xs">
                  /{project.slug}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {project.status === "ARCHIVED" && (
                  <StatusBadge label="ARCHIVED" tone="archived" />
                )}
                {published && <StatusBadge label="PUBLISHED" tone="published" />}
                {draft && <StatusBadge label="DRAFT" tone="draft" />}
              </div>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}
