import Link from "next/link";
import { Footer } from "@/components/layout/footer";
import { Nav } from "@/components/layout/nav";
import { Paragraphs } from "@/components/pages/paragraphs";
import { listPublicWorkOverview } from "@/server/services/projects";
import { listPublicResearchOverview } from "@/server/services/research";
import { listPublicArticlesOverview } from "@/server/services/articles";
import { getPublishedHomePage } from "@/server/services/pages";
import { getPublicSiteSettings } from "@/server/services/settings";
import {
  buildJsonLdGraph,
  buildPersonJsonLd,
  buildWebSiteJsonLd,
  JsonLdScript,
} from "@/lib/structured-data";

// Homepage sections reuse the same public overview services /work, /research,
// and /writing already call — no new database queries. Selection criteria
// per original spec §7: Work and Research are "featured" only, ordered by
// sort_order (not publication date, per §59); Writing is "latest", ordered
// by publish date. A section with nothing to show keeps its own empty
// state rather than inventing fallback content — §D.13 / original spec §38.
//
// Hero copy and the "Currently" section come from the published `home`
// page (Pages CMS) once one exists. Pages are seeded as DRAFTs, so until
// an admin publishes `home` there is nothing published to read — the hero
// then keeps the copy that was already live before Level 8.3 (identical to
// what the seed migrates into the CMS), and no "Currently" section is
// shown, rather than the site regressing or showing seed placeholder text.
export const dynamic = "force-dynamic";
export const revalidate = 0;

const HOMEPAGE_SECTION_LIMIT = 3;

const DEFAULT_HERO = {
  eyebrow: "Super Intelligence Engineer & Entrepreneur",
  headline: "I build intelligent systems for real-world problems.",
  body: "Super Intelligence engineer and entrepreneur focused on intelligent systems, software engineering, emerging technology, and problems at the intersection of technology and society.",
  primaryCta: { label: "Explore my work", href: "/work" },
  secondaryCta: { label: "Read my research", href: "/research" },
} as const;

// The design accents the word "intelligent" in the headline. The CMS
// headline is plain text, so the accent is applied wherever that word
// appears — same look for the fallback and for CMS copy that keeps it.
const HEADLINE_ACCENT = "intelligent";

function Headline({ text }: { text: string }) {
  const idx = text.indexOf(HEADLINE_ACCENT);
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <span className="text-accent-purple">{HEADLINE_ACCENT}</span>
      {text.slice(idx + HEADLINE_ACCENT.length)}
    </>
  );
}

export default async function Home() {
  const [workOverview, researchOverview, articlesOverview, homePage, siteSettings] =
    await Promise.all([
      listPublicWorkOverview(),
      listPublicResearchOverview(),
      listPublicArticlesOverview(),
      getPublishedHomePage(),
      getPublicSiteSettings(),
    ]);

  const socialLinks = [
    siteSettings.socialGithub,
    siteSettings.socialX,
    siteSettings.socialLinkedin,
    siteSettings.socialYoutube,
    siteSettings.socialInstagram,
    siteSettings.socialTiktok,
  ].filter((url): url is string => Boolean(url && url.trim().length > 0));

  const websiteJsonLd = buildWebSiteJsonLd({
    siteName: siteSettings.siteName,
    siteDescription: siteSettings.siteDescription,
  });
  const personJsonLd = buildPersonJsonLd({
    name: siteSettings.siteName,
    socialLinks,
  });
  const homepageJsonLd = buildJsonLdGraph([websiteJsonLd, personJsonLd]);

  const home = homePage?.content ?? null;
  const hero = home
    ? {
        eyebrow: home.heroEyebrow,
        headline: home.heroHeadline,
        body: home.heroBody,
        primaryCta: { label: home.heroPrimaryCtaLabel, href: home.heroPrimaryCtaHref },
        secondaryCta: {
          label: home.heroSecondaryCtaLabel,
          href: home.heroSecondaryCtaHref,
        },
      }
    : DEFAULT_HERO;
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
      <JsonLdScript data={homepageJsonLd} />
      <Nav />

      <main>
        <section className="mx-auto max-w-5xl px-6 py-24 md:py-32">
          <p className="text-accent-purple font-sans text-sm font-medium tracking-wide">
            {hero.eyebrow}
          </p>

          <h1 className="text-text mt-4 max-w-3xl font-sans text-4xl font-semibold tracking-tight md:text-5xl">
            <Headline text={hero.headline} />
          </h1>

          <p className="text-text-muted mt-6 max-w-xl font-serif text-lg">{hero.body}</p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href={hero.primaryCta.href}
              className="rounded-card bg-accent text-bg px-5 py-2.5 font-sans text-sm font-medium transition-opacity hover:opacity-90"
            >
              {hero.primaryCta.label}
            </Link>
            <Link
              href={hero.secondaryCta.href}
              className="rounded-card border-border text-text hover:border-accent hover:text-accent border px-5 py-2.5 font-sans text-sm font-medium transition-colors"
            >
              {hero.secondaryCta.label}
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

        {home ? (
          <section className="mx-auto max-w-5xl px-6 pb-16">
            <h2 className="text-text font-sans text-sm font-medium">Currently</h2>
            <div className="rounded-panel border-border bg-surface mt-4 border p-6">
              <Paragraphs
                text={home.currentFocusSummary}
                className="text-text-muted space-y-3 font-serif text-sm"
              />
            </div>
          </section>
        ) : null}

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
