import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { Footer } from "@/components/layout/footer";
import { Nav } from "@/components/layout/nav";
import { UnavailableView } from "@/components/pages/unavailable-view";
import { ArticleDetailView } from "@/components/writing/article-detail-view";
import { constructPageMetadata, withNoIndex } from "@/lib/metadata";
import {
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
  buildJsonLdGraph,
  JsonLdScript,
} from "@/lib/structured-data";
import { readOrFallback } from "@/server/services/fallback-read";
import { getPublicArticleDetail } from "@/server/services/articles";
import { getSiteDocument } from "@/server/services/documents";
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
const loadArticle = cache((slug: string) =>
  readOrFallback("/writing/[slug]", "writing item", getPublicArticleDetail(slug), null),
);

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { value: item, failed } = await loadArticle(slug);
  if (failed) {
    return withNoIndex(
      constructPageMetadata({ title: "Writing", path: `/writing/${slug}` }),
    );
  }
  if (!item) {
    return {
      title: "Article Not Found",
    };
  }

  return constructPageMetadata({
    title: item.published.title,
    description: item.published.excerpt,
    path: `/writing/${slug}`,
    type: "article",
    publishedTime: item.published.publishedAt,
    modifiedTime: item.article.updatedAt,
    tags: item.tags.map((tag) => tag.name),
  });
}

export default async function ArticleDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const { value: item, failed } = await loadArticle(slug);
  if (failed) {
    return (
      <>
        <Nav />
        <main>
          <UnavailableView eyebrow="Writing" path={`/writing/${slug}`} />
        </main>
        <Footer />
      </>
    );
  }

  if (!item) {
    notFound();
  }

  const [settings, readNext, avatar] = await Promise.all([
    getPublicSiteSettings(),
    getReadNext("writing", slug),
    getSiteDocument("avatar"),
  ]);
  const next = readNext.next
    ? {
        slug: readNext.next.slug,
        title: readNext.next.title,
        body: readNext.next.summary,
        coverUrl: readNext.next.coverUrl,
      }
    : null;

  const articleJsonLd = buildArticleJsonLd({
    title: item.published.title,
    excerpt: item.published.excerpt,
    slug,
    coverUrl: item.coverUrl,
    publishedAt: item.published.publishedAt,
    updatedAt: item.article.updatedAt,
    authorName: settings.siteName,
  });

  const breadcrumbsJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "Writing", url: "/writing" },
    { name: item.published.title, url: `/writing/${slug}` },
  ]);

  const pageJsonLd = buildJsonLdGraph([articleJsonLd, breadcrumbsJsonLd]);

  return (
    <>
      <JsonLdScript data={pageJsonLd} />
      <Nav />
      <PageTransition>
        <main>
          <ArticleDetailView
            article={item.article}
            published={item.published}
            tags={item.tags}
            coverUrl={item.coverUrl}
            next={next}
            related={readNext.related}
            author={{
              name: settings.siteName,
              description: settings.siteDescription,
              // The profile photo, else the About portrait, else an initial.
              photoUrl: avatar?.url ?? settings.aboutImage?.url ?? null,
            }}
          />
        </main>
      </PageTransition>
      <Footer />
    </>
  );
}
