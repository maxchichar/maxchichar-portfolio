import type { Metadata } from "next";
import Link from "next/link";

import { Footer } from "@/components/layout/footer";
import { Nav } from "@/components/layout/nav";
import { listPublicArticlesOverview } from "@/server/services/articles";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Writing — Portfolio OS",
  description:
    "AI-Native Engineer & Entrepreneur — Essays and notes on building intelligent systems.",
};

export default async function WritingListingPage() {
  const items = await listPublicArticlesOverview();

  return (
    <>
      <Nav />

      <main className="mx-auto max-w-5xl px-6 py-16 md:py-24">
        {/* Page Eyebrow & Title */}
        <section className="mb-16">
          <p className="text-accent-purple font-sans text-sm font-medium tracking-wide">
            Writing
          </p>
          <h1 className="text-text mt-2 font-sans text-3xl font-semibold tracking-tight md:text-4xl">
            Essays and notes on building intelligent systems.
          </h1>
        </section>

        {/* Articles Grid or Locked Empty State */}
        {items.length > 0 ? (
          <div className="grid gap-8 md:grid-cols-2">
            {items.map(({ article, published, tags, coverUrl }) => (
              <article
                key={article.id}
                className="rounded-panel border-border bg-surface hover:border-border/80 flex flex-col justify-between overflow-hidden border transition-colors"
              >
                <div>
                  {coverUrl ? (
                    <div className="border-border bg-bg/50 aspect-video w-full overflow-hidden border-b">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={coverUrl}
                        alt={published.title}
                        className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                      />
                    </div>
                  ) : null}

                  <div className="p-6">
                    <div className="flex flex-wrap items-center gap-2">
                      {published.category ? (
                        <span className="rounded-badge border-border text-text-muted bg-bg/50 border px-2 py-0.5 font-mono text-xs">
                          {published.category}
                        </span>
                      ) : null}
                      {published.readingTime ? (
                        <span className="text-text-muted font-mono text-xs">
                          {published.readingTime} min read
                        </span>
                      ) : null}
                    </div>

                    <h2 className="text-text mt-3 font-sans text-xl font-semibold tracking-tight">
                      <Link
                        href={`/writing/${article.slug}`}
                        className="hover:text-accent transition-colors"
                      >
                        {published.title}
                      </Link>
                    </h2>

                    <p className="text-text-muted mt-3 line-clamp-3 font-serif text-sm leading-relaxed">
                      {published.excerpt}
                    </p>
                  </div>
                </div>

                <div className="border-border flex flex-wrap items-center justify-between gap-4 border-t p-6">
                  {tags.length === 0 ? (
                    <div />
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag.id}
                          className="rounded-badge border-border text-text-muted bg-bg/50 border px-2 py-0.5 font-mono text-xs"
                        >
                          {tag.name}
                        </span>
                      ))}
                      {tags.length > 3 ? (
                        <span className="text-text-muted self-center font-mono text-xs">
                          +{tags.length - 3}
                        </span>
                      ) : null}
                    </div>
                  )}

                  <Link
                    href={`/writing/${article.slug}`}
                    className="text-accent font-sans text-xs font-medium hover:underline"
                  >
                    Read &rarr;
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-panel border-border bg-surface border p-8">
            <h2 className="text-text font-sans text-base font-semibold">Writing</h2>
            <p className="text-text-muted mt-2 font-serif text-sm">
              Writing is being documented.
            </p>
          </div>
        )}
      </main>

      <Footer />
    </>
  );
}
