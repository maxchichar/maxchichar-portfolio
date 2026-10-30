import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { Footer } from "@/components/layout/footer";
import { Nav } from "@/components/layout/nav";
import { AboutView } from "@/components/pages/about-view";
import { UnavailableView } from "@/components/pages/unavailable-view";
import {
  constructPageMetadata,
  SITE_ALTERNATE_NAME,
  SITE_AUTHOR,
  toDescription,
  withNoIndex,
} from "@/lib/metadata";
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

  // Answers "who is …" searches directly, without repeating the site name.
  const title = `About ${SITE_AUTHOR} (${SITE_ALTERNATE_NAME})`;
  return {
    ...constructPageMetadata({
      title,
      description: toDescription(about.content.intro),
      path: "/about",
    }),
    title: { absolute: title },
  };
}

export default async function AboutPage() {
  const [{ value: about, failed }, settings, cv, avatar] = await Promise.all([
    loadAbout(),
    getPublicSiteSettings(),
    getSiteDocument("cv"),
    getSiteDocument("avatar"),
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
    image: settings.aboutImage?.url ?? avatar?.url,
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
