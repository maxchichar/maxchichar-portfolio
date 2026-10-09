import type { Metadata } from "next";
import Link from "next/link";
import { ViewTransition } from "react";

import { Footer } from "@/components/layout/footer";
import { Nav } from "@/components/layout/nav";
import { countBy, FilterChips, firstParam } from "@/components/layout/filter-chips";
import { PageIntro } from "@/components/layout/page-intro";
import { constructPageMetadata } from "@/lib/metadata";
import { listPublicWorkOverview } from "@/server/services/projects";
import { PageTransition } from "@/components/motion/page-transition";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = constructPageMetadata({
  title: "Selected Work",
  description:
    "Super Intelligence Engineer & Entrepreneur — Selected projects, intelligent systems, and engineering case studies.",
  path: "/work",
});

export default async function WorkListingPage({ searchParams }: PageProps<"/work">) {
  const [items, params] = await Promise.all([listPublicWorkOverview(), searchParams]);
  const categories = countBy(items, (i) => i.published.category);
  const requested = firstParam(params.category);
  const active = categories.some((c) => c.value === requested) ? requested : null;
  const visible = active ? items.filter((i) => i.published.category === active) : items;

  return (
    <>
      <Nav />

      <PageTransition>
        <main className="container-site pt-16 md:pt-24">
          <PageIntro
            eyebrow="Selected Work"
            title="Case studies, production systems, and verifiable engineering proof."
          >
            Evidence over claims. Every project details problem formulation, architecture,
            empirical results, and explicit post-mortems of what failed.
          </PageIntro>

          <FilterChips
            basePath="/work"
            param="category"
            options={categories}
            active={active}
          />

          {visible.length > 0 ? (
            <ul className="grid gap-x-6 gap-y-16 md:grid-cols-12 md:gap-y-24">
              {visible.map(({ project, published, coverUrl }, i) => {
                // Editorial rhythm: a full-width lead, then alternating 7/5 pairs.
                const lead = i === 0;
                // Pairs alternate which side is wide: [7|5], [5|7], [7|5]…
                const pair = Math.floor((i - 1) / 2);
                const firstInPair = (i - 1) % 2 === 0;
                const wide = !lead && (pair % 2 === 0) === firstInPair;
                const span = lead
                  ? "md:col-span-12"
                  : wide
                    ? "md:col-span-7"
                    : "md:col-span-5";
                const techs = published.technologies ?? [];
                return (
                  <li key={project.id} className={`reveal ${span}`}>
                    <Link href={`/work/${project.slug}`} className="group block">
                      <ViewTransition
                        name={`cover-work-${project.slug}`}
                        share="morph"
                        default="none"
                      >
                        <div
                          className={`rounded-panel border-border bg-surface relative overflow-hidden border ${
                            lead
                              ? "aspect-[16/9] md:aspect-[21/9]"
                              : "aspect-[4/3] md:aspect-auto md:h-[26rem]"
                          }`}
                        >
                          {coverUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={coverUrl}
                              alt=""
                              loading={lead ? undefined : "lazy"}
                              className="h-full w-full object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
                            />
                          ) : (
                            <div
                              aria-hidden="true"
                              className="hero-wash flex h-full w-full items-end p-8"
                            >
                              <span className="text-text/10 font-sans text-[clamp(5rem,12vw,10rem)] leading-none font-semibold tracking-tighter">
                                {String(i + 1).padStart(2, "0")}
                              </span>
                            </div>
                          )}
                          <span className="bg-bg/70 text-text absolute top-5 right-5 flex h-11 w-11 translate-y-1 items-center justify-center rounded-full opacity-0 backdrop-blur transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                            ↗
                          </span>
                        </div>
                      </ViewTransition>

                      <div
                        className={`mt-6 ${lead ? "grid gap-4 md:grid-cols-12 md:items-start" : ""}`}
                      >
                        <div className={lead ? "md:col-span-6" : ""}>
                          <p className="text-eyebrow text-text-muted flex gap-3 font-mono uppercase">
                            <span className="text-accent-purple">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            {[published.category, published.year]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                          <h2
                            className={`text-text group-hover:text-accent mt-3 font-sans font-semibold transition-colors ${
                              lead ? "text-h2" : "text-h3"
                            }`}
                          >
                            {published.title}
                          </h2>
                        </div>
                        <div
                          className={lead ? "md:col-span-5 md:col-start-8 md:pt-7" : ""}
                        >
                          <p className="text-text-muted mt-3 line-clamp-3 font-serif text-lg leading-relaxed md:mt-0">
                            {published.shortDescription}
                          </p>
                          {techs.length > 0 ? (
                            <p className="text-text-muted mt-4 font-mono text-xs">
                              {techs.slice(0, 4).join("  /  ")}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="rounded-panel border-border border border-dashed p-12 text-center">
              <p className="text-text-muted font-serif text-lg">
                Work is being documented.
              </p>
            </div>
          )}
        </main>
      </PageTransition>

      <Footer />
    </>
  );
}
