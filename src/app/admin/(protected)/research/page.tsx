import Link from "next/link";

import * as researchService from "@/server/services/research";

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

export default async function ResearchListPage() {
  const overview = await researchService.listResearchOverview();

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-text font-sans text-2xl font-semibold">Research</h1>
        <Link
          href="/admin/research/new"
          className="rounded-card bg-accent text-bg px-4 py-2 font-sans text-sm font-medium transition-opacity hover:opacity-90"
        >
          New Research
        </Link>
      </div>

      <div className="mt-8 space-y-3">
        {overview.length === 0 ? (
          <p className="text-text-muted font-serif text-sm">No research items yet.</p>
        ) : (
          overview.map(({ research, draft, published }) => (
            <Link
              key={research.id}
              href={`/admin/research/${research.id}`}
              className="rounded-panel border-border bg-surface hover:border-accent/40 flex items-center justify-between border p-4 transition-colors"
            >
              <div>
                <p className="text-text font-sans text-sm font-medium">
                  {published?.title ?? draft?.title ?? research.slug}
                </p>
                <p className="text-text-muted mt-0.5 font-mono text-xs">
                  /{research.slug}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {research.status === "ARCHIVED" && (
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
