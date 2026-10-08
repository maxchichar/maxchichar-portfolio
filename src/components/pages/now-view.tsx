import type { NowPageContent } from "@/lib/validation/page";

import { Paragraphs } from "./paragraphs";

const sectionHeadingClass =
  "text-accent-purple font-mono text-[11px] font-medium tracking-[0.18em] uppercase";
const bodyClass =
  "text-text mt-4 space-y-5 font-serif text-lg leading-relaxed md:text-xl";

export function NowView({
  content,
  publishedAt,
}: {
  content: NowPageContent;
  publishedAt: Date | null;
}) {
  return (
    <article className="mx-auto max-w-3xl px-6 py-16 md:py-24">
      <header className="border-border border-b pb-14">
        <p className="animate-rise index-label">
          <span>—</span>
          <span>Now</span>
        </p>
        <h1 className="animate-rise text-text mt-6 font-sans text-[clamp(2.5rem,5.5vw,4.5rem)] leading-[0.98] font-semibold tracking-[-0.03em]">
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

      <section className="reveal mt-16">
        <h2 className={sectionHeadingClass}>Currently building</h2>
        <Paragraphs text={content.currentlyBuilding} className={bodyClass} />
      </section>

      <section className="reveal mt-16">
        <h2 className={sectionHeadingClass}>Currently researching</h2>
        <Paragraphs text={content.researching} className={bodyClass} />
      </section>

      <section className="reveal mt-16">
        <h2 className={sectionHeadingClass}>Currently learning</h2>
        <Paragraphs text={content.learning} className={bodyClass} />
      </section>

      <section className="reveal mt-16">
        <h2 className={sectionHeadingClass}>Current interests</h2>
        <Paragraphs text={content.interests} className={bodyClass} />
      </section>

      <section className="reveal mt-16">
        <h2 className={sectionHeadingClass}>Current thesis</h2>
        <Paragraphs text={content.thesis} className={bodyClass} />
      </section>

      <section className="reveal mt-16">
        <h2 className={sectionHeadingClass}>Recent changes</h2>
        <Paragraphs text={content.recentChanges} className={bodyClass} />
      </section>
    </article>
  );
}
