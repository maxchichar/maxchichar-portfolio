import Link from "next/link";
import { Footer } from "@/components/layout/footer";
import { Nav } from "@/components/layout/nav";
import { listPublicWorkOverview } from "@/server/services/projects";
import { listPublicResearchOverview } from "@/server/services/research";
import { listPublicArticlesOverview } from "@/server/services/articles";

// Homepage sections reuse the same public overview services /work, /research,
// and /writing already call — no new database queries. Selection criteria
// per original spec §7: Work and Research are "featured" only, ordered by
// sort_order (not publication date, per §59); Writing is "latest", ordered
// by publish date. A section with nothing to show keeps its own empty
// state rather than inventing fallback content — §D.13 / original spec §38.
export const dynamic = "force-dynamic";
export const revalidate = 0;

const HOMEPAGE_SECTION_LIMIT = 3;

export default async function Home() {
  const [workOverview, researchOverview, articlesOverview] = await Promise.all([
    listPublicWorkOverview(),
    listPublicResearchOverview(),
    listPublicArticlesOverview(),
  ]);

  const featuredWork = workOverview
    .filter(({ project }) => project.featured)
    .sort((a, b) => a.project.sortOrder - b.project.sortOrder)
    .slice(0, HOMEPAGE_SECTION_LIMIT);

  const featuredResearch = researchOverview
    .filter(({ research }) => research.featured)
    .sort((a, b) => a.research.sortOrder - b.research.sortOrder)
    .slice(0, HOMEPAGE_SECTION_LIMIT);

  const latestWriting = [...articlesOverview]
    .sort((a, b) => {
      const aTime = a.published.publishedAt
        ? new Date(a.published.publishedAt).getTime()
        : 0;
      const bTime = b.published.publishedAt
        ? new Date(b.published.publishedAt).getTime()
        : 0;
      return bTime - aTime;
    })
    .slice(0, HOMEPAGE_SECTION_LIMIT);

  return (
    <>
      <Nav />

      <main>
        <section className="mx-auto max-w-5xl px-6 py-24 md:py-32">
          <p className="text-accent-purple font-sans text-sm font-medium tracking-wide">
            AI-Native Engineer &amp; Entrepreneur
          </p>

          <h1 className="text-text mt-4 max-w-3xl font-sans text-4xl font-semibold tracking-tight md:text-5xl">
            I build <span className="text-accent-purple">intelligent</span> systems for
            real-world problems.
          </h1>

          <p className="text-text-muted mt-6 max-w-xl font-serif text-lg">
            AI-native engineer and entrepreneur focused on AI systems, software
            engineering, emerging technology, and problems at the intersection of
            technology and society.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/work"
              className="rounded-card bg-accent text-bg px-5 py-2.5 font-sans text-sm font-medium transition-opacity hover:opacity-90"
            >
              Explore my work
            </Link>
            <Link
              href="/research"
              className="rounded-card border-border text-text hover:border-accent hover:text-accent border px-5 py-2.5 font-sans text-sm font-medium transition-colors"
            >
              Read my research
            </Link>
          </div>
        </section>

        <HomeSection
          title="Selected Work"
          emptyBody="Work is being documented."
          viewAllHref="/work"
          viewAllLabel="View all work"
        >
          {featuredWork.map(({ project, published }) => (
            <HomeCard
              key={project.id}
              href={`/work/${project.slug}`}
              title={published.title}
              body={published.shortDescription}
            />
          ))}
        </HomeSection>

        <HomeSection
          title="Research"
          emptyBody="Research is being documented."
          viewAllHref="/research"
          viewAllLabel="View all research"
        >
          {featuredResearch.map(({ research, published }) => (
            <HomeCard
              key={research.id}
              href={`/research/${research.slug}`}
              title={published.title}
              body={published.abstract}
            />
          ))}
        </HomeSection>

        <HomeSection
          title="Writing"
          emptyBody="Writing is being documented."
          viewAllHref="/writing"
          viewAllLabel="View all writing"
        >
          {latestWriting.map(({ article, published }) => (
            <HomeCard
              key={article.id}
              href={`/writing/${article.slug}`}
              title={published.title}
              body={published.excerpt}
            />
          ))}
        </HomeSection>
      </main>

      <Footer />
    </>
  );
}

function HomeSection({
  title,
  emptyBody,
  viewAllHref,
  viewAllLabel,
  children,
}: {
  title: string;
  emptyBody: string;
  viewAllHref: string;
  viewAllLabel: string;
  children: React.ReactNode;
}) {
  const hasItems = Array.isArray(children) ? children.length > 0 : Boolean(children);

  return (
    <section className="mx-auto max-w-5xl px-6 pb-16">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-text font-sans text-sm font-medium">{title}</h2>
        {hasItems ? (
          <Link
            href={viewAllHref}
            className="text-accent font-sans text-xs font-medium hover:underline"
          >
            {viewAllLabel} &rarr;
          </Link>
        ) : null}
      </div>

      {hasItems ? (
        <div className="grid gap-4 md:grid-cols-3">{children}</div>
      ) : (
        <div className="rounded-panel border-border bg-surface border p-6">
          <p className="text-text-muted font-serif text-sm">{emptyBody}</p>
        </div>
      )}
    </section>
  );
}

function HomeCard({ href, title, body }: { href: string; title: string; body: string }) {
  return (
    <Link
      href={href}
      className="rounded-panel border-border bg-surface hover:border-accent/40 block border p-6 transition-colors"
    >
      <h3 className="text-text font-sans text-sm font-medium">{title}</h3>
      <p className="text-text-muted mt-2 line-clamp-3 font-serif text-sm">{body}</p>
    </Link>
  );
}
