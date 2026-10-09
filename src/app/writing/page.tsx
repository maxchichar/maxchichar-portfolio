import type { Metadata } from "next";
import Link from "next/link";
import { ViewTransition } from "react";

import { Footer } from "@/components/layout/footer";
import { Nav } from "@/components/layout/nav";
import { countBy, FilterChips, firstParam } from "@/components/layout/filter-chips";
import { PageIntro } from "@/components/layout/page-intro";
import { constructPageMetadata } from "@/lib/metadata";
import { listPublicArticlesOverview } from "@/server/services/articles";
import { PageTransition } from "@/components/motion/page-transition";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = constructPageMetadata({
  title: "Writing",
  description:
    "Super Intelligence Engineer & Entrepreneur. Essays and notes on building intelligent systems.",
  path: "/writing",
});

function formatDate(d: Date | null, opts: Intl.DateTimeFormatOptions) {
  return d ? new Date(d).toLocaleDateString("en-US", opts) : "";
}

export default async function WritingListingPage({
  searchParams,
}: PageProps<"/writing">) {
  const [items, params] = await Promise.all([listPublicArticlesOverview(), searchParams]);
  const sorted = [...items].sort(
    (a, b) =>
      (b.published.publishedAt ? new Date(b.published.publishedAt).getTime() : 0) -
      (a.published.publishedAt ? new Date(a.published.publishedAt).getTime() : 0),
  );
  const categories = countBy(sorted, (i) => i.published.category);
  const requested = firstParam(params.category);
  const active = categories.some((c) => c.value === requested) ? requested : null;
  const visible = active ? sorted.filter((i) => i.published.category === active) : sorted;

  // The newest piece is featured, unless a filter narrows the list.
  const [featured, ...rest] = active ? [null, ...visible] : visible;

  return (
    <>
      <Nav />

      <PageTransition>
        <main className="container-site pt-16 md:pt-24">
          <PageIntro
            eyebrow="Writing"
            title="Essays and notes on building intelligent systems."
          />

          <FilterChips
            basePath="/writing"
            param="category"
            options={categories}
            active={active}
          />

          {visible.length === 0 ? (
            <div className="rounded-panel border-border border border-dashed p-12 text-center">
              <p className="text-text-muted font-serif text-lg">
                Writing is being documented.
              </p>
            </div>
          ) : null}

          {featured ? (
            <Link
              href={`/writing/${featured.article.slug}`}
              className="group reveal mb-20 grid gap-8 md:grid-cols-12 md:items-center md:gap-12"
            >
              <ViewTransition
                name={`cover-writing-${featured.article.slug}`}
                share="morph"
                default="none"
              >
                <div className="rounded-panel border-border bg-surface aspect-[4/3] overflow-hidden border md:col-span-7">
                  {featured.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={featured.coverUrl}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
                    />
                  ) : (
                    <div aria-hidden="true" className="hero-wash h-full w-full" />
                  )}
                </div>
              </ViewTransition>
              <div className="md:col-span-5">
                <p className="index-label">
                  <span>Latest</span>
                  <span>{featured.published.category ?? "Essay"}</span>
                </p>
                <h2 className="text-h2 text-text group-hover:text-accent mt-5 font-sans font-semibold transition-colors">
                  {featured.published.title}
                </h2>
                <p className="text-lede text-text-muted mt-5 line-clamp-3 font-serif">
                  {featured.published.excerpt}
                </p>
                <p className="text-text-muted mt-6 font-mono text-xs">
                  {formatDate(featured.published.publishedAt, {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                  {featured.published.readingTime
                    ? `  ·  ${featured.published.readingTime} min read`
                    : ""}
                </p>
              </div>
            </Link>
          ) : null}

          {rest.length > 0 ? (
            <ul className="border-border border-t">
              {rest.map((item) =>
                item ? (
                  <li key={item.article.id} className="border-border reveal border-b">
                    <Link
                      href={`/writing/${item.article.slug}`}
                      className="group grid gap-3 py-8 md:grid-cols-12 md:items-baseline md:gap-6 md:py-10"
                    >
                      <span className="text-text-muted font-mono text-xs md:col-span-2">
                        {formatDate(item.published.publishedAt, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      <span className="md:col-span-7">
                        <span className="text-text group-hover:text-accent block font-sans text-2xl font-semibold tracking-tight transition-colors md:text-[1.75rem]">
                          {item.published.title}
                        </span>
                        <span className="text-text-muted mt-3 line-clamp-2 block font-serif text-base leading-relaxed">
                          {item.published.excerpt}
                        </span>
                      </span>
                      <span className="text-text-muted font-sans text-sm md:col-span-2">
                        {item.published.category ?? ""}
                      </span>
                      <span className="text-text-muted flex items-center justify-between font-mono text-xs md:col-span-1 md:justify-end">
                        {item.published.readingTime
                          ? `${item.published.readingTime} min`
                          : ""}
                        <span
                          aria-hidden="true"
                          className="group-hover:text-accent ml-3 text-base transition-transform group-hover:translate-x-1"
                        >
                          →
                        </span>
                      </span>
                    </Link>
                  </li>
                ) : null,
              )}
            </ul>
          ) : null}
        </main>
      </PageTransition>

      <Footer />
    </>
  );
}
