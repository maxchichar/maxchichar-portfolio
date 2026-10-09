import Link from "next/link";

import { getPublicSiteSettings } from "@/server/services/settings";

import { FooterWordmark } from "./footer-wordmark";

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
    <footer className="border-border relative mt-24 overflow-hidden border-t">
      <div className="container-site pt-20 pb-12 md:pt-28">
        <div className="grid gap-14 md:grid-cols-12">
          <div className="md:col-span-6">
            <p className="index-label">
              <span aria-hidden="true" className="h-px w-6 bg-current" />
              <span>Have a project in mind?</span>
            </p>
            <h2 className="text-h2 text-text mt-5 max-w-lg font-sans font-semibold">
              Let&apos;s build something{" "}
              <span className="text-text-muted font-serif font-normal italic">
                that matters.
              </span>
            </h2>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/contact"
                className="group bg-text text-bg hover:bg-accent inline-flex items-center gap-2 rounded-full px-6 py-3 font-sans text-sm font-medium transition-colors"
              >
                Start a conversation
                <span
                  aria-hidden="true"
                  className="transition-transform group-hover:translate-x-0.5"
                >
                  →
                </span>
              </Link>
              {settings.primaryEmail ? (
                <a
                  href={`mailto:${settings.primaryEmail}`}
                  className="text-text-muted hover:text-accent font-sans text-sm underline-offset-4 transition-colors hover:underline"
                >
                  {settings.primaryEmail}
                </a>
              ) : null}
            </div>
          </div>

          <nav aria-label="Footer" className="md:col-span-3 md:col-start-8">
            <p className="text-text-muted font-mono text-[11px] tracking-[0.18em] uppercase">
              Index
            </p>
            <ul className="mt-5 space-y-3">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-text hover:text-accent font-sans text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {socialLinks.length > 0 ? (
            <div className="md:col-span-2">
              <p className="text-text-muted font-mono text-[11px] tracking-[0.18em] uppercase">
                Elsewhere
              </p>
              <ul className="mt-5 space-y-3">
                {socialLinks.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-text hover:text-accent inline-flex items-center gap-1 font-sans text-sm transition-colors"
                    >
                      {link.label}
                      <span aria-hidden="true" className="text-text-muted text-xs">
                        ↗
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="border-border text-text-muted mt-20 flex flex-col gap-3 border-t pt-6 font-mono text-xs md:flex-row md:items-center md:justify-between">
          <p>
            &copy; {year} {settings.siteName}
            {settings.siteDescription ? `. ${settings.siteDescription}` : ""}
          </p>
          {settings.footerText ? <p>{settings.footerText}</p> : null}
        </div>
      </div>

      <FooterWordmark xUrl={settings.socialX} instagramUrl={settings.socialInstagram} />
    </footer>
  );
}
