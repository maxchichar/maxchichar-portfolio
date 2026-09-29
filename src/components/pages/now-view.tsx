import type { NowPageContent } from "@/lib/validation/page";

import { Paragraphs } from "./paragraphs";

const sectionHeadingClass =
  "text-accent-purple font-sans text-xs font-semibold tracking-wider uppercase";
const bodyClass = "text-text mt-3 space-y-4 font-serif text-base leading-relaxed";

export function NowView({
  content,
  publishedAt,
}: {
  content: NowPageContent;
  publishedAt: Date | null;
}) {
  return (
    <article className="mx-auto max-w-3xl px-6 py-16 md:py-24">
      <header className="border-border border-b pb-12">
        <p className="text-accent-purple font-sans text-sm font-medium tracking-wide">
          Now
        </p>
        <h1 className="text-text mt-2 font-sans text-3xl font-semibold tracking-tight md:text-4xl">
          What I&apos;m focused on right now.
        </h1>
        {/* "Last updated" isn't a stored field — it's the published
            version's own timestamp, so it can't drift from reality. */}
        {publishedAt ? (
          <p className="text-text-muted mt-4 font-mono text-xs">
            Last updated{" "}
            {new Date(publishedAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        ) : null}
      </header>

      <section className="mt-12">
        <h2 className={sectionHeadingClass}>Currently building</h2>
        <Paragraphs text={content.currentlyBuilding} className={bodyClass} />
      </section>

      <section className="mt-12">
        <h2 className={sectionHeadingClass}>Currently researching</h2>
        <Paragraphs text={content.researching} className={bodyClass} />
      </section>

      <section className="mt-12">
        <h2 className={sectionHeadingClass}>Currently learning</h2>
        <Paragraphs text={content.learning} className={bodyClass} />
      </section>

      <section className="mt-12">
        <h2 className={sectionHeadingClass}>Current interests</h2>
        <Paragraphs text={content.interests} className={bodyClass} />
      </section>

      <section className="mt-12">
        <h2 className={sectionHeadingClass}>Current thesis</h2>
        <Paragraphs text={content.thesis} className={bodyClass} />
      </section>

      <section className="mt-12">
        <h2 className={sectionHeadingClass}>Recent changes</h2>
        <Paragraphs text={content.recentChanges} className={bodyClass} />
      </section>
    </article>
  );
}
