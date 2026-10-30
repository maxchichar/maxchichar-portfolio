import Link from "next/link";

import { AdminPageHeader } from "@/components/admin/page-header";
import { INBOX_STATUSES, type InboxStatus } from "@/server/repositories/contact";
import { cleanEmailHtml } from "@/lib/email-html";
import {
  canReply,
  getEmailHtml,
  getSubmission,
  listInbox,
  listReplies,
  listSent,
} from "@/server/services/contact";
import { readOrFallback } from "@/server/services/fallback-read";
import { isEmailConfigured, replySender } from "@/server/services/email";

import { DeleteMessageButton } from "./delete-message-button";
import { EmailContent } from "./email-content";
import { Avatar, EmailBody } from "./email-view";
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

/** A one-line glimpse of a message: no links, padding or invisible characters. */
function preview(text: string) {
  return text
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[\u034f\u200b-\u200f\u2060\ufeff]/g, "")
    .replace(/\s+/g, " ")
    .trim();
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
  // The designed version of an email, when it was kept (null if the table
  // isn't migrated yet: the text view still works).
  const { value: rawHtml } =
    selected?.source === "email"
      ? await readOrFallback(
          "/admin/inbox",
          "email HTML",
          getEmailHtml(selected.id),
          null as string | null,
        )
      : { value: null };
  const emailHtml = rawHtml ? cleanEmailHtml(rawHtml) : null;
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
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10 md:px-10 md:py-12">
      {/* On phones an open message gets the whole screen. */}
      <div className={selected ? "hidden lg:block" : undefined}>
        <AdminPageHeader
          title="Inbox"
          description={
            unread > 0
              ? `${unread} unread ${unread === 1 ? "message" : "messages"} from your contact form and email.`
              : "Messages from your contact form and email."
          }
        />
      </div>

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
        className={`bg-surface border-border mb-6 max-w-full [scrollbar-width:none] overflow-x-auto rounded-full border p-1 [&::-webkit-scrollbar]:hidden ${
          selected ? "hidden lg:inline-flex" : "flex lg:inline-flex"
        }`}
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
              className={`shrink-0 rounded-full px-4 py-2 font-sans text-xs whitespace-nowrap transition-colors lg:py-1.5 ${
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
        <ul
          className={`rounded-panel border-border bg-surface divide-border divide-y overflow-hidden border lg:max-h-[70vh] lg:overflow-y-auto ${
            selected || id ? "hidden lg:block" : ""
          }`}
        >
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
                    className={`block px-4 py-4 transition-colors sm:px-5 ${
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
                  className={`flex gap-3 px-4 py-4 transition-colors sm:px-5 ${
                    selected?.id === m.id ? "bg-surface-2" : "hover:bg-surface-2"
                  }`}
                >
                  <Avatar name={m.name} size="sm" />
                  <div className="min-w-0 flex-1">
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
                    <p className="text-text-muted mt-1.5 line-clamp-2 font-sans text-[13px] leading-5 [overflow-wrap:anywhere]">
                      {preview(m.message)}
                    </p>
                  </div>
                </Link>
              </li>
            ))
          )}
        </ul>

        <section
          aria-label="Message"
          className={`rounded-panel border-border bg-surface min-w-0 border lg:min-h-80 ${
            selected || id ? "" : "hidden lg:block"
          }`}
        >
          {selected ? (
            <article className="p-4 sm:p-6 md:p-8">
              <Link
                href={back}
                className="text-text-muted hover:text-text -mt-1 mb-4 inline-flex items-center gap-1.5 py-1 font-sans text-sm transition-colors lg:hidden"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <path d="M12 15l-5-5 5-5" />
                </svg>
                Back to{" "}
                {isSent
                  ? "Sent"
                  : (TABS.find((t) => t.value === status)?.label ?? "Inbox")}
              </Link>
              <header className="border-border border-b pb-5">
                <p className="text-text-muted flex flex-wrap items-center gap-2 font-mono text-[10px] tracking-wider uppercase">
                  <span className="border-border rounded-full border px-2 py-0.5">
                    {selected.source === "email" ? "Email" : "Contact form"}
                  </span>
                  {selected.status === "NEW" ? (
                    <span className="text-accent border-accent/40 rounded-full border px-2 py-0.5">
                      Unread
                    </span>
                  ) : null}
                </p>
                <h2 className="text-text mt-3 font-sans text-xl leading-snug font-semibold tracking-tight text-balance [overflow-wrap:anywhere] sm:text-2xl">
                  {topic(selected)}
                </h2>
                <div className="mt-5 flex items-start gap-3">
                  <Avatar name={selected.name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                      <p className="text-text min-w-0 font-sans text-sm font-semibold [overflow-wrap:anywhere]">
                        {selected.name}
                      </p>
                      <time
                        dateTime={new Date(selected.createdAt).toISOString()}
                        className="text-text-muted shrink-0 font-sans text-xs"
                      >
                        {when(selected.createdAt)}
                      </time>
                    </div>
                    <p className="text-text-muted mt-0.5 truncate font-sans text-xs">
                      <a
                        href={`mailto:${selected.email}`}
                        className="hover:text-text transition-colors"
                      >
                        {selected.email}
                      </a>
                      {selected.organization ? ` · ${selected.organization}` : ""}
                    </p>
                  </div>
                </div>
                {sender ? null : (
                  <a
                    href={`mailto:${selected.email}?subject=${encodeURIComponent(replySubject(selected))}`}
                    className="rounded-card bg-accent text-bg mt-5 block px-4 py-2.5 text-center font-sans text-sm font-medium transition-opacity hover:opacity-90 sm:inline-block sm:py-2"
                  >
                    Reply by email
                  </a>
                )}
              </header>
              <div className="mt-6">
                {emailHtml ? (
                  <EmailContent
                    key={selected.id}
                    html={emailHtml.html}
                    remoteImages={emailHtml.remoteImages}
                  >
                    <EmailBody text={selected.message} source={selected.source} />
                  </EmailContent>
                ) : (
                  <EmailBody text={selected.message} source={selected.source} />
                )}
              </div>
              {replies.length > 0 ? (
                <ol aria-label="Replies" className="mt-8 space-y-4">
                  {replies.map((r) => (
                    <li
                      key={r.id}
                      className="border-accent bg-surface-2 rounded-card border-l-2 px-4 py-4 sm:px-5"
                    >
                      <p className="text-text-muted font-mono text-[11px]">
                        You replied · {when(r.createdAt)} · {r.subject}
                      </p>
                      <p className="text-text mt-2 font-serif text-base leading-relaxed [overflow-wrap:anywhere] whitespace-pre-wrap">
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
              <div className="border-border mt-8 grid grid-cols-2 gap-2 border-t pt-5 sm:flex sm:flex-wrap">
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
                  <form key={label} action={setInboxStatusForm} className="contents">
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
                      className="rounded-card border-border text-text hover:border-text/40 border px-3.5 py-2.5 font-sans text-xs transition-colors sm:py-2"
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
            <div className="flex h-full min-h-60 flex-col items-center justify-center gap-4 p-8 text-center lg:min-h-80">
              <p className="text-text-muted font-serif text-sm">
                {id
                  ? "This message is no longer available. Select another message."
                  : (isSent ? sent.items.length : items.length) === 0
                    ? "No messages in this folder."
                    : isSent
                      ? "Select a reply to see the conversation."
                      : "Select a message to read it."}
              </p>
              {id ? (
                <Link
                  href={back}
                  className="text-text hover:text-accent font-sans text-sm underline underline-offset-4 lg:hidden"
                >
                  Back to messages
                </Link>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
