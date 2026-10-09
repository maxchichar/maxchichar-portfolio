import Link from "next/link";

import { Footer } from "@/components/layout/footer";
import { Nav } from "@/components/layout/nav";
import { SplitText } from "@/components/motion/split-text";
import { PageTransition } from "@/components/motion/page-transition";

export default function NotFound() {
  return (
    <>
      <Nav />
      <PageTransition>
        <main className="container-site relative flex min-h-[70svh] flex-col justify-center overflow-hidden py-24">
          <p
            aria-hidden="true"
            className="text-text/[0.04] pointer-events-none absolute -right-4 bottom-0 font-sans text-[clamp(10rem,32vw,28rem)] leading-none font-extrabold tracking-[-0.06em] select-none"
          >
            404
          </p>
          <p className="index-label animate-rise">
            <span>404</span>
            <span>Page not found</span>
          </p>
          <h1 className="text-h1 text-text relative mt-6 max-w-3xl font-sans font-semibold text-balance">
            <SplitText text="This page took a different path." baseDelay={80} />
          </h1>
          <p
            className="text-lede text-text-muted animate-rise relative mt-6 max-w-xl font-serif"
            style={{ animationDelay: "300ms" }}
          >
            The link may be outdated, or the page may have moved. Here are some places to
            pick up from.
          </p>
          <nav
            aria-label="Suggested pages"
            className="animate-rise relative mt-10 flex flex-wrap gap-3"
            style={{ animationDelay: "420ms" }}
          >
            <Link
              href="/"
              className="bg-text text-bg hover:bg-accent rounded-full px-6 py-3 font-sans text-sm font-medium transition-colors"
            >
              Back home
            </Link>
            {[
              { href: "/work", label: "Work" },
              { href: "/research", label: "Research" },
              { href: "/writing", label: "Writing" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="border-border text-text hover:border-accent hover:text-accent rounded-full border px-6 py-3 font-sans text-sm transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </main>
      </PageTransition>
      <Footer />
    </>
  );
}
