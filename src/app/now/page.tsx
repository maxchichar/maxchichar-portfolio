import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { Footer } from "@/components/layout/footer";
import { Nav } from "@/components/layout/nav";
import { NowView } from "@/components/pages/now-view";
import { UnavailableView } from "@/components/pages/unavailable-view";
import { constructPageMetadata, toDescription, withNoIndex } from "@/lib/metadata";
import { readOrFallback } from "@/server/services/fallback-read";
import { getPublishedNowPage } from "@/server/services/pages";
import { PageTransition } from "@/components/motion/page-transition";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// One read per request, shared by the metadata and the page. `failed` means
// the read itself broke (show a fallback); a null value means the page simply
// isn't published (404).
const loadNow = cache(() =>
  readOrFallback("/now", "now page", getPublishedNowPage(), null),
);

export async function generateMetadata(): Promise<Metadata> {
  const { value: now, failed } = await loadNow();
  if (failed) {
    return withNoIndex(constructPageMetadata({ title: "Now", path: "/now" }));
  }
  if (!now) {
    return constructPageMetadata({
      title: "Page Not Found",
      path: "/now",
    });
  }

  return constructPageMetadata({
    title: "Now",
    description: toDescription(now.content.thesis),
    path: "/now",
  });
}

export default async function NowPage() {
  const { value: now, failed } = await loadNow();
  if (failed) {
    return (
      <>
        <Nav />
        <main>
          <UnavailableView eyebrow="Now" path="/now" />
        </main>
        <Footer />
      </>
    );
  }
  if (!now) notFound();

  return (
    <>
      <Nav />
      <PageTransition>
        <main>
          <NowView content={now.content} publishedAt={now.published.publishedAt} />
        </main>
      </PageTransition>
      <Footer />
    </>
  );
}
