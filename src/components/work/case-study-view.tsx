import Link from "next/link";
import type { schema } from "@/lib/db";
import { tiptapDocToPlainText } from "@/lib/validation/project";
import { EvidenceWall } from "./evidence-wall";

type ProjectRow = typeof schema.projects.$inferSelect;
type ProjectVersionRow = typeof schema.projectVersions.$inferSelect;
type EvidenceRow = typeof schema.evidence.$inferSelect;

type TagRow = typeof schema.tags.$inferSelect;

interface CaseStudyViewProps {
  project: ProjectRow;
  published: ProjectVersionRow;
  evidence: EvidenceRow[];
  tags: TagRow[];
  coverUrl: string | null;
}

export function CaseStudyView({
  published,
  evidence,
  tags,
  coverUrl,
}: CaseStudyViewProps) {
  // Extract section maps
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

  const renderSection = (key: string, isFailure = false) => {
    const section = sectionsMap.get(key);
    if (!section) return null;

    const paragraphs = section.text.split("\n\n");

    if (isFailure) {
      return (
        <section
          key={key}
          className="rounded-r-card border-border bg-surface/50 my-10 border-l-2 p-6"
        >
          <h2 className="text-text-muted font-sans text-xs font-semibold tracking-wider uppercase">
            {section.heading || "What Failed"}
          </h2>
          <div className="text-text-muted mt-3 space-y-4 font-serif text-base leading-relaxed">
            {paragraphs.map((p, idx) => (
              <p key={idx}>{p}</p>
            ))}
          </div>
        </section>
      );
    }

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
          href="/work"
          className="text-text-muted hover:text-accent font-sans text-sm font-medium transition-colors"
        >
          &larr; Back to Work
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
          {published.category ? (
            <span className="rounded-badge border-border text-accent-purple bg-surface border px-2.5 py-1 font-sans text-xs font-medium">
              {published.category}
            </span>
          ) : null}
          {published.year ? (
            <span className="rounded-badge border-border text-text-muted bg-surface border px-2.5 py-1 font-mono text-xs">
              {published.year}
            </span>
          ) : null}
        </div>

        <h1 className="text-text mt-4 font-sans text-4xl font-semibold tracking-tight md:text-5xl">
          {published.title}
        </h1>

        <p className="text-text-muted mt-4 font-serif text-lg leading-relaxed md:text-xl">
          {published.shortDescription}
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

        {/* Technologies & External Links */}
        {(() => {
          const techs = published.technologies ?? [];
          return (
            <div className="mt-8 flex flex-wrap items-center justify-between gap-6">
              {techs.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-text-muted mr-1 font-sans text-xs">
                    Built with:
                  </span>
                  {techs.map((tech) => (
                    <span
                      key={tech}
                      className="rounded-badge border-border text-text bg-surface/70 border px-2 py-0.5 font-mono text-xs"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              ) : (
                <div />
              )}

              <div className="flex flex-wrap items-center gap-4">
                {published.githubUrl ? (
                  <a
                    href={published.githubUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-card border-border text-text hover:border-accent hover:text-accent border px-3 py-1.5 font-sans text-xs font-medium transition-colors"
                  >
                    GitHub &rarr;
                  </a>
                ) : null}
                {published.liveUrl ? (
                  <a
                    href={published.liveUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-card bg-accent text-bg px-3 py-1.5 font-sans text-xs font-medium transition-opacity hover:opacity-90"
                  >
                    Live System &rarr;
                  </a>
                ) : null}
                {published.documentationUrl ? (
                  <a
                    href={published.documentationUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-card border-border text-text hover:border-accent hover:text-accent border px-3 py-1.5 font-sans text-xs font-medium transition-colors"
                  >
                    Docs &rarr;
                  </a>
                ) : null}
              </div>
            </div>
          );
        })()}

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

      {/* Case Study Sections in Proof Architecture Order */}
      <div className="divide-border/40 divide-y">
        {renderSection("problem")}
        {renderSection("context")}
        {renderSection("why_it_matters")}
        {renderSection("hypothesis")}
        {renderSection("approach")}
        {renderSection("architecture")}
        {renderSection("implementation")}
        {renderSection("experiments")}

        {/* Evidence Wall */}
        <EvidenceWall items={evidence} />

        {renderSection("results")}
        {renderSection("failures", true)}
        {renderSection("tradeoffs")}
        {renderSection("lessons")}
        {renderSection("limitations")}
        {renderSection("future_work")}
      </div>
    </article>
  );
}
