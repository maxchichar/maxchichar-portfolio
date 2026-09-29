import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Footer } from "@/components/layout/footer";
import { Nav } from "@/components/layout/nav";
import { NowView } from "@/components/pages/now-view";
import { getPublishedNowPage } from "@/server/services/pages";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const now = await getPublishedNowPage();
  if (!now) {
    return { title: "Page Not Found — Portfolio OS" };
  }

  return {
    title: "Now — Portfolio OS",
    description: "What I'm currently building, researching, and learning.",
  };
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
