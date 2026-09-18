import { notFound } from "next/navigation";

import * as articlesService from "@/server/services/articles";

import {
  archiveArticleForm,
  ensureDraftForm,
  publishArticleForm,
  rollbackArticleForm,
  saveDraftForm,
  unarchiveArticleForm,
  tiptapDocToPlainText,
} from "../actions";

export default async function ArticleEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const state = await articlesService.getArticleFullState(id);
  if (!state) notFound();

  const { article, draft, published, versions } = state;
  const current = draft ?? published;
  if (!current) notFound();

  const contentText = draft ? tiptapDocToPlainText(draft.content) : "";

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-text font-sans text-2xl font-semibold">{current.title}</h1>
          <p className="text-text-muted mt-1 font-mono text-xs">
            /{article.slug} · item status: {article.status}
          </p>
        </div>
        <div className="flex gap-2">
          {published && (
            <span className="rounded-badge border-accent/40 text-accent border px-2 py-0.5 font-mono text-xs">
              PUBLISHED v{published.versionNumber}
            </span>
          )}
          {draft && (
            <span className="rounded-badge border-border text-text-muted border px-2 py-0.5 font-mono text-xs">
              DRAFT v{draft.versionNumber}
            </span>
          )}
        </div>
      </div>

      {!draft && published && (
        <form action={ensureDraftForm} className="mt-6">
          <input type="hidden" name="articleId" value={article.id} />
          <button
            type="submit"
            className="rounded-card border-accent text-accent hover:bg-accent hover:text-bg border px-4 py-2 font-sans text-sm transition-colors"
          >
            Start editing (forks a new draft from the published version)
          </button>
        </form>
      )}

      {draft && (
        <form action={saveDraftForm} className="mt-8 space-y-5">
          <input type="hidden" name="articleId" value={article.id} />
          <div>
            <label className="text-text-muted block font-sans text-sm">Title</label>
            <input
              name="title"
              defaultValue={draft.title}
              required
              className="rounded-card border-border bg-surface text-text focus-visible:border-accent mt-1.5 w-full border px-3.5 py-2.5 font-sans text-sm outline-none"
            />
          </div>

          <div>
            <label className="text-text-muted block font-sans text-sm">Category</label>
            <input
              name="category"
              defaultValue={draft.category ?? ""}
              className="rounded-card border-border bg-surface text-text focus-visible:border-accent mt-1.5 w-full border px-3.5 py-2.5 font-sans text-sm outline-none"
            />
          </div>

          <div>
            <label className="text-text-muted block font-sans text-sm">Excerpt</label>
            <textarea
              name="excerpt"
              defaultValue={draft.excerpt}
              required
              rows={3}
              className="rounded-card border-border bg-surface text-text focus-visible:border-accent mt-1.5 w-full border px-3.5 py-2.5 font-serif text-sm outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-text-muted block font-sans text-sm">Content</label>
              <span className="text-text-muted font-mono text-xs">
                {draft.readingTime ?? 1} min read (computed on save)
              </span>
            </div>
            <textarea
              name="content"
              defaultValue={contentText}
              required
              rows={16}
              className="rounded-card border-border bg-surface text-text focus-visible:border-accent mt-1.5 w-full border px-3.5 py-2.5 font-serif text-sm leading-relaxed outline-none"
            />
            <p className="text-text-muted mt-1 font-mono text-xs">
              Paragraphs separated by a blank line become separate Tiptap paragraph
              nodes.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              className="rounded-card border-border text-text hover:border-accent border px-4 py-2.5 font-sans text-sm transition-colors"
            >
              Save draft
            </button>
          </div>
        </form>
      )}

      {draft && (
        <form action={publishArticleForm} className="mt-4">
          <input type="hidden" name="articleId" value={article.id} />
          <button
            type="submit"
            className="rounded-card bg-accent text-bg px-4 py-2.5 font-sans text-sm font-medium transition-opacity hover:opacity-90"
          >
            Publish this draft
          </button>
        </form>
      )}

      <section className="border-border mt-10 border-t pt-6">
        <h2 className="text-text font-sans text-sm font-medium">Version history</h2>
        <div className="mt-3 space-y-2">
          {versions.map((v) => (
            <div
              key={v.id}
              className="rounded-card border-border bg-surface flex items-center justify-between border px-4 py-2.5"
            >
              <div>
                <span className="text-text-muted font-mono text-xs">
                  v{v.versionNumber} · {v.status}
                </span>
                <span className="text-text ml-2 font-sans text-sm">{v.title}</span>
              </div>
              {v.status === "SUPERSEDED" && !draft && (
                <form action={rollbackArticleForm}>
                  <input type="hidden" name="articleId" value={article.id} />
                  <input type="hidden" name="targetVersionId" value={v.id} />
                  <button
                    type="submit"
                    className="text-accent font-sans text-xs hover:underline"
                  >
                    Restore this version
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="border-border mt-8 border-t pt-6">
        {article.status === "ACTIVE" ? (
          <form action={archiveArticleForm}>
            <input type="hidden" name="articleId" value={article.id} />
            <button
              type="submit"
              className="text-text-muted hover:text-text font-sans text-xs"
            >
              Archive article
            </button>
          </form>
        ) : (
          <form action={unarchiveArticleForm}>
            <input type="hidden" name="articleId" value={article.id} />
            <button
              type="submit"
              className="text-text-muted hover:text-text font-sans text-xs"
            >
              Unarchive article
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
