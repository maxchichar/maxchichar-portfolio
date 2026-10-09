import Link from "next/link";

import { UnsavedGuard } from "./unsaved-guard";

type Action = (formData: FormData) => Promise<void>;

interface Version {
  id: string;
  versionNumber: number;
  status: string;
  title: string;
  createdAt: Date;
}

const STATUS_STYLES: Record<string, string> = {
  PUBLISHED: "border-accent/40 text-accent",
  DRAFT: "border-text/30 text-text",
  SUPERSEDED: "border-border text-text-muted",
};

export function StatusPill({ status, label }: { status: string; label?: string }) {
  return (
    <span
      className={`rounded-badge inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-[10px] tracking-wider uppercase ${
        STATUS_STYLES[status] ?? "border-border text-text-muted"
      }`}
    >
      {status === "PUBLISHED" ? (
        <span aria-hidden="true" className="bg-accent h-1.5 w-1.5 rounded-full" />
      ) : null}
      {label ?? status}
    </span>
  );
}

/**
 * Sticky right-hand panel for every versioned editor: state, the primary
 * Save/Publish actions, the live link, version history with restore, and
 * archive. Save submits the main draft form via the `form` attribute, so it
 * can live here while the fields stay in the main column.
 */
export function PublishPanel({
  idName,
  id,
  formId,
  itemStatus,
  draft,
  published,
  versions,
  liveHref,
  ensureDraftAction,
  publishAction,
  rollbackAction,
  archiveAction,
  unarchiveAction,
  noun,
}: {
  idName: string;
  id: string;
  formId: string;
  itemStatus: string;
  draft: { versionNumber: number } | null;
  published: { versionNumber: number; publishedAt: Date | null } | null;
  versions: Version[];
  liveHref: string | null;
  ensureDraftAction: Action;
  publishAction: Action;
  rollbackAction: Action;
  archiveAction: Action;
  unarchiveAction: Action;
  noun: string;
}) {
  const hidden = <input type="hidden" name={idName} value={id} />;
  return (
    <div className="space-y-4 lg:sticky lg:top-6">
      <section className="rounded-panel border-border bg-surface border p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-text font-sans text-sm font-semibold">Publishing</h2>
          {itemStatus === "ARCHIVED" ? <StatusPill status="ARCHIVED" /> : null}
        </div>

        <dl className="mt-4 space-y-2.5 font-sans text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-text-muted">Live</dt>
            <dd>
              {published ? (
                <StatusPill status="PUBLISHED" label={`v${published.versionNumber}`} />
              ) : (
                <span className="text-text-muted text-xs">Not published</span>
              )}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-text-muted">Draft</dt>
            <dd>
              {draft ? (
                <StatusPill status="DRAFT" label={`v${draft.versionNumber}`} />
              ) : (
                <span className="text-text-muted text-xs">None</span>
              )}
            </dd>
          </div>
          {published?.publishedAt ? (
            <div className="flex items-center justify-between">
              <dt className="text-text-muted">Published</dt>
              <dd className="text-text font-mono text-xs">
                {new Date(published.publishedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </dd>
            </div>
          ) : null}
        </dl>

        <div className="border-border mt-5 space-y-2 border-t pt-5">
          {draft ? (
            <>
              <UnsavedGuard formId={formId} />
              <button
                type="submit"
                form={formId}
                className="rounded-card border-border text-text hover:border-text/40 mt-3 w-full border px-4 py-2.5 font-sans text-sm font-medium transition-colors"
              >
                Save draft
              </button>
              <form action={publishAction} data-needs-saved>
                {hidden}
                <button
                  type="submit"
                  className="rounded-card bg-accent text-bg w-full px-4 py-2.5 font-sans text-sm font-medium transition-opacity hover:opacity-90"
                >
                  {published ? "Publish changes" : "Publish"}
                </button>
              </form>
            </>
          ) : (
            <form action={ensureDraftAction}>
              {hidden}
              <button
                type="submit"
                className="rounded-card bg-accent text-bg w-full px-4 py-2.5 font-sans text-sm font-medium transition-opacity hover:opacity-90"
              >
                Edit {noun}
              </button>
              <p className="text-text-muted mt-2 font-sans text-xs">
                Creates a new draft from the live version. The live page stays unchanged
                until you publish.
              </p>
            </form>
          )}
          {liveHref && published ? (
            <Link
              href={liveHref}
              target="_blank"
              className="text-text-muted hover:text-text flex items-center justify-center gap-1 pt-1 font-sans text-xs transition-colors"
            >
              View live page ↗
            </Link>
          ) : null}
        </div>
      </section>

      <section className="rounded-panel border-border bg-surface border p-5">
        <h2 className="text-text font-sans text-sm font-semibold">History</h2>
        <ol className="mt-4 space-y-3">
          {versions.map((v) => (
            <li key={v.id} className="flex items-start gap-3">
              <span className="text-text-muted w-7 shrink-0 pt-0.5 font-mono text-xs">
                v{v.versionNumber}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-text truncate font-sans text-xs">{v.title}</p>
                <div className="mt-1 flex items-center gap-2">
                  <StatusPill status={v.status} />
                  {v.status === "SUPERSEDED" && !draft ? (
                    <form action={rollbackAction}>
                      {hidden}
                      <input type="hidden" name="targetVersionId" value={v.id} />
                      <button
                        type="submit"
                        className="text-accent font-sans text-xs hover:underline"
                      >
                        Restore
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <form action={itemStatus === "ACTIVE" ? archiveAction : unarchiveAction}>
        {hidden}
        <button
          type="submit"
          className="text-text-muted hover:text-text w-full py-2 font-sans text-xs transition-colors"
        >
          {itemStatus === "ACTIVE" ? `Archive ${noun}` : `Unarchive ${noun}`}
        </button>
      </form>
    </div>
  );
}
