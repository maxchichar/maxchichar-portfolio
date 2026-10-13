import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { HomeView } from "@/components/home/home-view";
import { Footer } from "@/components/layout/footer";
import { Nav } from "@/components/layout/nav";
import { PageTransition } from "@/components/motion/page-transition";
import { AboutView } from "@/components/pages/about-view";
import { NowView } from "@/components/pages/now-view";
import { PreviewBanner } from "@/components/preview/preview-banner";
import { ResearchDetailView } from "@/components/research/research-detail-view";
import { CaseStudyView } from "@/components/work/case-study-view";
import { ArticleDetailView } from "@/components/writing/article-detail-view";
import { auth } from "@/lib/auth/config";
import {
  aboutPageContentSchema,
  homePageContentSchema,
  nowPageContentSchema,
  PAGE_SLUGS,
  type PageSlug,
} from "@/lib/validation/page";
import { getArticleFullState } from "@/server/services/articles";
import { getSiteDocument } from "@/server/services/documents";
import { getPageBySlug, getPageFullState } from "@/server/services/pages";
import { getProjectFullState } from "@/server/services/projects";
import { resolveReadyMediaUrl, withEvidenceMedia } from "@/server/services/public-media";
import { getResearchFullState } from "@/server/services/research";
import { getPublicSiteSettings } from "@/server/services/settings";
import { getProjectTestimonials } from "@/server/services/testimonials";

export const dynamic = "force-dynamic";

// Never indexed, never cached: drafts are private to the signed-in admin.
export const metadata: Metadata = {
  title: "Draft preview",
  robots: { index: false, follow: false, nocache: true },
};

type Params = Promise<{ kind: string; id: string }>;

/** Latest saved draft, or the live version when there's no draft. */
function pick<V>(state: { draft: V | null; published: V | null }) {
  const version = state.draft ?? state.published;
  return version ? { version, isDraft: Boolean(state.draft) } : null;
}

async function safe<T>(promise: Promise<T>): Promise<T | null> {
  try {
    return await promise;
  } catch {
    return null; // e.g. a malformed id
  }
}

/**
 * Draft preview: renders the latest saved draft with the exact public page
 * components (nav, fonts, motion, footer), so what you see here is what
 * visitors will see once it's published. Admins only.
 */
export default async function PreviewPage({ params }: { params: Params }) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const { kind, id } = await params;

  if (kind === "work") {
    const state = await safe(getProjectFullState(id));
    const picked = state && pick(state);
    if (!state || !picked) notFound();
    const { project, evidence, tags } = state;
    const [coverUrl, evidenceWithMedia, testimonials] = await Promise.all([
      resolveReadyMediaUrl(picked.version.coverMediaId),
      withEvidenceMedia(evidence),
      getProjectTestimonials(project.id),
    ]);
    return (
      <Shell
        banner={
          <PreviewBanner
            isDraft={picked.isDraft}
            version={picked.version.versionNumber}
            editHref={`/admin/projects/${project.id}`}
            liveHref={state.published ? `/work/${project.slug}` : null}
          />
        }
      >
        <CaseStudyView
          project={project}
          published={picked.version}
          evidence={evidenceWithMedia}
          tags={tags}
          coverUrl={coverUrl}
          next={null}
          testimonials={testimonials}
        />
      </Shell>
    );
  }

  if (kind === "research") {
    const state = await safe(getResearchFullState(id));
    const picked = state && pick(state);
    if (!state || !picked) notFound();
    const { research, evidence, tags } = state;
    const [coverUrl, evidenceWithMedia] = await Promise.all([
      resolveReadyMediaUrl(picked.version.coverMediaId),
      withEvidenceMedia(evidence),
    ]);
    return (
      <Shell
        banner={
          <PreviewBanner
            isDraft={picked.isDraft}
            version={picked.version.versionNumber}
            editHref={`/admin/research/${research.id}`}
            liveHref={state.published ? `/research/${research.slug}` : null}
          />
        }
      >
        <ResearchDetailView
          research={research}
          published={picked.version}
          evidence={evidenceWithMedia}
          tags={tags}
          coverUrl={coverUrl}
          next={null}
        />
      </Shell>
    );
  }

  if (kind === "writing") {
    const state = await safe(getArticleFullState(id));
    const picked = state && pick(state);
    if (!state || !picked) notFound();
    const [coverUrl, settings, avatar] = await Promise.all([
      resolveReadyMediaUrl(picked.version.coverMediaId),
      getPublicSiteSettings(),
      getSiteDocument("avatar"),
    ]);
    return (
      <Shell
        banner={
          <PreviewBanner
            isDraft={picked.isDraft}
            version={picked.version.versionNumber}
            editHref={`/admin/articles/${state.article.id}`}
            liveHref={state.published ? `/writing/${state.article.slug}` : null}
          />
        }
      >
        <ArticleDetailView
          article={state.article}
          published={picked.version}
          tags={state.tags}
          coverUrl={coverUrl}
          next={null}
          author={{
            name: settings.siteName,
            description: settings.siteDescription,
            photoUrl: avatar?.url ?? settings.aboutImage?.url ?? null,
          }}
        />
      </Shell>
    );
  }

  if (kind === "page" && (PAGE_SLUGS as readonly string[]).includes(id)) {
    const slug = id as PageSlug;
    const page = await getPageBySlug(slug);
    const state = page ? await getPageFullState(page.id) : null;
    const picked = state && pick(state);
    if (!state || !picked) notFound();
    const banner = (
      <PreviewBanner
        isDraft={picked.isDraft}
        version={picked.version.versionNumber}
        editHref={`/admin/pages/${slug}`}
        liveHref={state.published ? (slug === "home" ? "/" : `/${slug}`) : null}
      />
    );

    if (slug === "home") {
      const parsed = homePageContentSchema.safeParse(picked.version.content);
      if (!parsed.success) notFound();
      return (
        <>
          <HomeView content={parsed.data} />
          {banner}
        </>
      );
    }
    if (slug === "about") {
      const parsed = aboutPageContentSchema.safeParse(picked.version.content);
      if (!parsed.success) notFound();
      const [settings, cv] = await Promise.all([
        getPublicSiteSettings(),
        getSiteDocument("cv"),
      ]);
      return (
        <Shell banner={banner}>
          <AboutView
            content={parsed.data}
            image={settings.aboutImage}
            name={settings.siteName}
            cv={cv}
          />
        </Shell>
      );
    }
    const parsed = nowPageContentSchema.safeParse(picked.version.content);
    if (!parsed.success) notFound();
    return (
      <Shell banner={banner}>
        <NowView content={parsed.data} publishedAt={picked.version.publishedAt ?? null} />
      </Shell>
    );
  }

  notFound();
}

function Shell({
  banner,
  children,
}: {
  banner: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <>
      <Nav />
      <PageTransition>
        <main>{children}</main>
      </PageTransition>
      <Footer />
      {banner}
    </>
  );
}
