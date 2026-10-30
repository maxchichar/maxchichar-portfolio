import Link from "next/link";

import { StatusPill } from "@/components/admin/editor/publish-panel";
import { AdminPageHeader } from "@/components/admin/page-header";

import * as pagesService from "@/server/services/pages";

const PAGE_LABELS: Record<string, string> = {
  home: "Home",
  about: "About",
  now: "Now",
};

export default async function PagesListPage() {
  const overview = await pagesService.listPagesOverview();

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10 md:px-10 md:py-12">
      <AdminPageHeader
        title="Pages"
        description="Home, About, and Now. Fixed pages, always present."
      />

      <div className="grid gap-3 sm:gap-4 md:grid-cols-3">
        {overview.map(({ page, draft, published }) => (
          <Link
            key={page.id}
            href={`/admin/pages/${page.slug}`}
            className="group rounded-panel border-border bg-surface hover:border-text/25 flex items-center justify-between gap-4 border p-4 transition-colors sm:p-5 md:flex-col md:items-stretch md:gap-8 md:p-6"
          >
            <div className="min-w-0">
              <p className="text-text group-hover:text-accent font-sans text-lg font-semibold transition-colors">
                {PAGE_LABELS[page.slug] ?? page.slug}
              </p>
              <p className="text-text-muted mt-0.5 font-mono text-xs">/{page.slug}</p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 md:justify-start">
              {published && <StatusPill status="PUBLISHED" label="Live" />}
              {draft && <StatusPill status="DRAFT" label="Draft" />}
              {!published && !draft && (
                <span className="text-text-muted text-right font-mono text-xs md:text-left">
                  No version yet. Run seed:pages
                </span>
              )}
              <span
                aria-hidden="true"
                className="text-text-muted group-hover:text-accent ml-1 transition-colors md:hidden"
              >
                →
              </span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
