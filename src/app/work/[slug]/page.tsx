import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Footer } from "@/components/layout/footer";
import { Nav } from "@/components/layout/nav";
import { CaseStudyView } from "@/components/work/case-study-view";
import { getPublicWorkCaseStudy } from "@/server/services/projects";

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
      title: "Project Not Found — Portfolio OS",
    };
  }

  return {
    title: `${item.published.title} — Portfolio OS`,
    description: item.published.shortDescription,
  };
}

export default async function WorkCaseStudyPage({ params }: PageProps) {
  const { slug } = await params;
  const item = await getPublicWorkCaseStudy(slug);

  if (!item) {
    notFound();
  }

  return (
    <>
      <Nav />
      <main>
        <CaseStudyView
          project={item.project}
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
