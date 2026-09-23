import { z } from "zod";

// Pages are the one content type with a *fixed*, closed set of items —
// pages.slug is CHECK-constrained in the schema to exactly these three.
// There is no "create a new page" flow (Decision 4), so unlike
// project/research/article validation, there's no slug-pattern/uniqueness
// schema here — just the three known slugs and their distinct shapes.
export const PAGE_SLUGS = ["home", "about", "now"] as const;
export type PageSlug = (typeof PAGE_SLUGS)[number];

// Decision 2 is explicit: three distinct shapes, not a generic sections
// array. Each schema below is deliberately separate — no shared "content
// fields" abstraction between them, since they don't actually share
// fields, only the versioning envelope around them (handled at the
// repository/service layer, not here).

export const homePageContentSchema = z.object({
  slug: z.literal("home"),
  heroEyebrow: z.string().min(1).max(100),
  heroHeadline: z.string().min(1).max(200),
  heroBody: z.string().min(1).max(500),
  heroPrimaryCtaLabel: z.string().min(1).max(60),
  heroPrimaryCtaHref: z.string().min(1).max(200),
  heroSecondaryCtaLabel: z.string().min(1).max(60),
  heroSecondaryCtaHref: z.string().min(1).max(200),
  currentFocusSummary: z.string().min(1).max(500),
});
export type HomePageContent = z.infer<typeof homePageContentSchema>;

export const aboutPageContentSchema = z.object({
  slug: z.literal("about"),
  intro: z.string().min(1).max(2000),
  bio: z.string().min(1).max(2000),
  whatIBuild: z.string().min(1).max(2000),
  howIThink: z.string().min(1).max(2000),
  interests: z.string().min(1).max(2000),
  capabilities: z.string().min(1).max(2000),
  direction: z.string().min(1).max(2000),
});
export type AboutPageContent = z.infer<typeof aboutPageContentSchema>;

export const nowPageContentSchema = z.object({
  slug: z.literal("now"),
  currentlyBuilding: z.string().min(1).max(2000),
  researching: z.string().min(1).max(2000),
  learning: z.string().min(1).max(2000),
  interests: z.string().min(1).max(2000),
  thesis: z.string().min(1).max(2000),
  recentChanges: z.string().min(1).max(2000),
});
export type NowPageContent = z.infer<typeof nowPageContentSchema>;

// The discriminated union — validates a jsonb content blob read back from
// page_versions.content against the correct shape for whichever slug it
// claims to be, without needing external context to pick the right schema.
export const pageContentSchema = z.discriminatedUnion("slug", [
  homePageContentSchema,
  aboutPageContentSchema,
  nowPageContentSchema,
]);
export type PageContent = z.infer<typeof pageContentSchema>;

// For callers that already know the slug from context (e.g. pages.slug)
// and want the specific schema directly rather than re-deriving it from
// the union.
const SCHEMA_BY_SLUG = {
  home: homePageContentSchema,
  about: aboutPageContentSchema,
  now: nowPageContentSchema,
} as const;

export function contentSchemaForSlug(slug: PageSlug) {
  return SCHEMA_BY_SLUG[slug];
}
