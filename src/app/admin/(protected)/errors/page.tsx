import { ConfirmForm } from "@/components/admin/confirm-form";
import Link from "next/link";

import { AdminPageHeader } from "@/components/admin/page-header";
import { isEmailConfigured } from "@/server/services/email";
import { listErrors } from "@/server/services/errors";

import { deleteErrorForm, resolveErrorForm } from "./actions";
import { CopyErrorButton } from "./copy-error-button";

export const dynamic = "force-dynamic";

function ago(date: Date) {
  const mins = Math.round((Date.now() - new Date(date).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

type ErrorItem = Awaited<ReturnType<typeof listErrors>>["items"][number];

/** Everything known about an error as plain text, for pasting elsewhere. */
function errorReport(e: ErrorItem) {
  const iso = (date: Date) => new Date(date).toISOString();
  return [
    `Error: ${e.message}`,
    `Source: ${e.source === "server" ? "Server" : "Browser"}`,
    `Page: ${e.method ? `${e.method} ` : ""}${e.lastPath ?? e.route ?? "unknown"}`,
    e.route && e.route !== e.lastPath ? `Route: ${e.route}` : null,
    `Occurrences: ${e.count} (first ${iso(e.firstSeen)}, last ${iso(e.lastSeen)})`,
    e.digest ? `Reference: ${e.digest}` : null,
    `Status: ${e.resolvedAt ? `Resolved ${iso(e.resolvedAt)}` : "Open"}`,
    e.stack ? `\nStack:\n${e.stack}` : null,
  ]
    .filter((line) => line !== null)
    .join("\n");
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
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10 md:px-10 md:py-12">
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
        className="bg-surface border-border mb-6 flex w-full rounded-full border p-1 sm:inline-flex sm:w-auto"
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
            className={`flex-1 rounded-full px-4 py-1.5 text-center font-sans text-sm transition-colors sm:flex-none ${
              t.active ? "bg-text text-bg" : "text-text-muted hover:text-text"
            }`}
          >
            {t.label} <span className="font-mono text-xs opacity-70">{t.n}</span>
          </Link>
        ))}
      </nav>

      {available && shown.length === 0 ? (
        <div className="rounded-panel border-border border border-dashed px-6 py-12 text-center">
          <p className="text-text font-sans text-sm font-medium">
            {showResolved ? "Nothing resolved yet." : "No open errors. All quiet."}
          </p>
        </div>
      ) : null}

      <ul className="space-y-3">
        {shown.map((e) => (
          <li
            key={e.id}
            className="rounded-panel border-border bg-surface overflow-hidden border"
          >
            <details className="group">
              <summary className="hover:bg-surface-2 flex cursor-pointer list-none gap-3 px-4 py-4 transition-colors sm:px-5 [&::-webkit-details-marker]:hidden">
                <div className="min-w-0 flex-1">
                  <div className="text-text-muted flex flex-wrap items-center gap-x-2 gap-y-1.5 font-mono text-[11px]">
                    <span
                      className={`rounded-full border px-2 py-0.5 tracking-wide uppercase ${
                        e.source === "server"
                          ? "border-accent/40 text-accent"
                          : "border-border text-text"
                      }`}
                    >
                      {e.source === "server" ? "Server" : "Browser"}
                    </span>
                    <span className="bg-text text-bg rounded-full px-2 py-0.5 tabular-nums">
                      ×{e.count}
                    </span>
                    <span title={new Date(e.lastSeen).toUTCString()}>
                      {ago(e.lastSeen)}
                    </span>
                  </div>
                  <p className="text-text mt-2.5 line-clamp-3 font-mono text-[13px] leading-snug [overflow-wrap:anywhere] group-open:line-clamp-none">
                    {e.message}
                  </p>
                  <p className="text-text-muted mt-1.5 truncate font-mono text-[11px]">
                    {e.method ? `${e.method} ` : ""}
                    {e.lastPath ?? e.route ?? "unknown page"}
                  </p>
                </div>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-text-muted mt-0.5 h-4 w-4 shrink-0 transition-transform group-open:rotate-180"
                >
                  <path d="M5 8l5 5 5-5" />
                </svg>
              </summary>
              <div className="border-border space-y-4 border-t px-4 py-4 sm:px-5">
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 font-sans text-xs">
                  <div>
                    <dt className="text-text-muted">First seen</dt>
                    <dd className="text-text font-mono">
                      {new Date(e.firstSeen).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-text-muted">Last seen</dt>
                    <dd className="text-text font-mono">
                      {new Date(e.lastSeen).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </dd>
                  </div>
                  {e.route ? (
                    <div className="col-span-2 min-w-0">
                      <dt className="text-text-muted">Route</dt>
                      <dd className="text-text font-mono [overflow-wrap:anywhere]">
                        {e.route}
                      </dd>
                    </div>
                  ) : null}
                  {e.digest ? (
                    <div className="col-span-2 min-w-0">
                      <dt className="text-text-muted">Reference</dt>
                      <dd className="text-text font-mono [overflow-wrap:anywhere]">
                        {e.digest}
                      </dd>
                    </div>
                  ) : null}
                </dl>
                {e.stack ? (
                  <pre className="bg-bg border-border text-text-muted max-h-72 overflow-auto rounded-lg border p-3 font-mono text-[11px] leading-relaxed [overflow-wrap:anywhere] whitespace-pre-wrap">
                    {e.stack}
                  </pre>
                ) : null}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <form action={resolveErrorForm} className="sm:contents">
                    <input type="hidden" name="id" value={e.id} />
                    <input
                      type="hidden"
                      name="resolved"
                      value={e.resolvedAt ? "false" : "true"}
                    />
                    <button
                      type="submit"
                      className="rounded-card bg-accent text-bg w-full px-4 py-2.5 font-sans text-sm font-medium transition-opacity hover:opacity-90 sm:w-auto sm:px-3 sm:py-1.5 sm:text-xs"
                    >
                      {e.resolvedAt ? "Reopen" : "Mark resolved"}
                    </button>
                  </form>
                  <CopyErrorButton report={errorReport(e)} />
                  <ConfirmForm
                    action={deleteErrorForm}
                    title="Delete error log?"
                    description="Permanently delete this error log and its recorded details? This cannot be undone."
                    label="Delete"
                    confirmLabel="Delete error log"
                    buttonClassName="rounded-card border-border text-text hover:border-text/40 w-full border px-4 py-2.5 font-sans text-sm transition-colors disabled:opacity-50 sm:w-auto sm:px-3.5 sm:py-1.5 sm:text-xs"
                  >
                    <input type="hidden" name="id" value={e.id} />
                  </ConfirmForm>
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
