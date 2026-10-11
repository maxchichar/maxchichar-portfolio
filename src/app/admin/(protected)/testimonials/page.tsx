import Link from "next/link";

import { AdminPageHeader } from "@/components/admin/page-header";
import { listTestimonialsAdmin } from "@/server/services/testimonials";

import { projectOptions } from "./project-options";

export const dynamic = "force-dynamic";

export default async function TestimonialsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; deleted?: string; error?: string }>;
}) {
  const [{ saved, deleted, error }, { available, items }, projects] = await Promise.all([
    searchParams,
    listTestimonialsAdmin(),
    projectOptions(),
  ]);
  const projectTitle = new Map(projects.map((p) => [p.id, p.title]));
  const notice = saved ? "Testimonial saved." : deleted ? "Testimonial deleted." : null;

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10 md:px-10 md:py-12">
      <AdminPageHeader
        title="Testimonials"
        description="Quotes from clients and collaborators. Featured ones appear on the homepage; ones linked to a project appear on its case study."
        actions={
          available ? (
            <Link
              href="/admin/testimonials/new"
              className="rounded-card bg-accent text-bg px-4 py-2 font-sans text-sm font-medium transition-opacity hover:opacity-90"
            >
              + New testimonial
            </Link>
          ) : null
        }
      />

      {!available ? (
        <p className="border-border bg-surface text-text mb-6 rounded-lg border px-4 py-3 font-sans text-sm">
          Testimonials need a one-time database update. Run{" "}
          <code className="font-mono text-xs">npm run db:push</code>, then reload this
          page.
        </p>
      ) : null}
      {notice ? (
        <p
          role="status"
          className="border-border bg-surface text-text mb-6 rounded-lg border px-4 py-3 font-sans text-sm"
        >
          <span className="text-accent">✓</span> {notice}
        </p>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="border-border bg-surface text-text mb-6 rounded-lg border px-4 py-3 font-sans text-sm"
        >
          {error}
        </p>
      ) : null}

      {available && items.length === 0 ? (
        <div className="rounded-panel border-border border border-dashed p-12 text-center">
          <p className="text-text font-sans text-sm font-medium">No testimonials yet.</p>
          <p className="text-text-muted mx-auto mt-2 max-w-md font-serif text-sm">
            A few words from people you&apos;ve worked with do more for trust than
            anything you can write about yourself. Nothing shows on the site until you add
            one.
          </p>
        </div>
      ) : null}

      {items.length > 0 ? (
        <ul className="rounded-panel border-border divide-border divide-y border">
          {items.map((t) => {
            const byline = [t.authorRole, t.authorCompany].filter(Boolean).join(", ");
            const project = t.projectId ? projectTitle.get(t.projectId) : null;
            return (
              <li key={t.id}>
                <Link
                  href={`/admin/testimonials/${t.id}`}
                  className="hover:bg-surface grid gap-3 px-5 py-4 transition-colors md:grid-cols-[1fr_auto] md:items-center md:gap-8"
                >
                  <div className="min-w-0">
                    <p className="text-text line-clamp-2 font-serif text-base leading-snug">
                      &ldquo;{t.quote}&rdquo;
                    </p>
                    <p className="text-text-muted mt-1.5 font-sans text-xs">
                      <span className="text-text font-medium">{t.authorName}</span>
                      {byline ? ` · ${byline}` : ""}
                      {project ? ` · on ${project}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
                    {t.featured ? (
                      <span className="border-accent text-accent rounded-full border px-2 py-0.5">
                        Home
                      </span>
                    ) : null}
                    {!t.visible ? (
                      <span className="border-border text-text-muted rounded-full border px-2 py-0.5">
                        Hidden
                      </span>
                    ) : null}
                    <span className="text-text-muted">#{t.sortOrder}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </main>
  );
}
