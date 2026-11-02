import Link from "next/link";

import { getPublicSiteSettings } from "@/server/services/settings";

import { FooterWordmark } from "./footer-wordmark";

const NAV_LINKS = [
  { href: "/work", label: "Work" },
  { href: "/research", label: "Research" },
  { href: "/writing", label: "Writing" },
  { href: "/topics", label: "Topics" },
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
      <div className="container-site pt-16 pb-10 sm:pt-20 sm:pb-12 md:pt-28">
        <div className="grid grid-cols-2 gap-x-6 gap-y-12 sm:gap-x-10 md:grid-cols-12 md:gap-14">
          <div className="col-span-2 md:col-span-6">
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
            <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:flex-wrap sm:items-center">
              <Link
                href="/contact"
                className="group bg-text text-bg hover:bg-accent inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full px-6 py-3 font-sans text-sm font-medium transition-colors sm:w-auto"
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
                  className="text-text-muted hover:text-accent max-w-full py-2 font-sans text-sm [overflow-wrap:anywhere] underline-offset-4 transition-colors hover:underline sm:py-0"
                >
                  {settings.primaryEmail}
                </a>
              ) : null}
            </div>
          </div>

          <nav
            aria-label="Footer"
            className={`min-w-0 md:col-span-3 md:col-start-8 ${
              socialLinks.length > 0 ? "" : "col-span-2"
            }`}
          >
            <p className="text-text-muted font-mono text-[11px] tracking-[0.18em] uppercase">
              Index
            </p>
            <ul
              className={`mt-3 md:mt-5 md:block md:space-y-3 ${
                socialLinks.length > 0
                  ? "space-y-1"
                  : "grid grid-cols-2 gap-x-6 sm:grid-cols-3"
              }`}
            >
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-text hover:text-accent inline-block py-2 font-sans text-sm transition-colors md:py-0"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {socialLinks.length > 0 ? (
            <div className="min-w-0 md:col-span-2">
              <p className="text-text-muted font-mono text-[11px] tracking-[0.18em] uppercase">
                Elsewhere
              </p>
              <ul className="mt-3 space-y-1 md:mt-5 md:space-y-3">
                {socialLinks.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-text hover:text-accent inline-flex items-center gap-1 py-2 font-sans text-sm transition-colors md:py-0"
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

        <div className="border-border text-text-muted mt-16 flex flex-col gap-3 border-t pt-6 font-mono text-xs md:mt-20 md:flex-row md:items-center md:justify-between md:gap-6">
          <p className="[overflow-wrap:anywhere]">
            &copy; {year} {settings.siteName}
            {settings.siteDescription ? `. ${settings.siteDescription}` : ""}
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {settings.footerText ? <p>{settings.footerText}</p> : null}
            <a
              href="/feed.xml"
              className="hover:text-text inline-flex items-center gap-1.5 py-2 transition-colors md:py-0"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                fill="currentColor"
                className="h-3 w-3"
              >
                <circle cx="3" cy="13" r="1.75" />
                <path d="M1.25 6.5a8.25 8.25 0 018.25 8.25h-2a6.25 6.25 0 00-6.25-6.25v-2z" />
                <path d="M1.25 1.25A13.5 13.5 0 0114.75 14.75h-2A11.5 11.5 0 001.25 3.25v-2z" />
              </svg>
              RSS
            </a>
          </div>
        </div>
      </div>

      <FooterWordmark xUrl={settings.socialX} instagramUrl={settings.socialInstagram} />
    </footer>
  );
}
