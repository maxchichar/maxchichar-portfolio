import "server-only";

import { getSiteUrl } from "@/lib/metadata";
import { richDocToMarkdown } from "@/lib/rich-text-markdown";

import { listPublicArticlesOverview } from "./articles";
import { getSiteDocument } from "./documents";
import {
  getPublishedAboutPage,
  getPublishedHomePage,
  getPublishedNowPage,
} from "./pages";
import { listPublicWorkOverview } from "./projects";
import { listPublicResearchOverview } from "./research";
import { getPublicSiteSettings } from "./settings";

async function safe<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch (err) {
    console.error("llms.txt:", err);
    return fallback;
  }
}

/** One line: newlines and runs of spaces collapsed. */
const line = (text: string | null | undefined) =>
  (text ?? "").replace(/\s+/g, " ").trim();
/** Paragraphs kept, other whitespace tidied. */
const paras = (text: string | null | undefined) =>
  (text ?? "")
    .split(/\n\s*\n/)
    .map(line)
    .filter(Boolean)
    .join("\n\n");

const monthYear = (d: Date | null | undefined) =>
  d ? new Date(d).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : null;

function sectionsMarkdown(sections: unknown, site: string): string {
  if (!Array.isArray(sections)) return "";
  return sections
    .map((s) => {
      const section = s as { heading?: string; content?: unknown };
      const body = richDocToMarkdown(section.content, site);
      return body ? `### ${line(section.heading)}\n\n${body}` : "";
    })
    .filter(Boolean)
    .join("\n\n");
}

/**
 * /llms.txt (llmstxt.org): a Markdown summary of the site for AI assistants:
 * who this is, what they do, and links to everything published. With
 * `full`, /llms-full.txt: the same plus the full text of every page.
 * Built from live content, so it never goes stale.
 */
export async function buildLlmsTxt({ full }: { full: boolean }): Promise<string> {
  const site = getSiteUrl().replace(/\/$/, "");
  const [settings, home, about, now, work, research, writing, cv] = await Promise.all([
    getPublicSiteSettings(),
    safe(getPublishedHomePage(), null),
    safe(getPublishedAboutPage(), null),
    safe(getPublishedNowPage(), null),
    safe(listPublicWorkOverview(), []),
    safe(listPublicResearchOverview(), []),
    safe(listPublicArticlesOverview(), []),
    getSiteDocument("cv"),
  ]);

  const name = settings.siteName;
  const socials = [
    ["GitHub", settings.socialGithub],
    ["LinkedIn", settings.socialLinkedin],
    ["X", settings.socialX],
    ["Instagram", settings.socialInstagram],
    ["YouTube", settings.socialYoutube],
    ["TikTok", settings.socialTiktok],
  ].filter((s): s is [string, string] => Boolean(s[1]));

  const out: string[] = [];
  out.push(`# ${name}`);
  out.push(
    `> ${[line(settings.siteDescription), line(home?.content.heroHeadline)].filter(Boolean).join(". ").replace(/\.\./g, ".")}`,
  );
  if (about) out.push(paras(about.content.intro));
  if (home) out.push(`Currently: ${line(home.content.currentFocusSummary)}`);
  const contact = [
    settings.primaryEmail ? `email ${settings.primaryEmail}` : null,
    `the contact form at ${site}/contact`,
  ].filter(Boolean);
  out.push(`Contact: ${contact.join(", or ")}.`);
  if (socials.length) {
    out.push(
      `Elsewhere: ${socials.map(([label, url]) => `${label} (${url})`).join(", ")}.`,
    );
  }

  // Full version: the About and Now pages in full, before the item sections.
  if (full && about) {
    const c = about.content;
    out.push(
      [
        "## About",
        `### Biography\n\n${paras(c.bio)}`,
        `### What I build\n\n${paras(c.whatIBuild)}`,
        `### How I think\n\n${paras(c.howIThink)}`,
        `### Areas of interest\n\n${paras(c.interests)}`,
        `### Capabilities\n\n${paras(c.capabilities)}`,
        `### Current direction\n\n${paras(c.direction)}`,
      ].join("\n\n"),
    );
  }
  if (full && now) {
    const c = now.content;
    out.push(
      [
        `## Now${now.published.publishedAt ? ` (updated ${monthYear(now.published.publishedAt)})` : ""}`,
        `### Building\n\n${paras(c.currentlyBuilding)}`,
        `### Researching\n\n${paras(c.researching)}`,
        `### Learning\n\n${paras(c.learning)}`,
        `### Interests\n\n${paras(c.interests)}`,
        `### Thesis\n\n${paras(c.thesis)}`,
        `### Recent changes\n\n${paras(c.recentChanges)}`,
      ].join("\n\n"),
    );
  }

  const items = [
    {
      title: "Work",
      entries: work.map(({ project, published, tags }) => ({
        title: published.title,
        url: `${site}/work/${project.slug}`,
        summary: published.shortDescription,
        meta: [published.category, published.year].filter(Boolean).join(", "),
        tags: tags.map((t) => t.name),
        body: () => sectionsMarkdown(published.sections, site),
      })),
    },
    {
      title: "Research",
      entries: research.map(({ research: r, published, tags }) => ({
        title: published.title,
        url: `${site}/research/${r.slug}`,
        summary: published.abstract,
        meta: [published.category, monthYear(published.publishedAt)]
          .filter(Boolean)
          .join(", "),
        tags: tags.map((t) => t.name),
        body: () => sectionsMarkdown(published.sections, site),
      })),
    },
    {
      title: "Writing",
      entries: writing.map(({ article, published, tags }) => ({
        title: published.title,
        url: `${site}/writing/${article.slug}`,
        summary: published.excerpt,
        meta: monthYear(published.publishedAt) ?? "",
        tags: tags.map((t) => t.name),
        body: () => richDocToMarkdown(published.content, site),
      })),
    },
  ];

  for (const group of items) {
    if (group.entries.length === 0) continue;
    if (full) {
      for (const e of group.entries) {
        const details = [
          `URL: ${e.url}`,
          e.meta ? `Details: ${e.meta}` : null,
          e.tags.length ? `Topics: ${e.tags.join(", ")}` : null,
        ].filter(Boolean);
        const body = e.body();
        out.push(
          [
            `## ${group.title}: ${line(e.title)}`,
            details.join("\n"),
            `> ${line(e.summary)}`,
            body,
          ]
            .filter(Boolean)
            .join("\n\n"),
        );
      }
    } else {
      out.push(
        [
          `## ${group.title}`,
          ...group.entries.map(
            (e) =>
              `- [${line(e.title)}](${e.url}): ${line(e.summary)}${e.meta ? ` (${e.meta})` : ""}`,
          ),
        ].join("\n"),
      );
    }
  }

  if (!full) {
    out.push(
      [
        "## Pages",
        `- [About](${site}/about): Biography, what I build, how I think, capabilities and current direction.`,
        `- [Now](${site}/now): What's being built, researched and learned right now.`,
        `- [Contact](${site}/contact): Consulting, research collaboration, advisory and speaking enquiries.`,
        ...(cv ? [`- [CV (PDF)](${site}/cv): The current CV.`] : []),
      ].join("\n"),
    );
    out.push(
      [
        "## Optional",
        `- [Full text](${site}/llms-full.txt): Every page above in full, in one file.`,
        `- [RSS feed](${site}/feed.xml): New work, research and writing.`,
        `- [Sitemap](${site}/sitemap.xml)`,
      ].join("\n"),
    );
  }

  return `${out.filter(Boolean).join("\n\n")}\n`;
}
