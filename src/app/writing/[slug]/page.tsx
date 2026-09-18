import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Footer } from "@/components/layout/footer";
import { Nav } from "@/components/layout/nav";
import { ArticleDetailView } from "@/components/writing/article-detail-view";
import { getPublicArticleDetail } from "@/server/services/articles";

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
      title: "Article Not Found — Portfolio OS",
    };
  }

  return {
    title: `${item.published.title} — Portfolio OS`,
    description: item.published.excerpt,
  };
}

export default async function ArticleDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const item = await getPublicArticleDetail(slug);

  if (!item) {
    notFound();
  }

  return (
    <>
      <Nav />
      <main>
        <ArticleDetailView
          article={item.article}
          published={item.published}
          tags={item.tags}
          coverUrl={item.coverUrl}
        />
      </main>
      <Footer />
    </>
  );
}
