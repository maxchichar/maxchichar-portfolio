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
    <main className="mx-auto w-full max-w-4xl px-6 py-10 md:px-10 md:py-12">
      <AdminPageHeader
        title="Pages"
        description="Home, About, and Now — fixed pages, always present."
      />

      <div className="grid gap-4 md:grid-cols-3">
        {overview.map(({ page, draft, published }) => (
          <Link
            key={page.id}
            href={`/admin/pages/${page.slug}`}
            className="group rounded-panel border-border bg-surface hover:border-text/25 flex flex-col justify-between gap-8 border p-6 transition-colors"
          >
            <div>
              <p className="text-text group-hover:text-accent font-sans text-lg font-semibold transition-colors">
                {PAGE_LABELS[page.slug] ?? page.slug}
              </p>
              <p className="text-text-muted mt-0.5 font-mono text-xs">/{page.slug}</p>
            </div>
            <div className="flex items-center gap-2">
              {published && <StatusPill status="PUBLISHED" label="Live" />}
              {draft && <StatusPill status="DRAFT" label="Draft" />}
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
