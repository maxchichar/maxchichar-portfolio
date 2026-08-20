import Link from "next/link";

// Primary IA — FINAL LOCKED SPECIFICATION §D.8. Contact is a persistent CTA,
// not a nav "read" item; search is an icon-triggered overlay, not a nav item.
const NAV_LINKS = [
  { href: "/work", label: "Work" },
  { href: "/research", label: "Research" },
  { href: "/writing", label: "Writing" },
  { href: "/now", label: "Now" },
  { href: "/about", label: "About" },
] as const;

export function Nav() {
  return (
    <header className="border-border border-b">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        {/* Wordmark — purple is an identity signal only, never interactive
            feedback. Replaced by site_settings.site_name in Phase 8. */}
        <Link
          href="/"
          className="text-accent-purple font-sans text-sm font-semibold tracking-tight"
        >
          Portfolio OS
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-8 md:flex">
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

        <div className="flex items-center gap-4">
          {/* Static placeholder — the search overlay itself is a later phase. */}
          <button
            type="button"
            aria-label="Search"
            className="text-text-muted hover:text-text transition-colors"
          >
            <SearchIcon />
          </button>
          <Link
            href="/contact"
            className="rounded-badge border-accent text-accent hover:bg-accent hover:text-bg border px-4 py-2 font-sans text-sm transition-colors"
          >
            Contact
          </Link>
        </div>
      </div>
    </header>
  );
}

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="h-5 w-5"
    >
      <circle cx="8.5" cy="8.5" r="6" />
      <path d="M13 13l5 5" strokeLinecap="round" />
    </svg>
  );
}
