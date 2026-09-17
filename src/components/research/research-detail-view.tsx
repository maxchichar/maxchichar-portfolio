import Link from "next/link";
import type { schema } from "@/lib/db";
import { tiptapDocToPlainText } from "@/lib/validation/project";
import { RESEARCH_SECTION_KEYS } from "@/lib/validation/research";
import { EvidenceWall } from "@/components/work/evidence-wall";

type ResearchRow = typeof schema.research.$inferSelect;
type ResearchVersionRow = typeof schema.researchVersions.$inferSelect;
type EvidenceRow = typeof schema.evidence.$inferSelect;
type TagRow = typeof schema.tags.$inferSelect;

interface ResearchDetailViewProps {
  research: ResearchRow;
  published: ResearchVersionRow;
  evidence: EvidenceRow[];
  tags: TagRow[];
  coverUrl: string | null;
}

export function ResearchDetailView({
  published,
  evidence,
  tags,
  coverUrl,
}: ResearchDetailViewProps) {
  const sectionsMap = new Map<string, { heading: string; text: string }>();
  const rawSections =
    (published.sections as Array<{
      key: string;
      heading: string;
      content: unknown;
    }> | null) ?? [];
  for (const s of rawSections) {
    const text = tiptapDocToPlainText(s.content).trim();
    if (text.length > 0) {
      sectionsMap.set(s.key, { heading: s.heading, text });
    }
  }

  const renderSection = (key: string) => {
    const section = sectionsMap.get(key);
    if (!section) return null;

    const paragraphs = section.text.split("\n\n");

    return (
      <section key={key} className="mt-12">
        <h2 className="text-accent-purple font-sans text-xs font-semibold tracking-wider uppercase">
          {section.heading}
        </h2>
        <div className="text-text mt-3 space-y-4 font-serif text-base leading-relaxed">
          {paragraphs.map((p, idx) => (
            <p key={idx}>{p}</p>
          ))}
        </div>
      </section>
    );
  };

  return (
    <article className="mx-auto max-w-4xl px-6 py-16 md:py-24">
      {/* Eyebrow & Navigation */}
      <div className="mb-8 flex items-center justify-between">
        <Link
          href="/research"
          className="text-text-muted hover:text-accent font-sans text-sm font-medium transition-colors"
        >
          &larr; Back to Research
        </Link>
        <span className="text-text-muted font-mono text-xs">
          v{published.versionNumber} &middot; Published{" "}
          {published.publishedAt
            ? new Date(published.publishedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
              })
            : ""}
        </span>
      </div>

      {/* Hero Section */}
      <header className="border-border border-b pb-12">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-badge border-border text-accent-purple bg-surface border px-2.5 py-1 font-sans text-xs font-medium">
            {published.type}
          </span>
          {published.category ? (
            <span className="rounded-badge border-border text-text-muted bg-surface border px-2.5 py-1 font-mono text-xs">
              {published.category}
            </span>
          ) : null}
        </div>

        <h1 className="text-text mt-4 font-sans text-4xl font-semibold tracking-tight md:text-5xl">
          {published.title}
        </h1>

        <p className="text-text-muted mt-4 font-serif text-lg leading-relaxed md:text-xl">
          {published.abstract}
        </p>

        {/* Cover Image */}
        {coverUrl ? (
          <div className="rounded-panel border-border mt-8 overflow-hidden border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverUrl}
              alt={published.title}
              className="h-auto max-h-[480px] w-full object-cover"
            />
          </div>
        ) : null}

        {/* Tags */}
        {tags.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span key={tag.id} className="text-text-muted font-mono text-xs">
                #{tag.name}
              </span>
            ))}
          </div>
        ) : null}
      </header>

      {/* Research Sections — RESEARCH_SECTION_KEYS order (validation/research.ts),
          with the structured Exhibits wall placed right after the evidence_narrative
          prose section, mirroring where Projects places its Evidence Wall
          (after the "how it was done" sections, before the outcome sections). */}
      <div className="divide-border/40 divide-y">
        {RESEARCH_SECTION_KEYS.slice(
          0,
          RESEARCH_SECTION_KEYS.indexOf("evidence_narrative") + 1,
        ).map((key) => renderSection(key))}

        {/* Exhibits — the structured Evidence model, deliberately distinct from
            the evidence_narrative prose section above (docs/SPECIFICATION.md). */}
        <EvidenceWall
          items={evidence}
          title="Exhibits"
          description="Verifiable sources, datasets, and empirical artifacts underpinning this research."
        />

        {RESEARCH_SECTION_KEYS.slice(
          RESEARCH_SECTION_KEYS.indexOf("evidence_narrative") + 1,
        ).map((key) => renderSection(key))}
      </div>
    </article>
  );
}
