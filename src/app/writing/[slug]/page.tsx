import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Footer } from "@/components/layout/footer";
import { Nav } from "@/components/layout/nav";
import { ArticleDetailView } from "@/components/writing/article-detail-view";
import { constructPageMetadata } from "@/lib/metadata";
import {
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
  buildJsonLdGraph,
  JsonLdScript,
} from "@/lib/structured-data";
import { getPublicArticleDetail } from "@/server/services/articles";
import { getPublicSiteSettings } from "@/server/services/settings";
import { PageTransition } from "@/components/motion/page-transition";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const item = await getPublicArticleDetail(slug);
  if (!item) {
    return {
      title: "Article Not Found",
    };
  }

  return constructPageMetadata({
    title: item.published.title,
    description: item.published.excerpt,
    path: `/writing/${slug}`,
    image: item.coverUrl,
    type: "article",
  });
}

export default async function ArticleDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const item = await getPublicArticleDetail(slug);

  if (!item) {
    notFound();
  }

  const settings = await getPublicSiteSettings();
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
          />
        </main>
      </PageTransition>
      <Footer />
    </>
  );
}
