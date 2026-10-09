import type { Metadata } from "next";

// Self-hosted variable fonts (Fontsource) — no runtime dependency on a
// third-party font CDN. Locked typefaces: FINAL LOCKED SPECIFICATION §D.10.
import "@fontsource-variable/inter-tight";
import "@fontsource-variable/newsreader";
// Italic axis of the same locked Newsreader face — editorial emphasis only.
import "@fontsource-variable/newsreader/wght-italic.css";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";

import { SmoothScroll } from "@/components/motion/smooth-scroll";
import { constructBaseMetadata } from "@/lib/metadata";
import { getPublicSiteSettings } from "@/server/services/settings";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSiteSettings();
  return constructBaseMetadata({
    siteName: settings.siteName,
    siteDescription: settings.siteDescription,
  });
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className="bg-bg text-text min-h-screen font-sans antialiased">
        <SmoothScroll />
        {children}
      </body>
    </html>
  );
}
