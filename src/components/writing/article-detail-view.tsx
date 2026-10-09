import Link from "next/link";

import { DetailHero } from "@/components/detail/detail-hero";
import { NextUp } from "@/components/detail/next-up";
import { Toc } from "@/components/detail/toc";
import { RichText } from "@/components/rich-text";
import type { schema } from "@/lib/db";
import { collectHeadings } from "@/lib/rich-text";

type ArticleRow = typeof schema.articles.$inferSelect;
type ArticleVersionRow = typeof schema.articleVersions.$inferSelect;
type TagRow = typeof schema.tags.$inferSelect;

interface NextArticle {
  slug: string;
  title: string;
  body: string;
  coverUrl: string | null;
}

export function ArticleDetailView({
  article,
  published,
  tags,
  coverUrl,
  next,
  author,
}: {
  article: ArticleRow;
  published: ArticleVersionRow;
  tags: TagRow[];
  coverUrl: string | null;
  next: NextArticle | null;
  author: { name: string; description: string | null };
}) {
  // Only top-level sections (h2) go in the contents list; it's shown once an
  // article is long enough to need one.
  const headings = collectHeadings(published.content).filter((h) => h.level === 2);
  const showToc = headings.length >= 3;

  return (
    <article>
      {/* Reading progress (scroll-driven CSS; hidden where unsupported). */}
      <div aria-hidden="true" className="scroll-progress" />

      <DetailHero
        centered
        backHref="/writing"
        backLabel="All writing"
        eyebrow={[published.category ?? "Essay"]}
        title={published.title}
        lede={published.excerpt}
        facts={[
          {
            label: "Published",
            value: published.publishedAt
              ? new Date(published.publishedAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })
              : null,
          },
          {
            label: "Reading time",
            value: published.readingTime ? `${published.readingTime} min` : null,
          },
          { label: "Author", value: author.name },
        ]}
        coverUrl={coverUrl}
        coverAlt={published.title}
        coverTransitionName={`cover-writing-${article.slug}`}
      />

      <div
        className={`container-site mt-16 md:mt-24 ${
          showToc ? "grid gap-12 lg:grid-cols-12" : ""
        }`}
      >
        {showToc ? (
          <aside className="lg:col-span-3">
            <Toc items={headings.map((h) => ({ id: h.id, label: h.text }))} />
          </aside>
        ) : null}

        <div
          className={showToc ? "lg:col-span-8 lg:col-start-5" : "mx-auto max-w-[68ch]"}
        >
          <RichText doc={published.content} />

          <footer className="border-border mt-20 border-t pt-10">
            {tags.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <li
                    key={tag.id}
                    className="border-border text-text-muted rounded-full border px-3 py-1 font-mono text-xs"
                  >
                    #{tag.name}
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="rounded-panel bg-surface mt-10 flex flex-col gap-6 p-7 sm:flex-row sm:items-center sm:justify-between md:p-8">
              <div className="flex items-center gap-4">
                <span
                  aria-hidden="true"
                  className="bg-accent-purple text-bg flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-sans text-base font-bold"
                >
                  {author.name.slice(0, 1)}
                </span>
                <div>
                  <p className="text-text font-sans text-sm font-semibold">
                    Written by {author.name}
                  </p>
                  {author.description ? (
                    <p className="text-text-muted mt-0.5 font-serif text-sm">
                      {author.description}
                    </p>
                  ) : null}
                </div>
              </div>
              <Link
                href="/contact"
                className="bg-text text-bg hover:bg-accent shrink-0 rounded-full px-5 py-2.5 text-center font-sans text-sm font-medium transition-colors"
              >
                Discuss this →
              </Link>
            </div>
          </footer>
        </div>
      </div>

      {next ? (
        <NextUp
          label="Keep reading"
          title={next.title}
          body={next.body}
          href={`/writing/${next.slug}`}
          coverUrl={next.coverUrl}
        />
      ) : null}
    </article>
  );
}
