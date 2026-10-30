import type { MetadataRoute } from "next";

import { DEFAULT_SITE_DESCRIPTION, SITE_ALTERNATE_NAME } from "@/lib/metadata";
import { getPublicSiteSettings } from "@/server/services/settings";

export const dynamic = "force-dynamic";

/**
 * Web app manifest (/manifest.webmanifest). Chrome, Brave, Edge, Firefox and
 * Samsung Internet read it for the install prompt, home-screen name and icon,
 * and the splash/title-bar colours.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await getPublicSiteSettings().catch(() => null);
  const name = settings?.siteName?.trim() || "CHIBUEZE MAXWELL";

  return {
    id: "/",
    name,
    short_name: SITE_ALTERNATE_NAME,
    description: DEFAULT_SITE_DESCRIPTION,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0a0a0b",
    theme_color: "#0a0a0b",
    lang: "en",
    categories: ["technology", "education", "productivity"],
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any", purpose: "any" },
      { src: "/apple-icon.png", type: "image/png", sizes: "180x180", purpose: "any" },
    ],
  };
}
