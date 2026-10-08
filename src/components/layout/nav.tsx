import { getPublicSiteSettings } from "@/server/services/settings";

import { NavBar } from "./nav-bar";

// Primary IA — FINAL LOCKED SPECIFICATION §D.8. Contact is a persistent CTA,
// not a nav "read" item; search is an icon-triggered overlay, not a nav item.
export const NAV_LINKS = [
  { href: "/work", label: "Work" },
  { href: "/research", label: "Research" },
  { href: "/writing", label: "Writing" },
  { href: "/now", label: "Now" },
  { href: "/about", label: "About" },
] as const;

/**
 * `overlay` floats the bar transparently over a full-bleed hero (homepage);
 * it gains its solid, blurred backdrop once the visitor scrolls.
 */
export async function Nav({ overlay = false }: { overlay?: boolean }) {
  const settings = await getPublicSiteSettings();

  return <NavBar siteName={settings.siteName} links={NAV_LINKS} overlay={overlay} />;
}
