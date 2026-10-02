import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Footer } from "@/components/layout/footer";
import { Nav } from "@/components/layout/nav";
import { AboutView } from "@/components/pages/about-view";
import { constructPageMetadata } from "@/lib/metadata";
import { getPublishedAboutPage } from "@/server/services/pages";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Meta descriptions read best under ~160 characters; the intro can be
// longer than that, so trim on a word boundary.
function toDescription(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= 160) return flat;
  return `${flat.slice(0, 157).replace(/\s+\S*$/, "")}…`;
}

export async function generateMetadata(): Promise<Metadata> {
  const about = await getPublishedAboutPage();
  if (!about) {
    return constructPageMetadata({
      title: "Page Not Found",
      path: "/about",
    });
  }

  return constructPageMetadata({
    title: "About",
    description: toDescription(about.content.intro),
    path: "/about",
  });
}

export default async function AboutPage() {
  const about = await getPublishedAboutPage();
  if (!about) notFound();

  return (
    <>
      <Nav />
      <main>
        <AboutView content={about.content} />
      </main>
      <Footer />
    </>
  );
}
