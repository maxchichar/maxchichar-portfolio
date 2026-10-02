import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Footer } from "@/components/layout/footer";
import { Nav } from "@/components/layout/nav";
import { NowView } from "@/components/pages/now-view";
import { constructPageMetadata } from "@/lib/metadata";
import { getPublishedNowPage } from "@/server/services/pages";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const now = await getPublishedNowPage();
  if (!now) {
    return constructPageMetadata({
      title: "Page Not Found",
      path: "/now",
    });
  }

  return constructPageMetadata({
    title: "Now",
    description: "What I'm currently building, researching, and learning.",
    path: "/now",
  });
}

export default async function NowPage() {
  const now = await getPublishedNowPage();
  if (!now) notFound();

  return (
    <>
      <Nav />
      <main>
        <NowView content={now.content} publishedAt={now.published.publishedAt} />
      </main>
      <Footer />
    </>
  );
}
