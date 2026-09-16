import type { Metadata } from "next";
import Link from "next/link";

import { Footer } from "@/components/layout/footer";
import { Nav } from "@/components/layout/nav";
import { listPublicWorkOverview } from "@/server/services/projects";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Selected Work — CHIBUEZE MAXWELL",
  description:
    "AI-Native Engineer & Entrepreneur — Selected projects, intelligent systems, and engineering case studies.",
};

export default async function WorkListingPage() {
  const items = await listPublicWorkOverview();

  return (
    <>
      <Nav />

      <main className="mx-auto max-w-5xl px-6 py-16 md:py-24">
        {/* Page Eyebrow & Title */}
        <section className="mb-16">
          <p className="text-accent-purple font-sans text-sm font-medium tracking-wide">
            Selected Work
          </p>
          <h1 className="text-text mt-2 font-sans text-3xl font-semibold tracking-tight md:text-4xl">
            Case studies, production systems, and verifiable engineering proof.
          </h1>
          <p className="text-text-muted mt-4 max-w-2xl font-serif text-base">
            Evidence over claims. Every project details problem formulation, architecture,
            empirical results, and explicit post-mortems of what failed.
          </p>
        </section>

        {/* Projects Grid or Locked Empty State */}
        {items.length > 0 ? (
          <div className="grid gap-8 md:grid-cols-2">
            {items.map(({ project, published, coverUrl }) => (
              <article
                key={project.id}
                className="rounded-panel border-border bg-surface hover:border-border/80 flex flex-col justify-between overflow-hidden border transition-colors"
              >
                <div>
                  {coverUrl ? (
                    <div className="border-border bg-bg/50 aspect-video w-full overflow-hidden border-b">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={coverUrl}
                        alt={published.title}
                        className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                      />
                    </div>
                  ) : null}

                  <div className="p-6">
                    <div className="flex flex-wrap items-center gap-2">
                      {published.category ? (
                        <span className="rounded-badge border-border text-accent-purple bg-bg/50 border px-2 py-0.5 font-sans text-xs font-medium">
                          {published.category}
                        </span>
                      ) : null}
                      {published.year ? (
                        <span className="rounded-badge border-border text-text-muted bg-bg/50 border px-2 py-0.5 font-mono text-xs">
                          {published.year}
                        </span>
                      ) : null}
                    </div>

                    <h2 className="text-text mt-3 font-sans text-xl font-semibold tracking-tight">
                      <Link
                        href={`/work/${project.slug}`}
                        className="hover:text-accent transition-colors"
                      >
                        {published.title}
                      </Link>
                    </h2>

                    <p className="text-text-muted mt-3 line-clamp-3 font-serif text-sm leading-relaxed">
                      {published.shortDescription}
                    </p>
                  </div>
                </div>

                <div className="border-border flex flex-wrap items-center justify-between gap-4 border-t p-6">
                  {(() => {
                    const techs = published.technologies ?? [];
                    if (techs.length === 0) return <div />;
                    return (
                      <div className="flex flex-wrap gap-1.5">
                        {techs.slice(0, 3).map((tech) => (
                          <span
                            key={tech}
                            className="rounded-badge border-border text-text-muted bg-bg/50 border px-2 py-0.5 font-mono text-xs"
                          >
                            {tech}
                          </span>
                        ))}
                        {techs.length > 3 ? (
                          <span className="text-text-muted self-center font-mono text-xs">
                            +{techs.length - 3}
                          </span>
                        ) : null}
                      </div>
                    );
                  })()}

                  <Link
                    href={`/work/${project.slug}`}
                    className="text-accent font-sans text-xs font-medium hover:underline"
                  >
                    Read Case Study &rarr;
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-panel border-border bg-surface border p-8">
            <h2 className="text-text font-sans text-base font-semibold">Selected Work</h2>
            <p className="text-text-muted mt-2 font-serif text-sm">
              Work is being documented.
            </p>
          </div>
        )}
      </main>

      <Footer />
    </>
  );
}
