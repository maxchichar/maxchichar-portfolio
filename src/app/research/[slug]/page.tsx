import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Footer } from "@/components/layout/footer";
import { Nav } from "@/components/layout/nav";
import { ResearchDetailView } from "@/components/research/research-detail-view";
import { getPublicResearchDetail } from "@/server/services/research";

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
      title: "Research Not Found — Portfolio OS",
    };
  }

  return {
    title: `${item.published.title} — Portfolio OS`,
    description: item.published.abstract,
  };
}

export default async function ResearchDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const item = await getPublicResearchDetail(slug);

  if (!item) {
    notFound();
  }

  return (
    <>
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
