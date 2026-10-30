import Link from "next/link";

import { StatTile } from "@/components/admin/analytics/stat-tile";
import { auth } from "@/lib/auth/config";
import { resolveCanonicalUrl } from "@/lib/metadata";
import { getAnalyticsSummary } from "@/server/services/analytics";
import { listInbox } from "@/server/services/contact";
import { listArticlesOverview } from "@/server/services/articles";
import { listMediaLibrary } from "@/server/services/media";
import { listPagesOverview } from "@/server/services/pages";
import { listProjectsOverview } from "@/server/services/projects";
import { listResearchOverview } from "@/server/services/research";
import { getPublicSiteSettings } from "@/server/services/settings";

type Overview = { draft: unknown; published: unknown }[];

function summarize(items: Overview) {
  return {
    total: items.length,
    published: items.filter((i) => i.published).length,
    drafts: items.filter((i) => i.draft).length,
  };
}

export default async function AdminDashboard() {
  const [session, projects, research, articles, pages, media, settings, traffic, inbox] =
    await Promise.all([
      auth(),
      listProjectsOverview(),
      listResearchOverview(),
      listArticlesOverview(),
      listPagesOverview(),
      listMediaLibrary({ status: "READY" }),
      getPublicSiteSettings(),
      getAnalyticsSummary(7),
      listInbox(null),
    ]);
  const unread = inbox.counts.NEW ?? 0;

  const contentStats = [
    {
      label: "Projects",
      href: "/admin/projects",
      newHref: "/admin/projects/new",
      ...summarize(projects),
    },
    {
      label: "Research",
      href: "/admin/research",
      newHref: "/admin/research/new",
      ...summarize(research),
    },
    {
      label: "Writing",
      href: "/admin/articles",
      newHref: "/admin/articles/new",
      ...summarize(articles),
    },
  ];

  const name = session?.user?.email?.split("@")[0] ?? "there";

  const checklist = [
    {
      done: Boolean(settings.heroImage),
      label: "Homepage hero image",
      href: "/admin/settings",
    },
    {
      done: Boolean(settings.aboutImage),
      label: "About page portrait",
      href: "/admin/settings",
    },
    ...pages.map(({ page, published }) => ({
      done: Boolean(published),
      label: `${page.slug.charAt(0).toUpperCase()}${page.slug.slice(1)} page published`,
      href: `/admin/pages/${page.slug}`,
    })),
  ];
  const remaining = checklist.filter((c) => !c.done).length;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10 md:px-10 md:py-12">
      <header className="border-border flex flex-col gap-5 border-b pb-6 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-6 sm:pb-8">
        <div className="min-w-0">
          <p className="text-text-muted font-mono text-xs tracking-wider uppercase">
            Dashboard
          </p>
          <h1 className="text-text mt-2 font-sans text-2xl font-semibold tracking-tight [overflow-wrap:anywhere] sm:text-3xl md:text-4xl">
            Welcome back, <span className="text-accent-purple">{name}</span>.
          </h1>
          <p className="text-text-muted mt-2 font-serif text-sm">
            Here&apos;s the state of your portfolio.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
          <Link
            href={resolveCanonicalUrl("/")}
            target="_blank"
            className="rounded-card border-border text-text hover:border-accent hover:text-accent border px-4 py-2.5 text-center font-sans text-sm transition-colors sm:py-2"
          >
            View site ↗
          </Link>
          <Link
            href="/admin/projects/new"
            className="rounded-card bg-accent text-bg px-4 py-2.5 text-center font-sans text-sm font-medium transition-opacity hover:opacity-90 sm:py-2"
          >
            New project
          </Link>
        </div>
      </header>

      {!traffic.available ? (
        <p
          role="alert"
          className="rounded-card border-border bg-surface-2 text-text mt-6 border px-4 py-3 font-sans text-sm sm:mt-10"
        >
          Analytics isn&apos;t available yet. Apply the latest database migration (
          <code className="font-mono text-xs">npm run db:push</code>) to create the{" "}
          <code className="font-mono text-xs">page_views</code> table.
        </p>
      ) : null}
      <section
        aria-label="Traffic"
        className="mt-6 grid grid-cols-2 gap-3 sm:mt-10 sm:gap-4 lg:grid-cols-4"
      >
        <StatTile
          label="Visitors · 7 days"
          value={traffic.visitors}
          previous={traffic.prevVisitors}
          note="vs previous 7d"
        />
        <StatTile
          label="Page views · 7 days"
          value={traffic.views}
          previous={traffic.prevViews}
          note="vs previous 7d"
        />
        <StatTile label="Live now" value={traffic.live} note="last 5 min" live />
        <Link
          href="/admin/inbox?view=NEW"
          className="rounded-panel border-border bg-surface hover:border-text/25 min-w-0 border p-4 transition-colors sm:p-5"
        >
          <p className="text-text-muted font-sans text-xs sm:text-sm">Unread messages</p>
          <p className="text-text mt-2 font-sans text-3xl font-semibold tracking-tight tabular-nums sm:mt-3 sm:text-4xl">
            {unread}
          </p>
          <p className="text-accent mt-2 font-sans text-xs">Open inbox →</p>
        </Link>
      </section>
      <p className="mt-3 text-right">
        <Link
          href="/admin/analytics"
          className="text-accent font-sans text-xs hover:underline"
        >
          Full analytics →
        </Link>
      </p>

      <section
        aria-label="Content"
        className="mt-4 grid gap-3 sm:mt-6 sm:gap-4 md:grid-cols-3"
      >
        {contentStats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-panel border-border bg-surface group relative overflow-hidden border p-4 sm:p-6"
          >
            <div className="flex items-start justify-between">
              <p className="text-text-muted font-sans text-sm">{stat.label}</p>
              <Link
                href={stat.newHref}
                className="text-text-muted hover:text-accent -my-1 py-1 font-sans text-xs transition-colors"
              >
                + New
              </Link>
            </div>
            <p className="text-text mt-3 font-sans text-4xl font-semibold tracking-tight tabular-nums sm:mt-4 sm:text-5xl">
              {stat.total}
            </p>
            <div className="text-text-muted mt-4 flex gap-4 font-mono text-xs">
              <span>
                <span className="text-text">{stat.published}</span> live
              </span>
              <span>
                <span className="text-text">{stat.drafts}</span> in draft
              </span>
            </div>
            <Link
              href={stat.href}
              className="text-accent mt-4 inline-flex items-center gap-1 py-1 font-sans text-xs font-medium hover:underline sm:mt-6"
            >
              Manage {stat.label.toLowerCase()} →
            </Link>
          </div>
        ))}
      </section>

      <div className="mt-3 grid gap-3 sm:mt-4 sm:gap-4 lg:grid-cols-[2fr_1fr]">
        <section className="rounded-panel border-border bg-surface border p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-text font-sans text-sm font-medium">Site readiness</h2>
            <span className="text-text-muted font-mono text-xs">
              {remaining === 0 ? "All set" : `${remaining} to do`}
            </span>
          </div>
          <ul className="divide-border mt-4 divide-y">
            {checklist.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className="group flex items-center gap-3 py-3 font-sans text-sm"
                >
                  <span
                    aria-hidden="true"
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                      item.done
                        ? "border-accent bg-accent text-bg"
                        : "border-border text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                  <span
                    className={
                      item.done ? "text-text-muted" : "text-text group-hover:text-accent"
                    }
                  >
                    {item.label}
                  </span>
                  <span className="sr-only">{item.done ? "(done)" : "(to do)"}</span>
                  {!item.done ? (
                    <span className="text-text-muted group-hover:text-accent ml-auto shrink-0 text-xs">
                      →
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-1">
          <Link
            href="/admin/media"
            className="rounded-panel border-border bg-surface hover:border-accent/40 min-w-0 border p-4 transition-colors sm:p-6"
          >
            <p className="text-text-muted font-sans text-sm">Media library</p>
            <p className="text-text mt-3 font-sans text-3xl font-semibold tabular-nums">
              {media.length}
            </p>
            <p className="text-text-muted mt-1 font-mono text-xs">validated files</p>
          </Link>
          <Link
            href="/admin/pages"
            className="rounded-panel border-border bg-surface hover:border-accent/40 min-w-0 border p-4 transition-colors sm:p-6"
          >
            <p className="text-text-muted font-sans text-sm">Pages</p>
            <p className="text-text mt-3 font-sans text-3xl font-semibold tabular-nums">
              {pages.filter((p) => p.published).length}
              <span className="text-text-muted text-lg">/{pages.length}</span>
            </p>
            <p className="text-text-muted mt-1 font-mono text-xs">published</p>
          </Link>
        </section>
      </div>
    </main>
  );
}
