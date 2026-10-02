import Link from "next/link";

import { getPublicSiteSettings } from "@/server/services/settings";

const NAV_LINKS = [
  { href: "/work", label: "Work" },
  { href: "/research", label: "Research" },
  { href: "/writing", label: "Writing" },
  { href: "/now", label: "Now" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;

export async function Footer() {
  const year = new Date().getFullYear();
  const settings = await getPublicSiteSettings();

  const socialLinks = [
    { label: "GitHub", href: settings.socialGithub },
    { label: "X", href: settings.socialX },
    { label: "LinkedIn", href: settings.socialLinkedin },
    { label: "YouTube", href: settings.socialYoutube },
    { label: "Instagram", href: settings.socialInstagram },
    { label: "TikTok", href: settings.socialTiktok },
  ].filter((s): s is { label: string; href: string } => Boolean(s.href));

  return (
    <footer className="border-border border-t">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-accent-purple font-sans text-sm font-semibold">
            {settings.siteName}
          </p>
          <p className="text-text-muted mt-1 font-sans text-sm">
            {settings.siteDescription}
          </p>
          {settings.footerText ? (
            <p className="text-text-muted mt-2 font-serif text-xs">
              {settings.footerText}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-4 md:items-end">
          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-text-muted hover:text-text font-sans text-sm transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {socialLinks.length > 0 ? (
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {socialLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-muted hover:text-text font-sans text-xs transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>
          ) : null}

          <p className="text-text-muted font-mono text-xs">&copy; {year}</p>
        </div>
      </div>
    </footer>
  );
}
