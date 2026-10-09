import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Footer } from "@/components/layout/footer";
import { Nav } from "@/components/layout/nav";
import { ResearchDetailView } from "@/components/research/research-detail-view";
import { constructPageMetadata } from "@/lib/metadata";
import {
  buildBreadcrumbJsonLd,
  buildJsonLdGraph,
  buildResearchJsonLd,
  JsonLdScript,
} from "@/lib/structured-data";
import {
  getPublicResearchDetail,
  listPublicResearchOverview,
} from "@/server/services/research";
import { getPublicSiteSettings } from "@/server/services/settings";
import { PageTransition } from "@/components/motion/page-transition";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const item = await getPublicResearchDetail(slug);
  if (!item) {
    return {
      title: "Research Not Found",
    };
  }

  return constructPageMetadata({
    title: item.published.title,
    description: item.published.abstract,
    path: `/research/${slug}`,
    image: item.coverUrl,
    type: "article",
  });
}

export default async function ResearchDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const item = await getPublicResearchDetail(slug);

  if (!item) {
    notFound();
  }

  const [settings, allResearch] = await Promise.all([
    getPublicSiteSettings(),
    listPublicResearchOverview(),
  ]);
  const idx = allResearch.findIndex((r) => r.research.slug === slug);
  const nextItem =
    allResearch.length > 1 ? allResearch[(idx + 1) % allResearch.length] : undefined;
  const next = nextItem
    ? {
        slug: nextItem.research.slug,
        title: nextItem.published.title,
        body: nextItem.published.abstract,
        coverUrl: nextItem.coverUrl,
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
          />
        </main>
      </PageTransition>
      <Footer />
    </>
  );
}
