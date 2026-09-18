import Link from "next/link";

import * as articlesService from "@/server/services/articles";

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

export default async function ArticlesListPage() {
  const overview = await articlesService.listArticlesOverview();

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-text font-sans text-2xl font-semibold">Writing</h1>
        <Link
          href="/admin/articles/new"
          className="rounded-card bg-accent text-bg px-4 py-2 font-sans text-sm font-medium transition-opacity hover:opacity-90"
        >
          New Article
        </Link>
      </div>

      <div className="mt-8 space-y-3">
        {overview.length === 0 ? (
          <p className="text-text-muted font-serif text-sm">No articles yet.</p>
        ) : (
          overview.map(({ article, draft, published }) => (
            <Link
              key={article.id}
              href={`/admin/articles/${article.id}`}
              className="rounded-panel border-border bg-surface hover:border-accent/40 flex items-center justify-between border p-4 transition-colors"
            >
              <div>
                <p className="text-text font-sans text-sm font-medium">
                  {published?.title ?? draft?.title ?? article.slug}
                </p>
                <p className="text-text-muted mt-0.5 font-mono text-xs">/{article.slug}</p>
              </div>
              <div className="flex items-center gap-2">
                {article.status === "ARCHIVED" && (
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
