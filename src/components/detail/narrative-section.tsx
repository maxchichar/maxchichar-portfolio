import { RichText } from "@/components/rich-text";

/**
 * One numbered section of a case study / research write-up. The "failure"
 * tone is visually distinguished with a muted left border (spec: not an
 * accent colour) and an elevated surface, so it reads as a deliberate
 * post-mortem rather than a footnote.
 */
export function NarrativeSection({
  id,
  number,
  heading,
  doc,
  tone = "default",
}: {
  id: string;
  number: string;
  heading: string;
  doc: unknown;
  tone?: "default" | "failure" | "lead";
}) {
  if (tone === "failure") {
    return (
      <section id={id} className="reveal scroll-mt-28 py-12 md:py-16">
        <div className="rounded-panel bg-surface border-text-muted/40 border-l-2 p-7 md:p-10">
          <p className="index-label">
            <span>{number}</span>
            <span>Post-mortem</span>
          </p>
          <h2 className="text-h3 text-text mt-4 font-sans font-semibold">{heading}</h2>
          <RichText doc={doc} idPrefix={`${id}-`} className="rich-text mt-6" />
        </div>
      </section>
    );
  }

  return (
    <section
      id={id}
      className="border-border reveal scroll-mt-28 border-t py-12 first:border-t-0 first:pt-0 md:py-16"
    >
      <h2 className="text-h3 text-text flex items-baseline gap-4 font-sans font-semibold">
        <span className="text-accent-purple font-mono text-xs font-normal tabular-nums">
          {number}
        </span>
        {heading}
      </h2>
      <RichText
        doc={doc}
        idPrefix={`${id}-`}
        className={tone === "lead" ? "rich-text rich-text-lead mt-6" : "rich-text mt-6"}
      />
    </section>
  );
}
