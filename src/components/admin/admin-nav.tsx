"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const SECTIONS = [
  {
    label: "Overview",
    links: [{ href: "/admin", label: "Dashboard", icon: "grid" }],
  },
  {
    label: "Content",
    links: [
      { href: "/admin/projects", label: "Projects", icon: "box" },
      { href: "/admin/research", label: "Research", icon: "flask" },
      { href: "/admin/articles", label: "Writing", icon: "pen" },
      { href: "/admin/pages", label: "Pages", icon: "file" },
    ],
  },
  {
    label: "Site",
    links: [
      { href: "/admin/media", label: "Media Library", icon: "image" },
      { href: "/admin/settings", label: "Settings", icon: "sliders" },
    ],
  },
] as const;

type IconName = (typeof SECTIONS)[number]["links"][number]["icon"];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav({
  siteName,
  email,
  signOutSlot,
}: {
  siteName: string;
  email: string | null;
  signOutSlot: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const nav = (
    <nav aria-label="Admin" className="flex-1 space-y-7 overflow-y-auto px-3 py-6">
      {SECTIONS.map((section) => (
        <div key={section.label}>
          <p className="text-text-muted px-3 font-mono text-[10px] tracking-[0.18em] uppercase">
            {section.label}
          </p>
          <ul className="mt-2 space-y-0.5">
            {section.links.map((link) => {
              const active = isActive(pathname, link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className={`rounded-card flex items-center gap-3 px-3 py-2 font-sans text-sm transition-colors ${
                      active
                        ? "bg-text/[0.06] text-text"
                        : "text-text-muted hover:bg-text/[0.03] hover:text-text"
                    }`}
                  >
                    <NavIcon
                      name={link.icon}
                      className={active ? "text-accent" : "text-text-muted"}
                    />
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const footer = (
    <div className="border-border space-y-3 border-t p-4">
      <Link
        href="/"
        target="_blank"
        className="text-text-muted hover:text-text flex items-center justify-between font-sans text-xs transition-colors"
      >
        View live site
        <span aria-hidden="true">↗</span>
      </Link>
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="bg-accent-purple/15 text-accent-purple flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-sans text-xs font-semibold uppercase"
        >
          {(email ?? "A").slice(0, 1)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-text truncate font-sans text-xs">{email}</p>
          <p className="text-text-muted font-mono text-[10px] uppercase">Admin</p>
        </div>
        {signOutSlot}
      </div>
    </div>
  );

  const brand = (
    <Link href="/admin" className="flex items-center gap-2.5">
      <span
        aria-hidden="true"
        className="bg-accent-purple text-bg flex h-7 w-7 items-center justify-center rounded-[6px] font-sans text-xs font-bold"
      >
        M
      </span>
      <span className="leading-tight">
        <span className="text-text block font-sans text-sm font-semibold tracking-tight">
          {siteName}
        </span>
        <span className="text-text-muted block font-mono text-[10px] tracking-wider uppercase">
          Studio
        </span>
      </span>
    </Link>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="border-border bg-surface/60 sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r lg:flex">
        <div className="border-border flex h-16 items-center border-b px-5">{brand}</div>
        {nav}
        {footer}
      </aside>

      {/* Mobile top bar + drawer */}
      <div className="border-border bg-bg/80 sticky top-0 z-40 flex h-14 items-center justify-between border-b px-4 backdrop-blur-xl lg:hidden">
        {brand}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="admin-mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          className="text-text-muted hover:text-text p-2"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="h-5 w-5"
          >
            {open ? (
              <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
            ) : (
              <path d="M3 6h14M3 10h14M3 14h14" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>
      {open ? (
        <div
          id="admin-mobile-nav"
          className="bg-bg fixed inset-x-0 top-14 bottom-0 z-40 flex flex-col lg:hidden"
        >
          {nav}
          {footer}
        </div>
      ) : null}
    </>
  );
}

function NavIcon({ name, className }: { name: IconName; className?: string }) {
  const common = {
    "aria-hidden": true,
    viewBox: "0 0 20 20",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: `h-4 w-4 shrink-0 ${className ?? ""}`,
  };
  switch (name) {
    case "grid":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="5.5" height="5.5" rx="1" />
          <rect x="11.5" y="3" width="5.5" height="5.5" rx="1" />
          <rect x="3" y="11.5" width="5.5" height="5.5" rx="1" />
          <rect x="11.5" y="11.5" width="5.5" height="5.5" rx="1" />
        </svg>
      );
    case "box":
      return (
        <svg {...common}>
          <path d="M10 2.5l7 3.5v8l-7 3.5-7-3.5V6z" />
          <path d="M3 6l7 3.5L17 6M10 9.5v8" />
        </svg>
      );
    case "flask":
      return (
        <svg {...common}>
          <path d="M8 2.5h4M8.5 2.5v5L4 16a1 1 0 00.9 1.5h10.2A1 1 0 0016 16l-4.5-8.5v-5" />
          <path d="M6 12.5h8" />
        </svg>
      );
    case "pen":
      return (
        <svg {...common}>
          <path d="M13.5 3.5l3 3L7 16H4v-3z" />
          <path d="M11.5 5.5l3 3" />
        </svg>
      );
    case "file":
      return (
        <svg {...common}>
          <path d="M11.5 2.5H5.5a1 1 0 00-1 1v13a1 1 0 001 1h9a1 1 0 001-1v-10z" />
          <path d="M11.5 2.5v4h4M7.5 10.5h5M7.5 13.5h5" />
        </svg>
      );
    case "image":
      return (
        <svg {...common}>
          <rect x="2.5" y="3.5" width="15" height="13" rx="1.5" />
          <circle cx="7" cy="8" r="1.5" />
          <path d="M17.5 13l-4-4-8 7.5" />
        </svg>
      );
    case "sliders":
      return (
        <svg {...common}>
          <path d="M4 5h6M14 5h2M4 10h2M10 10h6M4 15h8M16 15h0" />
          <circle cx="12" cy="5" r="1.75" />
          <circle cx="8" cy="10" r="1.75" />
          <circle cx="14" cy="15" r="1.75" />
        </svg>
      );
  }
}
