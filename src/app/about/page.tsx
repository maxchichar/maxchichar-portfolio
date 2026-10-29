import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { Footer } from "@/components/layout/footer";
import { Nav } from "@/components/layout/nav";
import { AboutView } from "@/components/pages/about-view";
import { UnavailableView } from "@/components/pages/unavailable-view";
import { constructPageMetadata, toDescription, withNoIndex } from "@/lib/metadata";
import { buildProfilePageJsonLd, JsonLdScript } from "@/lib/structured-data";
import { readOrFallback } from "@/server/services/fallback-read";
import { getPublishedAboutPage } from "@/server/services/pages";
import { getSiteDocument } from "@/server/services/documents";
import { getPublicSiteSettings } from "@/server/services/settings";
import { PageTransition } from "@/components/motion/page-transition";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// One read per request, shared by the metadata and the page. `failed` means
// the read itself broke (show a fallback); a null value means the page simply
// isn't published (404).
const loadAbout = cache(() =>
  readOrFallback("/about", "about page", getPublishedAboutPage(), null),
);

export async function generateMetadata(): Promise<Metadata> {
  const { value: about, failed } = await loadAbout();
  if (failed) {
    return withNoIndex(constructPageMetadata({ title: "About", path: "/about" }));
  }
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
  const [{ value: about, failed }, settings, cv] = await Promise.all([
    loadAbout(),
    getPublicSiteSettings(),
    getSiteDocument("cv"),
  ]);
  if (failed) {
    return (
      <>
        <Nav />
        <main>
          <UnavailableView eyebrow="About" path="/about" />
        </main>
        <Footer />
      </>
    );
  }
  if (!about) notFound();

  const profile = buildProfilePageJsonLd({
    name: settings.siteName,
    description: about.content.intro,
    image: settings.aboutImage?.url,
    socialLinks: [
      settings.socialGithub,
      settings.socialX,
      settings.socialLinkedin,
      settings.socialYoutube,
      settings.socialInstagram,
      settings.socialTiktok,
    ],
  });

  return (
    <>
      <JsonLdScript data={profile} />
      <Nav />
      <PageTransition>
        <main>
          <AboutView
            content={about.content}
            image={settings.aboutImage}
            name={settings.siteName}
            cv={cv}
          />
        </main>
      </PageTransition>
      <Footer />
    </>
  );
}
