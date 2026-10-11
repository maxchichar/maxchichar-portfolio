import { getSiteUrl } from "@/lib/metadata";
import { escapeHtml, richDocToHtml } from "@/lib/rich-text-html";
import { listPublicArticlesOverview } from "@/server/services/articles";
import { listPublicWorkOverview } from "@/server/services/projects";
import { listPublicResearchOverview } from "@/server/services/research";
import { getPublicSiteSettings } from "@/server/services/settings";

export const dynamic = "force-dynamic";

const MAX_ITEMS = 50;

interface FeedItem {
  title: string;
  path: string;
  summary: string;
  html: string;
  date: Date | null;
  kind: string;
  tags: string[];
}

/** CDATA can't contain "]]>"; split it across two sections. */
const cdata = (value: string) =>
  `<![CDATA[${value.replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;

function sectionsHtml(sections: unknown, baseUrl: string): string {
  if (!Array.isArray(sections)) return "";
  return sections
    .map((s) => {
      const section = s as { heading?: string; content?: unknown };
      const body = richDocToHtml(section.content, baseUrl);
      if (!body) return "";
      return `${section.heading ? `<h2>${escapeHtml(section.heading)}</h2>` : ""}${body}`;
    })
    .join("");
}

async function safe<T>(promise: Promise<T[]>): Promise<T[]> {
  try {
    return await promise;
  } catch (err) {
    console.error("feed:", err);
    return [];
  }
}

/**
 * RSS 2.0 feed of everything published (writing, research and work), newest
 * first, with full content so it reads well in a feed reader.
 */
export async function GET() {
  const site = getSiteUrl().replace(/\/$/, "");
  const [settings, work, research, writing] = await Promise.all([
    getPublicSiteSettings(),
    safe(listPublicWorkOverview()),
    safe(listPublicResearchOverview()),
    safe(listPublicArticlesOverview()),
  ]);

  const items: FeedItem[] = [
    ...writing.map(({ article, published, tags }) => ({
      title: published.title,
      path: `/writing/${article.slug}`,
      summary: published.excerpt,
      html: richDocToHtml(published.content, site),
      date: published.publishedAt,
      kind: "Writing",
      tags: tags.map((t) => t.name),
    })),
    ...research.map(({ research: r, published, tags }) => ({
      title: published.title,
      path: `/research/${r.slug}`,
      summary: published.abstract,
      html: sectionsHtml(published.sections, site),
      date: published.publishedAt,
      kind: "Research",
      tags: tags.map((t) => t.name),
    })),
    ...work.map(({ project, published, tags }) => ({
      title: published.title,
      path: `/work/${project.slug}`,
      summary: published.shortDescription,
      html: sectionsHtml(published.sections, site),
      date: published.publishedAt,
      kind: "Work",
      tags: tags.map((t) => t.name),
    })),
  ]
    .sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0))
    .slice(0, MAX_ITEMS);

  const latest = items.find((i) => i.date)?.date ?? new Date();
  const title = escapeHtml(settings.siteName);
  const description = escapeHtml(settings.siteDescription ?? settings.siteName);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel>
<title>${title}</title>
<link>${site}/</link>
<description>${description}</description>
<language>en</language>
<lastBuildDate>${new Date(latest).toUTCString()}</lastBuildDate>
<atom:link href="${site}/feed.xml" rel="self" type="application/rss+xml"/>
<image><url>${site}/apple-icon.png</url><title>${title}</title><link>${site}/</link></image>
${items
  .map((item) => {
    const url = `${site}${item.path}`;
    const intro = `<p><em>${escapeHtml(item.summary)}</em></p>`;
    return `<item>
<title>${escapeHtml(item.title)}</title>
<link>${url}</link>
<guid isPermaLink="true">${url}</guid>
${item.date ? `<pubDate>${new Date(item.date).toUTCString()}</pubDate>\n` : ""}<dc:creator>${title}</dc:creator>
<category>${item.kind}</category>
${item.tags.map((t) => `<category>${escapeHtml(t)}</category>`).join("\n")}
<description>${escapeHtml(item.summary)}</description>
<content:encoded>${cdata(intro + item.html + `<p><a href="${url}">Read on ${title}</a></p>`)}</content:encoded>
</item>`;
  })
  .join("\n")}
</channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600",
    },
  });
}
