import { DetailHero } from "@/components/detail/detail-hero";
import { NarrativeSection } from "@/components/detail/narrative-section";
import { NextUp } from "@/components/detail/next-up";
import { Toc } from "@/components/detail/toc";
import { EvidenceWall } from "@/components/work/evidence-wall";
import type { schema } from "@/lib/db";
import { tiptapDocToPlainText } from "@/lib/validation/project";
import { RESEARCH_SECTION_KEYS } from "@/lib/validation/research";

type ResearchRow = typeof schema.research.$inferSelect;
type ResearchVersionRow = typeof schema.researchVersions.$inferSelect;
type EvidenceRow = typeof schema.evidence.$inferSelect & { mediaUrl?: string | null };
type TagRow = typeof schema.tags.$inferSelect;

interface NextResearch {
  slug: string;
  title: string;
  body: string;
  coverUrl: string | null;
}

export function ResearchDetailView({
  research,
  published,
  evidence,
  tags,
  coverUrl,
  next,
}: {
  research: ResearchRow;
  published: ResearchVersionRow;
  evidence: EvidenceRow[];
  tags: TagRow[];
  coverUrl: string | null;
  next: NextResearch | null;
}) {
  const sections = new Map<string, { heading: string; content: unknown }>();
  for (const s of (published.sections as
    { key: string; heading: string; content: unknown }[] | null) ?? []) {
    if (tiptapDocToPlainText(s.content).trim().length > 0) {
      sections.set(s.key, { heading: s.heading, content: s.content });
    }
  }

  // Section order follows RESEARCH_SECTION_KEYS; the structured Exhibits wall
  // sits right after the evidence_narrative prose, mirroring where Projects
  // places its Evidence Wall (docs/SPECIFICATION.md).
  type Block =
    | { kind: "section"; key: string; heading: string; content: unknown }
    | { kind: "exhibits" };
  const blocks: Block[] = [];
  for (const key of RESEARCH_SECTION_KEYS) {
    const s = sections.get(key);
    if (s) blocks.push({ kind: "section", key, ...s });
    if (key === "evidence_narrative" && evidence.length > 0) {
      blocks.push({ kind: "exhibits" });
    }
  }

  const num = (i: number) => String(i + 1).padStart(2, "0");
  const toc = blocks.map((b, i) =>
    b.kind === "exhibits"
      ? { id: "exhibits", label: "Exhibits", number: num(i) }
      : { id: b.key, label: b.heading, number: num(i) },
  );

  return (
    <article>
      <DetailHero
        backHref="/research"
        backLabel="All research"
        eyebrow={[published.type, ...(published.category ? [published.category] : [])]}
        title={published.title}
        lede={published.abstract}
        facts={[
          { label: "Type", value: published.type },
          { label: "Field", value: published.category },
          {
            label: "Exhibits",
            value: evidence.length > 0 ? String(evidence.length) : null,
          },
          {
            label: "Published",
            value: published.publishedAt
              ? new Date(published.publishedAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })
              : null,
          },
          { label: "Version", value: `v${published.versionNumber}` },
        ]}
        coverUrl={coverUrl}
        coverAlt={published.title}
        coverTransitionName={`cover-research-${research.slug}`}
      />

      {blocks.length > 0 ? (
        <div className="container-site mt-20 grid gap-12 md:mt-28 lg:grid-cols-12">
          <aside className="lg:col-span-3">
            <Toc items={toc} title="Contents" />
          </aside>
          <div className="lg:col-span-8 lg:col-start-5">
            {blocks.map((b, i) =>
              b.kind === "exhibits" ? (
                <EvidenceWall
                  key="exhibits"
                  id="exhibits"
                  number={num(i)}
                  items={evidence}
                  title="Exhibits"
                  description="Verifiable sources, datasets, and empirical artifacts underpinning this research."
                />
              ) : (
                <NarrativeSection
                  key={b.key}
                  id={b.key}
                  number={num(i)}
                  heading={b.heading}
                  doc={b.content}
                  tone={b.key === "research_question" ? "lead" : "default"}
                />
              ),
            )}
            {tags.length > 0 ? (
              <p className="border-border text-text-muted mt-4 border-t pt-10 font-mono text-xs">
                {tags.map((t) => `#${t.name}`).join("  ")}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {next ? (
        <NextUp
          label="Next research"
          title={next.title}
          body={next.body}
          href={`/research/${next.slug}`}
          coverUrl={next.coverUrl}
        />
      ) : null}
    </article>
  );
}
