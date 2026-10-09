import type { Metadata } from "next";
import Link from "next/link";

import { Footer } from "@/components/layout/footer";
import { Nav } from "@/components/layout/nav";
import { countBy, FilterChips, firstParam } from "@/components/layout/filter-chips";
import { PageIntro } from "@/components/layout/page-intro";
import { constructPageMetadata } from "@/lib/metadata";
import { listPublicResearchOverview } from "@/server/services/research";
import { PageTransition } from "@/components/motion/page-transition";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = constructPageMetadata({
  title: "Research",
  description:
    "Super Intelligence Engineer & Entrepreneur — Investigations, technical notes, and experiments, documented with verifiable evidence.",
  path: "/research",
});

export default async function ResearchListingPage({
  searchParams,
}: PageProps<"/research">) {
  const [items, params] = await Promise.all([listPublicResearchOverview(), searchParams]);
  const types = countBy(items, (i) => i.published.type);
  const requested = firstParam(params.type);
  const active = types.some((t) => t.value === requested) ? requested : null;
  const visible = active ? items.filter((i) => i.published.type === active) : items;

  return (
    <>
      <Nav />

      <PageTransition>
        <main className="container-site pt-16 md:pt-24">
          <PageIntro
            eyebrow="Research"
            title="Investigations, technical notes, and experiments."
          >
            Evidence over claims. Every item states its research question, methodology,
            and findings, with sources and counterarguments included.
          </PageIntro>

          <FilterChips
            basePath="/research"
            param="type"
            options={types}
            active={active}
          />

          {visible.length > 0 ? (
            <div>
              {/* Column headings (desktop) — reads as an index of papers. */}
              <div className="text-eyebrow text-text-muted hidden grid-cols-12 gap-6 pb-4 font-mono uppercase md:grid">
                <span className="col-span-1">No.</span>
                <span className="col-span-6">Title</span>
                <span className="col-span-2">Type</span>
                <span className="col-span-2">Field</span>
                <span className="col-span-1 text-right">Year</span>
              </div>
              <ul className="border-border border-t">
                {visible.map(({ research, published }, i) => (
                  <li key={research.id} className="border-border reveal border-b">
                    <Link
                      href={`/research/${research.slug}`}
                      className="group grid gap-3 py-8 md:grid-cols-12 md:items-baseline md:gap-6 md:py-10"
                    >
                      <span className="text-accent-purple font-mono text-xs tabular-nums md:col-span-1">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="md:col-span-6">
                        <span className="text-text group-hover:text-accent block font-sans text-2xl font-semibold tracking-tight transition-colors md:text-[1.75rem]">
                          {published.title}
                        </span>
                        <span className="text-text-muted mt-3 line-clamp-2 block font-serif text-base leading-relaxed">
                          {published.abstract}
                        </span>
                      </span>
                      <span className="text-text font-sans text-sm md:col-span-2">
                        {published.type}
                      </span>
                      <span className="text-text-muted font-sans text-sm md:col-span-2">
                        {published.category ?? "—"}
                      </span>
                      <span className="text-text-muted font-mono text-xs tabular-nums md:col-span-1 md:text-right">
                        {published.publishedAt
                          ? new Date(published.publishedAt).getFullYear()
                          : ""}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="rounded-panel border-border border border-dashed p-12 text-center">
              <p className="text-text-muted font-serif text-lg">
                Research is being documented.
              </p>
            </div>
          )}
        </main>
      </PageTransition>

      <Footer />
    </>
  );
}
