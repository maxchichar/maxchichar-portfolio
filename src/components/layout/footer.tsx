import Link from "next/link";

const NAV_LINKS = [
  { href: "/work", label: "Work" },
  { href: "/research", label: "Research" },
  { href: "/writing", label: "Writing" },
  { href: "/now", label: "Now" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-border border-t">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-accent-purple font-sans text-sm font-semibold">
            Portfolio OS
          </p>
          {/* Positioning statement — pulled from site_settings in Phase 8;
              this is the locked eyebrow copy in the meantime, not placeholder text. */}
          <p className="text-text-muted mt-1 font-sans text-sm">
            AI-Native Engineer &amp; Entrepreneur
          </p>
        </div>

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

        {/* Social links render here once site_settings.social_* exist — Phase 8. */}
        <p className="text-text-muted font-mono text-xs">&copy; {year}</p>
      </div>
    </footer>
  );
}
