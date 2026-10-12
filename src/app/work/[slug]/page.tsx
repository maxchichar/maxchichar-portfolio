import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { Footer } from "@/components/layout/footer";
import { Nav } from "@/components/layout/nav";
import { UnavailableView } from "@/components/pages/unavailable-view";
import { CaseStudyView } from "@/components/work/case-study-view";
import { constructPageMetadata, withNoIndex } from "@/lib/metadata";
import {
  buildBreadcrumbJsonLd,
  buildJsonLdGraph,
  buildWorkJsonLd,
  JsonLdScript,
} from "@/lib/structured-data";
import { readOrFallback } from "@/server/services/fallback-read";
import { getPublicWorkCaseStudy } from "@/server/services/projects";
import { getReadNext } from "@/server/services/related";
import { getPublicSiteSettings } from "@/server/services/settings";
import { getProjectTestimonials } from "@/server/services/testimonials";
import { PageTransition } from "@/components/motion/page-transition";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

// One read per request, shared by the metadata and the page. `failed` means
// the read itself broke (show a fallback); a null value means there's no
// published item with this slug (404).
const loadProject = cache((slug: string) =>
  readOrFallback("/work/[slug]", "work item", getPublicWorkCaseStudy(slug), null),
);

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { value: item, failed } = await loadProject(slug);
  if (failed) {
    return withNoIndex(constructPageMetadata({ title: "Work", path: `/work/${slug}` }));
  }
  if (!item) {
    return {
      title: "Project Not Found",
    };
  }

  return constructPageMetadata({
    title: item.published.title,
    description: item.published.shortDescription,
    path: `/work/${slug}`,
    type: "website",
  });
}

export default async function WorkCaseStudyPage({ params }: PageProps) {
  const { slug } = await params;
  const { value: item, failed } = await loadProject(slug);
  if (failed) {
    return (
      <>
        <Nav />
        <main>
          <UnavailableView eyebrow="Work" path={`/work/${slug}`} />
        </main>
        <Footer />
      </>
    );
  }

  if (!item) {
    notFound();
  }

  const [settings, readNext, testimonials] = await Promise.all([
    getPublicSiteSettings(),
    getReadNext("work", slug),
    getProjectTestimonials(item.project.id),
  ]);
  const next = readNext.next
    ? {
        slug: readNext.next.slug,
        title: readNext.next.title,
        body: readNext.next.summary,
        coverUrl: readNext.next.coverUrl,
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
            related={readNext.related}
            testimonials={testimonials}
          />
        </main>
      </PageTransition>
      <Footer />
    </>
  );
}
