import type { Metadata } from "next";
import { cache } from "react";

import { ResearchCard } from "@/components/research/research-card";
import { Footer } from "@/components/layout/footer";
import { Nav } from "@/components/layout/nav";
import { countBy, FilterChips, firstParam } from "@/components/layout/filter-chips";
import { PageIntro } from "@/components/layout/page-intro";
import { constructPageMetadata, withNoIndex } from "@/lib/metadata";
import { buildCollectionPageJsonLd, JsonLdScript } from "@/lib/structured-data";
import { readOrFallback } from "@/server/services/fallback-read";
import { listPublicResearchOverview } from "@/server/services/research";
import { PageTransition } from "@/components/motion/page-transition";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const TITLE = "Research";
const DESCRIPTION =
  "Super Intelligence Engineer & Entrepreneur. Investigations, technical notes, and experiments, documented with verifiable evidence.";

const METADATA: Metadata = constructPageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/research",
});

// One read per request, shared by the metadata and the page. If it fails the
// page keeps its intro and says the list couldn't load, instead of the error
// screen, and stays out of search results until it recovers.
const loadResearch = cache(() =>
  readOrFallback("/research", "research list", listPublicResearchOverview(), []),
);

export async function generateMetadata(): Promise<Metadata> {
  const { failed } = await loadResearch();
  return failed ? withNoIndex(METADATA) : METADATA;
}

export default async function ResearchListingPage({
  searchParams,
}: PageProps<"/research">) {
  const [{ value: items, failed }, params] = await Promise.all([
    loadResearch(),
    searchParams,
  ]);
  const types = countBy(items, (i) => i.published.type);
  const requested = firstParam(params.type);
  const active = types.some((t) => t.value === requested) ? requested : null;
  const visible = active ? items.filter((i) => i.published.type === active) : items;

  // Describes the unfiltered list, which is what the canonical URL shows.
  const collectionJsonLd =
    !failed && items.length > 0
      ? buildCollectionPageJsonLd({
          path: "/research",
          name: TITLE,
          description: DESCRIPTION,
          items: items.map(({ research, published }) => ({
            path: `/research/${research.slug}`,
            name: published.title,
          })),
        })
      : null;

  return (
    <>
      {collectionJsonLd ? <JsonLdScript data={collectionJsonLd} /> : null}
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
            <ul className="grid gap-x-8 gap-y-14 md:grid-cols-2">
              {visible.map(({ research, published, coverUrl }, i) => (
                <li key={research.id}>
                  <ResearchCard
                    slug={research.slug}
                    published={published}
                    coverUrl={coverUrl}
                    number={i + 1}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-panel border-border border border-dashed p-12 text-center">
              <p className="text-text-muted font-serif text-lg">
                {failed
                  ? "This list couldn't be loaded right now. Please try again in a few minutes."
                  : "Research is being documented."}
              </p>
            </div>
          )}
        </main>
      </PageTransition>

      <Footer />
    </>
  );
}
