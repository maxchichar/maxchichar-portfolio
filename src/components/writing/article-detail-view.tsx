import Link from "next/link";
import type { schema } from "@/lib/db";
import { tiptapDocToPlainText } from "@/lib/validation/project";

type ArticleRow = typeof schema.articles.$inferSelect;
type ArticleVersionRow = typeof schema.articleVersions.$inferSelect;
type TagRow = typeof schema.tags.$inferSelect;

interface ArticleDetailViewProps {
  article: ArticleRow;
  published: ArticleVersionRow;
  tags: TagRow[];
  coverUrl: string | null;
}

export function ArticleDetailView({ published, tags, coverUrl }: ArticleDetailViewProps) {
  const paragraphs = tiptapDocToPlainText(published.content)
    .trim()
    .split("\n\n")
    .filter((p) => p.length > 0);

  return (
    <article className="mx-auto max-w-3xl px-6 py-16 md:py-24">
      {/* Eyebrow & Navigation */}
      <div className="mb-8">
        <Link
          href="/writing"
          className="text-text-muted hover:text-accent font-sans text-sm font-medium transition-colors"
        >
          &larr; Back to Writing
        </Link>
      </div>

      {/* Hero Section */}
      <header className="border-border border-b pb-12">
        {published.category ? (
          <span className="rounded-badge border-border text-accent-purple bg-surface border px-2.5 py-1 font-sans text-xs font-medium">
            {published.category}
          </span>
        ) : null}

        <h1 className="text-text mt-4 font-sans text-4xl font-semibold tracking-tight md:text-5xl">
          {published.title}
        </h1>

        <p className="text-text-muted mt-4 font-serif text-lg leading-relaxed md:text-xl">
          {published.excerpt}
        </p>

        <div className="text-text-muted mt-4 flex flex-wrap items-center gap-3 font-mono text-xs">
          <span>
            {published.publishedAt
              ? new Date(published.publishedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })
              : ""}
          </span>
          {published.readingTime ? (
            <>
              <span aria-hidden="true">&middot;</span>
              <span>{published.readingTime} min read</span>
            </>
          ) : null}
          <span aria-hidden="true">&middot;</span>
          <span>v{published.versionNumber}</span>
        </div>

        {/* Cover Image */}
        {coverUrl ? (
          <div className="rounded-panel border-border mt-8 overflow-hidden border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverUrl}
              alt={published.title}
              className="h-auto max-h-[480px] w-full object-cover"
            />
          </div>
        ) : null}

        {/* Tags */}
        {tags.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span key={tag.id} className="text-text-muted font-mono text-xs">
                #{tag.name}
              </span>
            ))}
          </div>
        ) : null}
      </header>

      {/* Content — single Tiptap document rendered as paragraphs, same
          plain-text-extraction approach case-study-view.tsx uses per
          section (schema.ts: "canonical Tiptap JSON document"). */}
      <div className="text-text mt-12 space-y-6 font-serif text-base leading-relaxed md:text-lg">
        {paragraphs.map((p, idx) => (
          <p key={idx}>{p}</p>
        ))}
      </div>
    </article>
  );
}
