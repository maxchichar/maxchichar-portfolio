import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { Footer } from "@/components/layout/footer";
import { Nav } from "@/components/layout/nav";
import { UnavailableView } from "@/components/pages/unavailable-view";
import { ResearchDetailView } from "@/components/research/research-detail-view";
import { constructPageMetadata, withNoIndex } from "@/lib/metadata";
import {
  buildBreadcrumbJsonLd,
  buildJsonLdGraph,
  buildResearchJsonLd,
  JsonLdScript,
} from "@/lib/structured-data";
import { readOrFallback } from "@/server/services/fallback-read";
import { getPublicResearchDetail } from "@/server/services/research";
import { getReadNext } from "@/server/services/related";
import { getPublicSiteSettings } from "@/server/services/settings";
import { PageTransition } from "@/components/motion/page-transition";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

// One read per request, shared by the metadata and the page. `failed` means
// the read itself broke (show a fallback); a null value means there's no
// published item with this slug (404).
const loadResearch = cache((slug: string) =>
  readOrFallback(
    "/research/[slug]",
    "research item",
    getPublicResearchDetail(slug),
    null,
  ),
);

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { value: item, failed } = await loadResearch(slug);
  if (failed) {
    return withNoIndex(
      constructPageMetadata({ title: "Research", path: `/research/${slug}` }),
    );
  }
  if (!item) {
    return {
      title: "Research Not Found",
    };
  }

  return constructPageMetadata({
    title: item.published.title,
    description: item.published.abstract,
    path: `/research/${slug}`,
    type: "article",
  });
}

export default async function ResearchDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const { value: item, failed } = await loadResearch(slug);
  if (failed) {
    return (
      <>
        <Nav />
        <main>
          <UnavailableView eyebrow="Research" path={`/research/${slug}`} />
        </main>
        <Footer />
      </>
    );
  }

  if (!item) {
    notFound();
  }

  const [settings, readNext] = await Promise.all([
    getPublicSiteSettings(),
    getReadNext("research", slug),
  ]);
  const next = readNext.next
    ? {
        slug: readNext.next.slug,
        title: readNext.next.title,
        body: readNext.next.summary,
        coverUrl: readNext.next.coverUrl,
      }
    : null;

  const researchJsonLd = buildResearchJsonLd({
    title: item.published.title,
    abstract: item.published.abstract,
    slug,
    coverUrl: item.coverUrl,
    publishedAt: item.published.publishedAt,
    updatedAt: item.research.updatedAt,
    authorName: settings.siteName,
  });

  const breadcrumbsJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "Research", url: "/research" },
    { name: item.published.title, url: `/research/${slug}` },
  ]);

  const pageJsonLd = buildJsonLdGraph([researchJsonLd, breadcrumbsJsonLd]);

  return (
    <>
      <JsonLdScript data={pageJsonLd} />
      <Nav />
      <PageTransition>
        <main>
          <ResearchDetailView
            research={item.research}
            published={item.published}
            evidence={item.evidence}
            tags={item.tags}
            coverUrl={item.coverUrl}
            next={next}
            related={readNext.related}
          />
        </main>
      </PageTransition>
      <Footer />
    </>
  );
}
