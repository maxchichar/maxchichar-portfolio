import Link from "next/link";

import { AdminPageHeader } from "@/components/admin/page-header";
import { isEmailConfigured } from "@/server/services/email";
import { listErrors } from "@/server/services/errors";

import { deleteErrorForm, resolveErrorForm } from "./actions";

export const dynamic = "force-dynamic";

function ago(date: Date) {
  const mins = Math.round((Date.now() - new Date(date).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function ErrorsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const [{ view }, { available, items }] = await Promise.all([
    searchParams,
    listErrors(),
  ]);
  const showResolved = view === "resolved";
  const open = items.filter((e) => !e.resolvedAt);
  const resolved = items.filter((e) => e.resolvedAt);
  const shown = showResolved ? resolved : open;

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10 md:px-10 md:py-12">
      <AdminPageHeader
        title="Errors"
        description="Problems on the live site, grouped so repeats count up instead of piling up. New ones are emailed to you."
      />

      {!available ? (
        <p className="border-border bg-surface text-text mb-6 rounded-lg border px-4 py-3 font-sans text-sm">
          Error tracking needs a one-time database update. Run{" "}
          <code className="font-mono text-xs">npm run db:push</code>. Until then, errors
          are still emailed to you but not listed here.
        </p>
      ) : null}
      {!isEmailConfigured() ? (
        <p className="border-border bg-surface text-text-muted mb-6 rounded-lg border px-4 py-3 font-sans text-sm">
          <span className="text-text font-medium">Email alerts are off.</span> Add{" "}
          <code className="font-mono text-xs">RESEND_API_KEY</code> to get an email when
          something breaks.
        </p>
      ) : null}

      <nav
        aria-label="Filter"
        className="bg-surface border-border mb-6 inline-flex rounded-full border p-1"
      >
        {[
          { label: "Open", href: "/admin/errors", n: open.length, active: !showResolved },
          {
            label: "Resolved",
            href: "/admin/errors?view=resolved",
            n: resolved.length,
            active: showResolved,
          },
        ].map((t) => (
          <Link
            key={t.label}
            href={t.href}
            aria-current={t.active ? "page" : undefined}
            className={`rounded-full px-4 py-1.5 font-sans text-sm transition-colors ${
              t.active ? "bg-text text-bg" : "text-text-muted hover:text-text"
            }`}
          >
            {t.label} <span className="font-mono text-xs opacity-70">{t.n}</span>
          </Link>
        ))}
      </nav>

      {available && shown.length === 0 ? (
        <div className="rounded-panel border-border border border-dashed p-12 text-center">
          <p className="text-text font-sans text-sm font-medium">
            {showResolved ? "Nothing resolved yet." : "No open errors. All quiet."}
          </p>
        </div>
      ) : null}

      <ul className="space-y-3">
        {shown.map((e) => (
          <li key={e.id} className="rounded-panel border-border bg-surface border">
            <details>
              <summary className="flex cursor-pointer list-none flex-wrap items-start gap-x-6 gap-y-2 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <p className="text-text font-mono text-sm break-words">{e.message}</p>
                  <p className="text-text-muted mt-1.5 font-sans text-xs">
                    {e.method ? `${e.method} ` : ""}
                    {e.lastPath ?? e.route ?? "unknown page"}
                    {" · "}
                    {e.source === "server" ? "Server" : "Browser"}
                  </p>
                </div>
                <div className="text-text-muted flex items-center gap-4 font-mono text-[11px]">
                  <span className="border-border text-text rounded-full border px-2 py-0.5">
                    ×{e.count}
                  </span>
                  <span title={new Date(e.lastSeen).toUTCString()}>
                    last {ago(e.lastSeen)}
                  </span>
                  <span title={new Date(e.firstSeen).toUTCString()}>
                    first {ago(e.firstSeen)}
                  </span>
                </div>
              </summary>
              <div className="border-border space-y-4 border-t px-5 py-4">
                <dl className="grid gap-x-8 gap-y-2 font-sans text-xs sm:grid-cols-2">
                  {e.route ? (
                    <div>
                      <dt className="text-text-muted">Route</dt>
                      <dd className="text-text font-mono">{e.route}</dd>
                    </div>
                  ) : null}
                  {e.digest ? (
                    <div>
                      <dt className="text-text-muted">Reference</dt>
                      <dd className="text-text font-mono">{e.digest}</dd>
                    </div>
                  ) : null}
                </dl>
                {e.stack ? (
                  <pre className="bg-bg border-border text-text-muted max-h-72 overflow-auto rounded-lg border p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
                    {e.stack}
                  </pre>
                ) : null}
                <div className="flex items-center gap-3">
                  <form action={resolveErrorForm}>
                    <input type="hidden" name="id" value={e.id} />
                    <input
                      type="hidden"
                      name="resolved"
                      value={e.resolvedAt ? "false" : "true"}
                    />
                    <button
                      type="submit"
                      className="rounded-card bg-accent text-bg px-3 py-1.5 font-sans text-xs font-medium transition-opacity hover:opacity-90"
                    >
                      {e.resolvedAt ? "Reopen" : "Mark resolved"}
                    </button>
                  </form>
                  <form action={deleteErrorForm}>
                    <input type="hidden" name="id" value={e.id} />
                    <button
                      type="submit"
                      className="text-text-muted hover:text-text px-2 py-1.5 font-sans text-xs"
                    >
                      Delete
                    </button>
                  </form>
                  {!e.resolvedAt ? (
                    <p className="text-text-muted font-sans text-xs">
                      Resolved errors that happen again reopen and alert you.
                    </p>
                  ) : null}
                </div>
              </div>
            </details>
          </li>
        ))}
      </ul>
    </main>
  );
}
