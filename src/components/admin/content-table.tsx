import Link from "next/link";

import { AdminPageHeader } from "@/components/admin/page-header";
import { StatusPill } from "@/components/admin/editor/publish-panel";

export interface ContentRow {
  id: string;
  title: string;
  slug: string;
  href: string;
  live: boolean;
  draft: boolean;
  archived: boolean;
  updatedAt: Date;
  meta?: string | null;
}

const FILTERS = [
  { value: "all", label: "All" },
  { value: "live", label: "Live" },
  { value: "draft", label: "In draft" },
  { value: "archived", label: "Archived" },
] as const;
type Filter = (typeof FILTERS)[number]["value"];

function matches(row: ContentRow, filter: Filter) {
  if (filter === "live") return row.live && !row.archived;
  if (filter === "draft") return row.draft && !row.archived;
  if (filter === "archived") return row.archived;
  return true;
}

function relative(date: Date) {
  const mins = Math.round((Date.now() - new Date(date).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Admin list for versioned content: status filter tabs, title search, and a
 * dense, scannable table sorted by most recently updated. Filtering is plain
 * GET params, so it works without JS and URLs are shareable.
 */
export function ContentTable({
  title,
  description,
  basePath,
  newHref,
  newLabel,
  rows,
  filter: rawFilter,
  query: rawQuery,
  emptyLabel,
}: {
  title: string;
  description: string;
  basePath: string;
  newHref: string;
  newLabel: string;
  rows: ContentRow[];
  filter?: string;
  query?: string;
  emptyLabel: string;
}) {
  const filter: Filter = FILTERS.some((f) => f.value === rawFilter)
    ? (rawFilter as Filter)
    : "all";
  const query = rawQuery?.trim().toLowerCase() ?? "";
  const visible = rows
    .filter((r) => matches(r, filter))
    .filter(
      (r) => !query || r.title.toLowerCase().includes(query) || r.slug.includes(query),
    )
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const href = (f: Filter) => {
    const p = new URLSearchParams();
    if (f !== "all") p.set("status", f);
    if (query) p.set("q", query);
    const s = p.toString();
    return s ? `${basePath}?${s}` : basePath;
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10 md:px-10 md:py-12">
      <AdminPageHeader
        title={title}
        description={description}
        actions={
          <Link
            href={newHref}
            className="rounded-card bg-accent text-bg px-4 py-2 font-sans text-sm font-medium transition-opacity hover:opacity-90"
          >
            + {newLabel}
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <nav
          aria-label="Status"
          className="bg-surface border-border flex rounded-full border p-1"
        >
          {FILTERS.map((f) => {
            const count = rows.filter((r) => matches(r, f.value)).length;
            const active = f.value === filter;
            return (
              <Link
                key={f.value}
                href={href(f.value)}
                aria-current={active ? "page" : undefined}
                className={`rounded-full px-3.5 py-1.5 font-sans text-xs transition-colors ${
                  active ? "bg-text text-bg" : "text-text-muted hover:text-text"
                }`}
              >
                {f.label}
                <span className="ml-1.5 font-mono opacity-60">{count}</span>
              </Link>
            );
          })}
        </nav>
        <form action={basePath} method="GET" role="search">
          {filter !== "all" ? <input type="hidden" name="status" value={filter} /> : null}
          <input
            type="search"
            name="q"
            defaultValue={rawQuery ?? ""}
            placeholder="Search titles…"
            aria-label={`Search ${title.toLowerCase()}`}
            className="rounded-card border-border bg-surface text-text focus-visible:border-accent w-64 border px-3.5 py-2 font-sans text-sm outline-none"
          />
        </form>
      </div>

      <div className="rounded-panel border-border bg-surface overflow-hidden border">
        {visible.length === 0 ? (
          <p className="text-text-muted px-6 py-16 text-center font-serif text-sm">
            {rows.length === 0 ? emptyLabel : "Nothing matches these filters."}
          </p>
        ) : (
          <table className="w-full text-left">
            <thead className="border-border text-text-muted border-b font-mono text-[10px] tracking-wider uppercase">
              <tr>
                <th scope="col" className="px-5 py-3 font-normal">
                  Title
                </th>
                <th scope="col" className="hidden px-5 py-3 font-normal md:table-cell">
                  Status
                </th>
                <th scope="col" className="hidden px-5 py-3 font-normal sm:table-cell">
                  Updated
                </th>
                <th scope="col" className="w-10 px-5 py-3">
                  <span className="sr-only">Open</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {visible.map((row) => (
                <tr
                  key={row.id}
                  className="group hover:bg-surface-2 relative transition-colors"
                >
                  <td className="px-5 py-4">
                    <Link
                      href={row.href}
                      className="text-text font-sans text-sm font-medium after:absolute after:inset-0"
                    >
                      {row.title}
                    </Link>
                    <p className="text-text-muted mt-0.5 font-mono text-xs">
                      /{row.slug}
                      {row.meta ? ` · ${row.meta}` : ""}
                    </p>
                  </td>
                  <td className="hidden px-5 py-4 md:table-cell">
                    <div className="flex flex-wrap gap-1.5">
                      {row.archived ? <StatusPill status="ARCHIVED" /> : null}
                      {row.live ? <StatusPill status="PUBLISHED" label="Live" /> : null}
                      {row.draft ? <StatusPill status="DRAFT" label="Draft" /> : null}
                    </div>
                  </td>
                  <td className="text-text-muted hidden px-5 py-4 font-mono text-xs sm:table-cell">
                    {relative(row.updatedAt)}
                  </td>
                  <td className="text-text-muted group-hover:text-accent px-5 py-4 text-right transition-colors">
                    →
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
