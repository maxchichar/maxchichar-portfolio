import Link from "next/link";

import * as pagesService from "@/server/services/pages";

const PAGE_LABELS: Record<string, string> = {
  home: "Home",
  about: "About",
  now: "Now",
};

function StatusBadge({ label, tone }: { label: string; tone: "draft" | "published" }) {
  const toneClass =
    tone === "published"
      ? "border-accent/40 text-accent"
      : "border-border text-text-muted";
  return (
    <span className={`rounded-badge border px-2 py-0.5 font-mono text-xs ${toneClass}`}>
      {label}
    </span>
  );
}

export default async function PagesListPage() {
  const overview = await pagesService.listPagesOverview();

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-text font-sans text-2xl font-semibold">Pages</h1>
      <p className="text-text-muted mt-1 font-serif text-sm">
        Home, About, and Now — fixed pages, always present.
      </p>

      <div className="mt-8 space-y-3">
        {overview.map(({ page, draft, published }) => (
          <Link
            key={page.id}
            href={`/admin/pages/${page.slug}`}
            className="rounded-panel border-border bg-surface hover:border-accent/40 flex items-center justify-between border p-4 transition-colors"
          >
            <div>
              <p className="text-text font-sans text-sm font-medium">
                {PAGE_LABELS[page.slug] ?? page.slug}
              </p>
              <p className="text-text-muted mt-0.5 font-mono text-xs">/{page.slug}</p>
            </div>
            <div className="flex items-center gap-2">
              {published && <StatusBadge label="PUBLISHED" tone="published" />}
              {draft && <StatusBadge label="DRAFT" tone="draft" />}
              {!published && !draft && (
                <span className="text-text-muted font-mono text-xs">
                  No version — run seed:pages
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
