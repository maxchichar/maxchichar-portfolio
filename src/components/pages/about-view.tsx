import type { AboutPageContent } from "@/lib/validation/page";

import { Paragraphs } from "./paragraphs";

const sectionHeadingClass =
  "text-accent-purple font-sans text-xs font-semibold tracking-wider uppercase";
const bodyClass = "text-text mt-3 space-y-4 font-serif text-base leading-relaxed";

export function AboutView({ content }: { content: AboutPageContent }) {
  return (
    <article className="mx-auto max-w-3xl px-6 py-16 md:py-24">
      <header className="border-border border-b pb-12">
        <p className="text-accent-purple font-sans text-sm font-medium tracking-wide">
          About
        </p>
        <Paragraphs
          text={content.intro}
          className="text-text mt-4 space-y-4 font-sans text-2xl leading-snug font-semibold tracking-tight md:text-3xl"
        />
      </header>

      <section className="mt-12">
        <h2 className={sectionHeadingClass}>Biography</h2>
        <Paragraphs text={content.bio} className={bodyClass} />
      </section>

      <section className="mt-12">
        <h2 className={sectionHeadingClass}>What I build</h2>
        <Paragraphs text={content.whatIBuild} className={bodyClass} />
      </section>

      <section className="mt-12">
        <h2 className={sectionHeadingClass}>How I think</h2>
        <Paragraphs text={content.howIThink} className={bodyClass} />
      </section>

      <section className="mt-12">
        <h2 className={sectionHeadingClass}>Areas of interest</h2>
        <Paragraphs text={content.interests} className={bodyClass} />
      </section>

      <section className="mt-12">
        <h2 className={sectionHeadingClass}>Capabilities</h2>
        <Paragraphs text={content.capabilities} className={bodyClass} />
      </section>

      <section className="mt-12">
        <h2 className={sectionHeadingClass}>Current direction</h2>
        <Paragraphs text={content.direction} className={bodyClass} />
      </section>
    </article>
  );
}
