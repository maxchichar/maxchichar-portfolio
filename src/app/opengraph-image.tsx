import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from "@/lib/og/card";
import { getPublishedHomePage } from "@/server/services/pages";
import { getPublicSiteSettings } from "@/server/services/settings";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Portfolio preview card";
// Reads published content and settings from the database.
export const dynamic = "force-dynamic";

export default async function Image() {
  const [home, settings] = await Promise.all([
    getPublishedHomePage().catch(() => null),
    getPublicSiteSettings(),
  ]);
  return renderOgCard({
    eyebrow: "Portfolio",
    title:
      home?.content.heroHeadline ||
      "I build intelligent systems for real-world problems.",
    description: settings.siteDescription,
    coverUrl: settings.heroImage?.url,
  });
}
