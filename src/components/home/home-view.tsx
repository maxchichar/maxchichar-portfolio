import Link from "next/link";
import { ViewTransition } from "react";

import { selectHomepageWork } from "@/lib/home-work";
import { Hero } from "@/components/home/hero";
import { Footer } from "@/components/layout/footer";
import { Nav } from "@/components/layout/nav";
import { Paragraphs } from "@/components/pages/paragraphs";
import { listPublicWorkOverview } from "@/server/services/projects";
import { listPublicResearchOverview } from "@/server/services/research";
import { listPublicArticlesOverview } from "@/server/services/articles";
import type { HomePageContent } from "@/lib/validation/page";
import { getPublishedHomePage } from "@/server/services/pages";
import { getPublicSiteSettings } from "@/server/services/settings";
import { readOrFallback } from "@/server/services/fallback-read";
import { getFeaturedTestimonials } from "@/server/services/testimonials";
import {
  buildJsonLdGraph,
  buildPersonJsonLd,
  buildWebSiteJsonLd,
  JsonLdScript,
} from "@/lib/structured-data";
import { PageTransition } from "@/components/motion/page-transition";
import { MediaImage } from "@/components/media-image";
import { TestimonialsShowcase } from "@/components/testimonials/testimonials";

// Homepage sections reuse the same public overview services /work, /research,
// and /writing already call — no new database queries.
// Work keeps featured projects first and fills remaining slots with recently
// published work. Research is featured-only; Writing is ordered by publish date.
//
// Hero copy and the "Currently" section come from the published `home`
// page (Pages CMS) once one exists. Pages are seeded as DRAFTs, so until
// an admin publishes `home` there is nothing published to read — the hero
// then keeps the copy that was already live before Level 8.3 (identical to
// what the seed migrates into the CMS), and no "Currently" section is
// shown, rather than the site regressing or showing seed placeholder text.
const HOMEPAGE_SECTION_LIMIT = 3;

const DEFAULT_HERO = {
  eyebrow: "AI Engineer · Entrepreneur · Researcher",
  headline: "I build intelligent systems for real-world problems.",
  body: "I explore how technology, ideas, and institutions shape the world through engineering, research, entrepreneurship, and writing.",
  primaryCta: { label: "Explore my work", href: "/work" },
  secondaryCta: { label: "Read my research", href: "/research" },
} as const;

const UNAVAILABLE = "This section couldn't be loaded right now. Please check back soon.";

/**
 * The homepage. `content` is the home page's CMS content: omitted on the
 * live site (the published version is loaded), or a draft when previewing.
 */
export async function HomeView({ content }: { content?: HomePageContent | null } = {}) {
  // Settings and testimonials already fall back on their own; the rest are
  // guarded here so one failed read can't take the whole page down.
  const [work, research, articles, homeContent, siteSettings, testimonials] =
    await Promise.all([
      readOrFallback("/", "work", listPublicWorkOverview(), []),
      readOrFallback("/", "research", listPublicResearchOverview(), []),
      readOrFallback("/", "writing", listPublicArticlesOverview(), []),
      content === undefined
        ? readOrFallback(
            "/",
            "home page content",
            getPublishedHomePage().then((p) => p?.content ?? null),
            null,
          )
        : { value: content, failed: false },
      getPublicSiteSettings(),
      getFeaturedTestimonials(),
    ]);
  const workOverview = work.value;
  const researchOverview = research.value;
  const articlesOverview = articles.value;
  const home = homeContent.value;

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
  const homepageWork = selectHomepageWork(workOverview, HOMEPAGE_SECTION_LIMIT);

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

  // Section index markers (01, 02, …) — "Currently" only exists once the
  // home page is published, so the numbering is derived, not hard-coded.
  const sections = [
    "work",
    ...(testimonials.length > 0 ? ["words"] : []),
    "research",
    ...(home ? ["currently"] : []),
    "writing",
  ];
  const indexOf = (key: string) => String(sections.indexOf(key) + 1).padStart(2, "0");

  return (
    <>
      <JsonLdScript data={homepageJsonLd} />
      <Nav overlay overlayDark={Boolean(siteSettings.heroImage)} />

      <PageTransition>
        <main>
          <Hero hero={hero} image={siteSettings.heroImage} name={siteSettings.siteName} />

          <div id="main-content" className="scroll-mt-16" />

          <HomeSection
            index={indexOf("work")}
            eyebrow="Selected Work"
            title="Systems built, shipped, and measured."
            emptyBody={work.failed ? UNAVAILABLE : "Work is being documented."}
            viewAllHref="/work"
            viewAllLabel="All work"
            hasItems={homepageWork.length > 0}
          >
            <div className="grid gap-x-6 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
              {homepageWork.map(({ project, published, coverUrl }, i) => (
                <WorkCard
                  key={project.id}
                  href={`/work/${project.slug}`}
                  transitionName={`cover-work-${project.slug}`}
                  title={published.title}
                  body={published.shortDescription}
                  coverUrl={coverUrl}
                  meta={[
                    published.category,
                    published.year ? String(published.year) : null,
                  ]}
                  number={i + 1}
                />
              ))}
            </div>
          </HomeSection>

          {testimonials.length > 0 ? (
            <section className="container-site py-20 md:py-28">
              <div className="reveal mb-10 grid gap-6 md:mb-4 md:grid-cols-12">
                <p className="index-label md:col-span-3 md:pt-3">
                  <span>{indexOf("words")}</span>
                  <span>Kind words</span>
                </p>
              </div>
              <TestimonialsShowcase items={testimonials} />
            </section>
          ) : null}

          <HomeSection
            index={indexOf("research")}
            eyebrow="Research"
            title="Questions worth answering properly."
            emptyBody={research.failed ? UNAVAILABLE : "Research is being documented."}
            viewAllHref="/research"
            viewAllLabel="All research"
            hasItems={featuredResearch.length > 0}
          >
            <ul className="border-border border-t">
              {featuredResearch.map(({ research, published }) => (
                <IndexRow
                  key={research.id}
                  href={`/research/${research.slug}`}
                  title={published.title}
                  body={published.abstract}
                />
              ))}
            </ul>
          </HomeSection>

          {home ? (
            <section className="container-site py-20 md:py-28">
              <div className="reveal rounded-panel border-border bg-surface relative overflow-hidden border p-8 md:p-14">
                <div
                  aria-hidden="true"
                  className="hero-wash absolute inset-0 opacity-60"
                />
                <div className="relative grid gap-8 md:grid-cols-12">
                  <p className="index-label md:col-span-3">
                    <span>{indexOf("currently")}</span>
                    <span>Currently</span>
                  </p>
                  <Paragraphs
                    text={home.currentFocusSummary}
                    className="text-text space-y-4 font-serif text-2xl leading-snug md:col-span-9 md:text-3xl"
                  />
                </div>
              </div>
            </section>
          ) : null}

          <HomeSection
            index={indexOf("writing")}
            eyebrow="Writing"
            title="Notes from the work."
            emptyBody={articles.failed ? UNAVAILABLE : "Writing is being documented."}
            viewAllHref="/writing"
            viewAllLabel="All writing"
            hasItems={latestWriting.length > 0}
          >
            <ul className="border-border border-t">
              {latestWriting.map(({ article, published }) => (
                <IndexRow
                  key={article.id}
                  href={`/writing/${article.slug}`}
                  title={published.title}
                  body={published.excerpt}
                  aside={
                    published.publishedAt
                      ? new Date(published.publishedAt).toLocaleDateString("en-US", {
                          month: "short",
                          year: "numeric",
                        })
                      : null
                  }
                />
              ))}
            </ul>
          </HomeSection>
        </main>
      </PageTransition>

      <Footer />
    </>
  );
}

function HomeSection({
  index,
  eyebrow,
  title,
  emptyBody,
  viewAllHref,
  viewAllLabel,
  hasItems,
  children,
}: {
  index: string;
  eyebrow: string;
  title: string;
  emptyBody: string;
  viewAllHref: string;
  viewAllLabel: string;
  hasItems: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="container-site py-20 md:py-28">
      <div className="reveal mb-12 grid gap-6 md:grid-cols-12 md:items-end">
        <p className="index-label md:col-span-3 md:self-start md:pt-3">
          <span>{index}</span>
          <span>{eyebrow}</span>
        </p>
        <h2 className="text-h2 text-text font-sans font-semibold md:col-span-7">
          {title}
        </h2>
        {hasItems ? (
          <Link
            href={viewAllHref}
            className="group text-text hover:text-accent inline-flex items-center gap-2 font-sans text-sm transition-colors md:col-span-2 md:justify-self-end"
          >
            {viewAllLabel}
            <span
              aria-hidden="true"
              className="transition-transform group-hover:translate-x-0.5"
            >
              →
            </span>
          </Link>
        ) : null}
      </div>

      {hasItems ? (
        children
      ) : (
        <div className="rounded-panel border-border border border-dashed p-10 text-center">
          <p className="text-text-muted font-serif text-base">{emptyBody}</p>
        </div>
      )}
    </section>
  );
}

function WorkCard({
  href,
  title,
  body,
  coverUrl,
  meta,
  number,
  transitionName,
}: {
  transitionName: string;
  href: string;
  title: string;
  body: string;
  coverUrl: string | null;
  meta: (string | null)[];
  number: number;
}) {
  const metaItems = meta.filter((m): m is string => Boolean(m));
  return (
    <Link href={href} className="group reveal block">
      <ViewTransition name={transitionName} share="morph" default="none">
        <div className="rounded-panel border-border bg-surface relative aspect-[4/3] overflow-hidden border">
          {coverUrl ? (
            <MediaImage
              src={coverUrl}
              alt=""
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
            />
          ) : (
            <div
              aria-hidden="true"
              className="hero-wash flex h-full w-full items-end p-6"
            >
              <span className="text-text/15 font-sans text-8xl font-semibold tracking-tighter">
                {String(number).padStart(2, "0")}
              </span>
            </div>
          )}
          <span className="bg-bg/70 text-text absolute top-4 right-4 flex h-9 w-9 translate-y-1 items-center justify-center rounded-full opacity-0 backdrop-blur transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
            ↗
          </span>
        </div>
      </ViewTransition>
      {metaItems.length > 0 ? (
        <p className="text-text-muted mt-5 font-mono text-[11px] tracking-wider uppercase">
          {metaItems.join(" · ")}
        </p>
      ) : null}
      <h3 className="text-text group-hover:text-accent mt-2 font-sans text-xl font-semibold tracking-tight transition-colors">
        {title}
      </h3>
      <p className="text-text-muted mt-2 line-clamp-2 font-serif text-base">{body}</p>
    </Link>
  );
}

function IndexRow({
  href,
  title,
  body,
  aside,
}: {
  href: string;
  title: string;
  body: string;
  aside?: string | null;
}) {
  return (
    <li className="border-border reveal border-b">
      <Link
        href={href}
        className="group grid gap-3 py-8 md:grid-cols-12 md:items-baseline md:gap-6"
      >
        <span className="text-text-muted font-mono text-xs md:col-span-3">
          {aside ?? ""}
        </span>
        <span className="md:col-span-8">
          <span className="text-text group-hover:text-accent block font-sans text-2xl font-semibold tracking-tight transition-colors md:text-3xl">
            {title}
          </span>
          <span className="text-text-muted mt-3 line-clamp-2 block max-w-2xl font-serif text-base">
            {body}
          </span>
        </span>
        <span
          aria-hidden="true"
          className="text-text-muted group-hover:text-accent hidden text-2xl transition-all group-hover:translate-x-1 md:col-span-1 md:block md:justify-self-end"
        >
          →
        </span>
      </Link>
    </li>
  );
}
