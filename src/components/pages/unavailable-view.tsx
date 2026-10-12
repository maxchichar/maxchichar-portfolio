import Link from "next/link";

import { PageIntro } from "@/components/layout/page-intro";

/**
 * Shown in place of a CMS page whose content couldn't be loaded (for example
 * when the database is unreachable): the visitor keeps the navigation, a way
 * to retry and a way to get in touch, instead of an error screen.
 */
export function UnavailableView({ eyebrow, path }: { eyebrow: string; path: string }) {
  return (
    <div className="container-site pt-16 md:pt-24">
      <PageIntro eyebrow={eyebrow} title="This page is taking a short break.">
        <p>
          It couldn&apos;t be loaded right now. Please try again in a few minutes, or get
          in touch in the meantime.
        </p>
      </PageIntro>
      <div className="flex flex-wrap items-center gap-4">
        <a
          href={path}
          className="bg-text text-bg hover:bg-accent inline-flex items-center gap-2 rounded-full px-6 py-3 font-sans text-sm font-medium transition-colors"
        >
          Try again
        </a>
        <Link
          href="/contact"
          className="border-border text-text hover:border-accent hover:text-accent inline-flex items-center gap-2 rounded-full border px-6 py-3 font-sans text-sm font-medium transition-colors"
        >
          Get in touch
        </Link>
      </div>
    </div>
  );
}
