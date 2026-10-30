import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/metadata";

export const dynamic = "force-dynamic";

/** Never crawled by anyone: private surfaces and backend endpoints. */
export const PRIVATE_PATHS = ["/admin/", "/admin/*", "/api/", "/api/*", "/preview/"];

/**
 * Crawlers that fetch pages to cite them in AI search answers (ChatGPT
 * search, Perplexity, Claude, DuckDuckGo Assist). Blocking these removes the
 * site from those answers, so they are always allowed.
 */
export const AI_SEARCH_CRAWLERS = [
  "OAI-SearchBot",
  "ChatGPT-User",
  "PerplexityBot",
  "Perplexity-User",
  "Claude-SearchBot",
  "Claude-User",
  "DuckAssistBot",
];

/**
 * Crawlers that collect pages to train models. They don't affect Google,
 * Bing or Brave rankings, or AI search citations. Allowed by default; set
 * AI_TRAINING_CRAWLERS=block to opt out. Google-Extended and
 * Applebot-Extended are control tokens: blocking them doesn't stop Googlebot
 * or Applebot from indexing the site for search.
 */
export const AI_TRAINING_CRAWLERS = [
  "GPTBot",
  "ClaudeBot",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
  "meta-externalagent",
  "Bytespider",
  "cohere-training-data-crawler",
];

export function trainingCrawlersBlocked(): boolean {
  return process.env.AI_TRAINING_CRAWLERS?.trim().toLowerCase() === "block";
}

/**
 * robots.txt. Search engines (Google, Bing and the engines it feeds, Brave,
 * Yandex, Apple) use the `*` group. AI crawlers get named groups so the
 * policy for each kind is explicit; a named group replaces `*` for that
 * crawler, so each one repeats the private paths.
 */
export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl().replace(/\/+$/, "");
  const blockTraining = trainingCrawlersBlocked();

  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE_PATHS },
      { userAgent: AI_SEARCH_CRAWLERS, allow: "/", disallow: PRIVATE_PATHS },
      blockTraining
        ? { userAgent: AI_TRAINING_CRAWLERS, disallow: "/" }
        : { userAgent: AI_TRAINING_CRAWLERS, allow: "/", disallow: PRIVATE_PATHS },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
