import { DetailHero, type HeroAction } from "@/components/detail/detail-hero";
import { NarrativeSection } from "@/components/detail/narrative-section";
import { NextUp } from "@/components/detail/next-up";
import { Toc } from "@/components/detail/toc";
import type { schema } from "@/lib/db";
import { tiptapDocToPlainText } from "@/lib/validation/project";

import { EvidenceWall } from "./evidence-wall";

type ProjectRow = typeof schema.projects.$inferSelect;
type ProjectVersionRow = typeof schema.projectVersions.$inferSelect;
type EvidenceRow = typeof schema.evidence.$inferSelect & { mediaUrl?: string | null };
type TagRow = typeof schema.tags.$inferSelect;

// Proof-architecture order (docs/SPECIFICATION.md). The Evidence Wall sits
// between Experiments and Results; "failures" renders as a post-mortem.
const BEFORE_EVIDENCE = [
  "problem",
  "context",
  "why_it_matters",
  "hypothesis",
  "approach",
  "architecture",
  "implementation",
  "experiments",
] as const;
const AFTER_EVIDENCE = [
  "results",
  "failures",
  "tradeoffs",
  "lessons",
  "limitations",
  "future_work",
] as const;

interface NextProject {
  slug: string;
  title: string;
  body: string;
  coverUrl: string | null;
}

export function CaseStudyView({
  project,
  published,
  evidence,
  tags,
  coverUrl,
  next,
}: {
  project: ProjectRow;
  published: ProjectVersionRow;
  evidence: EvidenceRow[];
  tags: TagRow[];
  coverUrl: string | null;
  next: NextProject | null;
}) {
  // Only sections with real content render — empty keys are omitted entirely.
  const sections = new Map<string, { heading: string; content: unknown }>();
  for (const s of (published.sections as
    { key: string; heading: string; content: unknown }[] | null) ?? []) {
    if (tiptapDocToPlainText(s.content).trim().length > 0) {
      sections.set(s.key, { heading: s.heading, content: s.content });
    }
  }

  type Block =
    | { kind: "section"; key: string; heading: string; content: unknown }
    | { kind: "evidence" };
  const blocks: Block[] = [];
  for (const key of BEFORE_EVIDENCE) {
    const s = sections.get(key);
    if (s) blocks.push({ kind: "section", key, ...s });
  }
  if (evidence.length > 0) blocks.push({ kind: "evidence" });
  for (const key of AFTER_EVIDENCE) {
    const s = sections.get(key);
    if (s) blocks.push({ kind: "section", key, ...s });
  }

  const num = (i: number) => String(i + 1).padStart(2, "0");
  const toc = blocks.map((b, i) =>
    b.kind === "evidence"
      ? { id: "evidence", label: "Evidence Wall", number: num(i) }
      : { id: b.key, label: b.heading, number: num(i) },
  );

  const actions: HeroAction[] = [];
  if (published.liveUrl)
    actions.push({ label: "Live system", href: published.liveUrl, primary: true });
  if (published.githubUrl) actions.push({ label: "Source", href: published.githubUrl });
  if (published.documentationUrl)
    actions.push({ label: "Docs", href: published.documentationUrl });

  const techs = published.technologies ?? [];

  return (
    <article>
      <DetailHero
        backHref="/work"
        backLabel="All work"
        eyebrow={["Case study", ...(published.category ? [published.category] : [])]}
        title={published.title}
        lede={published.shortDescription}
        facts={[
          { label: "Year", value: published.year ? String(published.year) : null },
          { label: "Discipline", value: published.category },
          {
            label: "Stack",
            value: techs.length > 0 ? techs.slice(0, 4).join(" · ") : null,
          },
          {
            label: "Published",
            value: published.publishedAt
              ? new Date(published.publishedAt).toLocaleDateString("en-US", {
                  month: "short",
                  year: "numeric",
                })
              : null,
          },
        ]}
        actions={actions}
        coverUrl={coverUrl}
        coverAlt={published.title}
        coverTransitionName={`cover-work-${project.slug}`}
      />

      {blocks.length > 0 ? (
        <div className="container-site mt-20 grid gap-12 md:mt-28 lg:grid-cols-12">
          <aside className="lg:col-span-3">
            <Toc items={toc} />
          </aside>
          <div className="lg:col-span-8 lg:col-start-5">
            {blocks.map((b, i) =>
              b.kind === "evidence" ? (
                <EvidenceWall key="evidence" items={evidence} number={num(i)} />
              ) : (
                <NarrativeSection
                  key={b.key}
                  id={b.key}
                  number={num(i)}
                  heading={b.heading}
                  doc={b.content}
                  tone={b.key === "failures" ? "failure" : "default"}
                />
              ),
            )}

            {techs.length > 0 || tags.length > 0 ? (
              <div className="border-border mt-4 border-t pt-10">
                {techs.length > 0 ? (
                  <>
                    <p className="text-eyebrow text-text-muted font-mono uppercase">
                      Built with
                    </p>
                    <ul className="mt-4 flex flex-wrap gap-2">
                      {techs.map((t) => (
                        <li
                          key={t}
                          className="border-border text-text rounded-full border px-3 py-1 font-mono text-xs"
                        >
                          {t}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
                {tags.length > 0 ? (
                  <p className="text-text-muted mt-6 font-mono text-xs">
                    {tags.map((t) => `#${t.name}`).join("  ")}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {next ? (
        <NextUp
          label="Next case study"
          title={next.title}
          body={next.body}
          href={`/work/${next.slug}`}
          coverUrl={next.coverUrl}
        />
      ) : null}
    </article>
  );
}
