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
import { getPublicResearchDetail } from "@/server/services/research";
import { getPublicSiteSettings } from "@/server/services/settings";

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

  const settings = await getPublicSiteSettings();
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
      <main>
        <ResearchDetailView
          research={item.research}
          published={item.published}
          evidence={item.evidence}
          tags={item.tags}
          coverUrl={item.coverUrl}
        />
      </main>
      <Footer />
    </>
  );
}
