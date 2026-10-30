import Link from "next/link";

import { AdminPageHeader } from "@/components/admin/page-header";
import { INBOX_STATUSES, type InboxStatus } from "@/server/repositories/contact";
import {
  canReply,
  getSubmission,
  listInbox,
  listReplies,
  listSent,
} from "@/server/services/contact";
import { readOrFallback } from "@/server/services/fallback-read";
import { isEmailConfigured, replySender } from "@/server/services/email";

import { DeleteMessageButton } from "./delete-message-button";
import { ReplyForm } from "./reply-form";

import { setInboxStatusForm } from "./actions";

export const dynamic = "force-dynamic";

type Tab = InboxStatus | "inbox" | "SENT";

const TABS: { value: Tab; label: string }[] = [
  { value: "inbox", label: "Inbox" },
  { value: "NEW", label: "Unread" },
  { value: "SENT", label: "Sent" },
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

type Message = { source: string; subject: string | null; reason: string | null };

/** What a message is about: an email's subject, or the form's reason. */
function topic(m: Message) {
  return m.source === "email" ? m.subject || "(no subject)" : (m.reason ?? "General");
}

/** "Re: <subject>" without stacking "Re: Re:". */
function replySubject(m: Message) {
  const base = m.source === "email" ? m.subject : m.reason;
  if (!base) return "Re: your message";
  return /^re:/i.test(base) ? base : `Re: ${base}`;
}

function EmailTag() {
  return (
    <span className="border-border text-text-muted mr-1.5 rounded-full border px-1.5 py-px font-mono text-[10px] tracking-wide uppercase">
      Email
    </span>
  );
}

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; id?: string; deleted?: string }>;
}) {
  const { view, id, deleted } = await searchParams;
  const status = INBOX_STATUSES.includes(view as InboxStatus)
    ? (view as InboxStatus)
    : null;
  const isSent = view === "SENT";
  const [{ items, counts }, selected, { value: sent }] = await Promise.all([
    listInbox(status),
    id ? getSubmission(id) : null,
    // Degrades to an empty folder if the replies table isn't migrated yet.
    readOrFallback("/admin/inbox", "sent replies", listSent(), {
      items: [],
      total: 0,
    } as Awaited<ReturnType<typeof listSent>>),
  ]);
  // Degrades to an empty thread if the replies table isn't migrated yet.
  const { value: replies } = selected
    ? await readOrFallback(
        "/admin/inbox",
        "replies",
        listReplies(selected.id),
        [] as Awaited<ReturnType<typeof listReplies>>,
      )
    : { value: [] };
  const sender = canReply() ? replySender() : null;
  const unread = counts.NEW ?? 0;
  const tabCount = (v: Tab) =>
    v === "inbox"
      ? (counts.NEW ?? 0) + (counts.READ ?? 0)
      : v === "SENT"
        ? sent.total
        : (counts[v] ?? 0);
  const viewParam = status ? `view=${status}` : isSent ? "view=SENT" : "";
  const hrefFor = (itemId: string) =>
    `/admin/inbox?${[viewParam, `id=${itemId}`].filter(Boolean).join("&")}`;
  const back = `/admin/inbox${viewParam ? `?${viewParam}` : ""}`;

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10 md:px-10 md:py-12">
      <AdminPageHeader
        title="Inbox"
        description={
          unread > 0
            ? `${unread} unread ${unread === 1 ? "message" : "messages"} from your contact form and email.`
            : "Messages from your contact form and email."
        }
      />

      {deleted === "1" ? (
        <p role="status" className="text-text mb-6 font-sans text-sm">
          Message deleted.
        </p>
      ) : null}

      {!isEmailConfigured() ? (
        <p className="border-border bg-surface text-text-muted mb-6 rounded-lg border px-4 py-3 font-sans text-sm">
          <span className="text-text font-medium">Email alerts are off.</span> New
          messages only appear here. Add{" "}
          <code className="font-mono text-xs">RESEND_API_KEY</code> to your environment
          variables to get an email for each one.
        </p>
      ) : !canReply() ? (
        <p className="border-border bg-surface text-text-muted mb-6 rounded-lg border px-4 py-3 font-sans text-sm">
          <span className="text-text font-medium">Replying from here is off.</span> Set{" "}
          <code className="font-mono text-xs">REPLY_FROM_EMAIL</code> to an address on
          your verified Resend domain to answer messages from this page.
        </p>
      ) : null}

      <nav
        aria-label="Folders"
        className="bg-surface border-border mb-6 inline-flex max-w-full overflow-x-auto rounded-full border p-1"
      >
        {TABS.map((t) => {
          const active =
            (t.value === "inbox" && !status && !isSent) ||
            t.value === status ||
            (t.value === "SENT" && isSent);
          return (
            <Link
              key={t.value}
              href={t.value === "inbox" ? "/admin/inbox" : `/admin/inbox?view=${t.value}`}
              aria-current={active ? "page" : undefined}
              className={`shrink-0 rounded-full px-4 py-1.5 font-sans text-xs transition-colors ${
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
          {isSent ? (
            sent.items.length === 0 ? (
              <li className="text-text-muted px-6 py-16 text-center font-serif text-sm">
                No replies sent yet.
              </li>
            ) : (
              sent.items.map((r) => (
                <li key={r.id}>
                  <Link
                    href={hrefFor(r.submissionId)}
                    aria-current={selected?.id === r.submissionId ? "true" : undefined}
                    className={`block px-5 py-4 transition-colors ${
                      selected?.id === r.submissionId
                        ? "bg-surface-2"
                        : "hover:bg-surface-2"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-text truncate font-sans text-sm">
                        <span className="text-text-muted">To:</span> {r.name}
                      </p>
                      <span className="text-text-muted shrink-0 font-mono text-[11px]">
                        {when(r.createdAt)}
                      </span>
                    </div>
                    <p className="text-text-muted mt-0.5 truncate font-sans text-xs">
                      {r.subject}
                    </p>
                    <p className="text-text-muted mt-1.5 line-clamp-2 font-serif text-sm">
                      {r.body}
                    </p>
                  </Link>
                </li>
              ))
            )
          ) : items.length === 0 ? (
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
                    {m.source === "email" ? <EmailTag /> : null}
                    {topic(m)}
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
                    {selected.source === "email" ? <EmailTag /> : null}
                    {topic(selected)} · {when(selected.createdAt)}
                  </p>
                </div>
                {sender ? null : (
                  <a
                    href={`mailto:${selected.email}?subject=${encodeURIComponent(replySubject(selected))}`}
                    className="rounded-card bg-accent text-bg px-4 py-2 font-sans text-sm font-medium transition-opacity hover:opacity-90"
                  >
                    Reply by email
                  </a>
                )}
              </header>
              <p className="text-text mt-6 font-serif text-lg leading-relaxed whitespace-pre-wrap">
                {selected.message}
              </p>
              {replies.length > 0 ? (
                <ol aria-label="Replies" className="mt-8 space-y-4">
                  {replies.map((r) => (
                    <li
                      key={r.id}
                      className="border-accent bg-surface-2 rounded-card border-l-2 px-5 py-4"
                    >
                      <p className="text-text-muted font-mono text-[11px]">
                        You replied · {when(r.createdAt)} · {r.subject}
                      </p>
                      <p className="text-text mt-2 font-serif text-base leading-relaxed whitespace-pre-wrap">
                        {r.body}
                      </p>
                    </li>
                  ))}
                </ol>
              ) : null}
              {sender ? (
                <div className="border-border mt-8 border-t pt-6">
                  <h3 className="text-text mb-3 font-sans text-sm font-semibold">
                    Reply
                  </h3>
                  <ReplyForm
                    key={selected.id}
                    id={selected.id}
                    to={selected.email}
                    from={sender}
                    defaultSubject={replies.at(-1)?.subject ?? replySubject(selected)}
                  />
                </div>
              ) : null}
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
                <DeleteMessageButton
                  key={selected.id}
                  id={selected.id}
                  name={selected.name}
                  view={isSent ? "SENT" : (status ?? "")}
                />
              </div>
            </article>
          ) : (
            <div className="flex h-full min-h-80 items-center justify-center p-8 text-center">
              <p className="text-text-muted font-serif text-sm">
                {id
                  ? "This message is no longer available. Select another message."
                  : (isSent ? sent.items.length : items.length) === 0
                    ? "No messages in this folder."
                    : isSent
                      ? "Select a reply to see the conversation."
                      : "Select a message to read it."}
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
