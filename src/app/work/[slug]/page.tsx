import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Footer } from "@/components/layout/footer";
import { Nav } from "@/components/layout/nav";
import { CaseStudyView } from "@/components/work/case-study-view";
import { constructPageMetadata } from "@/lib/metadata";
import {
  buildBreadcrumbJsonLd,
  buildJsonLdGraph,
  buildWorkJsonLd,
  JsonLdScript,
} from "@/lib/structured-data";
import {
  getPublicWorkCaseStudy,
  listPublicWorkOverview,
} from "@/server/services/projects";
import { getPublicSiteSettings } from "@/server/services/settings";
import { PageTransition } from "@/components/motion/page-transition";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const item = await getPublicWorkCaseStudy(slug);
  if (!item) {
    return {
      title: "Project Not Found",
    };
  }

  return constructPageMetadata({
    title: item.published.title,
    description: item.published.shortDescription,
    path: `/work/${slug}`,
    image: item.coverUrl,
    type: "website",
  });
}

export default async function WorkCaseStudyPage({ params }: PageProps) {
  const { slug } = await params;
  const item = await getPublicWorkCaseStudy(slug);

  if (!item) {
    notFound();
  }

  const [settings, allWork] = await Promise.all([
    getPublicSiteSettings(),
    listPublicWorkOverview(),
  ]);
  // Next case study: the following item in listing order, wrapping around.
  const idx = allWork.findIndex((w) => w.project.slug === slug);
  const nextItem = allWork.length > 1 ? allWork[(idx + 1) % allWork.length] : undefined;
  const next = nextItem
    ? {
        slug: nextItem.project.slug,
        title: nextItem.published.title,
        body: nextItem.published.shortDescription,
        coverUrl: nextItem.coverUrl,
      }
    : null;

  const workJsonLd = buildWorkJsonLd({
    title: item.published.title,
    description: item.published.shortDescription,
    slug,
    category: item.published.category,
    coverUrl: item.coverUrl,
    publishedAt: item.published.publishedAt,
    updatedAt: item.project.updatedAt,
    authorName: settings.siteName,
  });

  const breadcrumbsJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "Work", url: "/work" },
    { name: item.published.title, url: `/work/${slug}` },
  ]);

  const pageJsonLd = buildJsonLdGraph([workJsonLd, breadcrumbsJsonLd]);

  return (
    <>
      <JsonLdScript data={pageJsonLd} />
      <Nav />
      <PageTransition>
        <main>
          <CaseStudyView
            project={item.project}
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
