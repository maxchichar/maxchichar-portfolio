import Link from "next/link";

import { AdminPageHeader } from "@/components/admin/page-header";
import { INBOX_STATUSES, type InboxStatus } from "@/server/repositories/contact";
import { getSubmission, listInbox } from "@/server/services/contact";

import { setInboxStatusForm } from "./actions";

export const dynamic = "force-dynamic";

const TABS: { value: InboxStatus | "inbox"; label: string }[] = [
  { value: "inbox", label: "Inbox" },
  { value: "NEW", label: "Unread" },
  { value: "ARCHIVED", label: "Archived" },
  { value: "SPAM", label: "Spam" },
];

function when(date: Date) {
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; id?: string }>;
}) {
  const { view, id } = await searchParams;
  const status = INBOX_STATUSES.includes(view as InboxStatus)
    ? (view as InboxStatus)
    : null;
  const [{ items, counts }, selected] = await Promise.all([
    listInbox(status),
    id ? getSubmission(id) : null,
  ]);
  const unread = counts.NEW ?? 0;
  const tabCount = (v: InboxStatus | "inbox") =>
    v === "inbox" ? (counts.NEW ?? 0) + (counts.READ ?? 0) : (counts[v] ?? 0);
  const viewParam = status ? `view=${status}` : "";
  const hrefFor = (itemId: string) =>
    `/admin/inbox?${[viewParam, `id=${itemId}`].filter(Boolean).join("&")}`;
  const back = `/admin/inbox${viewParam ? `?${viewParam}` : ""}`;

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10 md:px-10 md:py-12">
      <AdminPageHeader
        title="Inbox"
        description={
          unread > 0
            ? `${unread} unread ${unread === 1 ? "message" : "messages"} from your contact form.`
            : "Messages from your contact form."
        }
      />

      <nav
        aria-label="Folders"
        className="bg-surface border-border mb-6 inline-flex rounded-full border p-1"
      >
        {TABS.map((t) => {
          const active = (t.value === "inbox" && !status) || t.value === status;
          return (
            <Link
              key={t.value}
              href={t.value === "inbox" ? "/admin/inbox" : `/admin/inbox?view=${t.value}`}
              aria-current={active ? "page" : undefined}
              className={`rounded-full px-4 py-1.5 font-sans text-xs transition-colors ${
                active ? "bg-text text-bg" : "text-text-muted hover:text-text"
              }`}
            >
              {t.label}
              <span className="ml-1.5 font-mono opacity-60">{tabCount(t.value)}</span>
            </Link>
          );
        })}
      </nav>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <ul className="rounded-panel border-border bg-surface divide-border max-h-[70vh] divide-y overflow-y-auto border">
          {items.length === 0 ? (
            <li className="text-text-muted px-6 py-16 text-center font-serif text-sm">
              Nothing here.
            </li>
          ) : (
            items.map((m) => (
              <li key={m.id}>
                <Link
                  href={hrefFor(m.id)}
                  aria-current={selected?.id === m.id ? "true" : undefined}
                  className={`block px-5 py-4 transition-colors ${
                    selected?.id === m.id ? "bg-surface-2" : "hover:bg-surface-2"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p
                      className={`truncate font-sans text-sm ${
                        m.status === "NEW" ? "text-text font-semibold" : "text-text"
                      }`}
                    >
                      {m.status === "NEW" ? (
                        <span
                          aria-label="Unread"
                          className="bg-accent mr-2 inline-block h-1.5 w-1.5 rounded-full align-middle"
                        />
                      ) : null}
                      {m.name}
                    </p>
                    <span className="text-text-muted shrink-0 font-mono text-[11px]">
                      {when(m.createdAt)}
                    </span>
                  </div>
                  <p className="text-text-muted mt-0.5 truncate font-sans text-xs">
                    {m.reason ?? "General"}
                    {m.organization ? ` · ${m.organization}` : ""}
                  </p>
                  <p className="text-text-muted mt-1.5 line-clamp-2 font-serif text-sm">
                    {m.message}
                  </p>
                </Link>
              </li>
            ))
          )}
        </ul>

        <section
          aria-label="Message"
          className="rounded-panel border-border bg-surface min-h-80 border"
        >
          {selected ? (
            <article className="p-6 md:p-8">
              <header className="border-border flex flex-wrap items-start justify-between gap-4 border-b pb-5">
                <div>
                  <h2 className="text-text font-sans text-xl font-semibold">
                    {selected.name}
                  </h2>
                  <p className="text-text-muted mt-1 font-mono text-xs">
                    {selected.email}
                    {selected.organization ? ` · ${selected.organization}` : ""}
                  </p>
                  <p className="text-text-muted mt-1 font-mono text-xs">
                    {selected.reason ?? "General"} · {when(selected.createdAt)}
                  </p>
                </div>
                <a
                  href={`mailto:${selected.email}?subject=${encodeURIComponent("Re: your message")}`}
                  className="rounded-card bg-accent text-bg px-4 py-2 font-sans text-sm font-medium transition-opacity hover:opacity-90"
                >
                  Reply by email
                </a>
              </header>
              <p className="text-text mt-6 font-serif text-lg leading-relaxed whitespace-pre-wrap">
                {selected.message}
              </p>
              <div className="border-border mt-8 flex flex-wrap gap-2 border-t pt-5">
                {(
                  [
                    selected.status === "NEW" ? ["READ", "Mark as read"] : null,
                    selected.status === "READ" ? ["NEW", "Mark as unread"] : null,
                    selected.status !== "ARCHIVED" ? ["ARCHIVED", "Archive"] : null,
                    selected.status !== "SPAM" ? ["SPAM", "Mark as spam"] : null,
                    selected.status === "ARCHIVED" || selected.status === "SPAM"
                      ? ["READ", "Move to inbox"]
                      : null,
                  ].filter(Boolean) as [InboxStatus, string][]
                ).map(([next, label]) => (
                  <form key={label} action={setInboxStatusForm}>
                    <input type="hidden" name="id" value={selected.id} />
                    <input type="hidden" name="status" value={next} />
                    <input
                      type="hidden"
                      name="back"
                      value={
                        next === "ARCHIVED" || next === "SPAM"
                          ? back
                          : hrefFor(selected.id)
                      }
                    />
                    <button
                      type="submit"
                      className="rounded-card border-border text-text hover:border-text/40 border px-3.5 py-2 font-sans text-xs transition-colors"
                    >
                      {label}
                    </button>
                  </form>
                ))}
              </div>
            </article>
          ) : (
            <div className="flex h-full min-h-80 items-center justify-center p-8 text-center">
              <p className="text-text-muted font-serif text-sm">
                Select a message to read it.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
