import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from "@/lib/og/card";
import { getPublishedAboutPage } from "@/server/services/pages";
import { getPublicSiteSettings } from "@/server/services/settings";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "About preview card";
// Reads published content and settings from the database.
export const dynamic = "force-dynamic";

export default async function Image() {
  const [about, settings] = await Promise.all([
    getPublishedAboutPage().catch(() => null),
    getPublicSiteSettings(),
  ]);
  return renderOgCard({
    eyebrow: "About",
    title: settings.siteName,
    description: about?.content.intro ?? settings.siteDescription,
    coverUrl: settings.aboutImage?.url,
  });
}
