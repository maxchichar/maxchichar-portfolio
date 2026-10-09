"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { LogoMark } from "@/components/brand/logo-mark";
import { ThemeToggle } from "@/components/theme-toggle";

export function NavBar({
  siteName,
  links,
  overlay,
  overlayDark = false,
}: {
  siteName: string;
  links: readonly { href: string; label: string }[];
  overlay: boolean;
  overlayDark?: boolean;
}) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const solid = !overlay || scrolled || open;

  return (
    <>
      <header
        // While floating over a dark-island hero, use dark tokens; once
        // scrolled (solid), follow the page theme again.
        data-theme={overlayDark && !solid ? "dark" : undefined}
        className={`${overlay ? "fixed" : "sticky"} inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-300 ${
          solid
            ? "border-border bg-bg/75 border-b backdrop-blur-xl"
            : "border-b border-transparent bg-transparent"
        }`}
      >
        <div className="container-site flex h-16 items-center justify-between md:h-20">
          {/* Logo + name. Purple is an identity signal only, never
            interactive feedback. */}
          <Link
            href="/"
            className="text-text flex items-center gap-2.5 font-sans text-sm font-semibold tracking-tight"
          >
            <LogoMark className="h-[18px] w-auto shrink-0" />
            {siteName}
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
            {links.map((link) => {
              const active =
                pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative rounded-full px-4 py-2 font-sans text-sm transition-colors ${
                    active ? "text-text" : "text-text-muted hover:text-text"
                  }`}
                >
                  {link.label}
                  {active ? (
                    <span
                      aria-hidden="true"
                      className="bg-text absolute inset-x-4 -bottom-px h-px"
                    />
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/contact"
              className="group bg-text text-bg hover:bg-accent hidden items-center gap-2 rounded-full px-5 py-2.5 font-sans text-sm font-medium transition-colors md:inline-flex"
            >
              Let&apos;s talk
              <span
                aria-hidden="true"
                className="transition-transform group-hover:translate-x-0.5"
              >
                →
              </span>
            </Link>

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="mobile-nav"
              aria-label={open ? "Close menu" : "Open menu"}
              className="text-text -mr-2 flex h-10 w-10 items-center justify-center md:hidden"
            >
              <span className="relative block h-3 w-5">
                <span
                  className={`bg-text absolute left-0 h-px w-5 transition-transform duration-300 ${
                    open ? "top-1.5 rotate-45" : "top-0"
                  }`}
                />
                <span
                  className={`bg-text absolute left-0 h-px w-5 transition-transform duration-300 ${
                    open ? "top-1.5 -rotate-45" : "top-3"
                  }`}
                />
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Rendered outside <header>: its backdrop-filter would otherwise become
          the containing block for this fixed overlay and clip it. */}
      {open ? (
        <div
          id="mobile-nav"
          className="bg-bg fixed inset-x-0 top-16 bottom-0 z-40 flex flex-col justify-between overflow-y-auto px-6 pt-10 pb-12 md:hidden"
        >
          <nav aria-label="Mobile">
            <ul className="space-y-1">
              {[...links, { href: "/contact", label: "Contact" }].map((link, i) => (
                <li
                  key={link.href}
                  className="animate-rise"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="text-text hover:text-accent flex items-baseline gap-4 py-2 font-sans text-4xl font-semibold tracking-tight transition-colors"
                  >
                    <span className="text-accent-purple font-mono text-xs">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <p className="text-text-muted font-mono text-xs tracking-wider uppercase">
            {siteName}
          </p>
        </div>
      ) : null}
    </>
  );
}
