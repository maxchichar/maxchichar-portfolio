import assert from "node:assert";
import { describe, it, beforeEach, afterEach, before } from "node:test";

// Mock server-only before importing server modules in standalone test runners
try {
  require.cache[require.resolve("server-only")] = {
    id: require.resolve("server-only"),
    filename: require.resolve("server-only"),
    loaded: true,
    exports: {},
  } as unknown as NodeJS.Module;
} catch {
  // Ignore if server-only cannot be resolved directly
}

import type {
  buildSitemap as BuildSitemapFn,
  STATIC_ROUTES as StaticRoutesConst,
} from "../src/app/sitemap";

let sitemap: typeof import("../src/app/sitemap").default;
let buildSitemap: typeof BuildSitemapFn;
let STATIC_ROUTES: typeof StaticRoutesConst;

describe("Dynamic Sitemap generation (Level 9.3)", () => {
  before(async () => {
    const mod = await import("../src/app/sitemap");
    sitemap = mod.default;
    buildSitemap = mod.buildSitemap;
    STATIC_ROUTES = mod.STATIC_ROUTES;
  });
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.SITE_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    delete process.env.VERCEL_URL;
    delete process.env.PORT;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("Static routes", () => {
    it("includes all 7 canonical public static routes in exact order", () => {
      const siteUrl = "https://example.com";
      const entries = buildSitemap({ siteUrl });

      const urls = entries.map((e) => e.url);

      assert.deepStrictEqual(STATIC_ROUTES, [
        "",
        "/work",
        "/research",
        "/writing",
        "/now",
        "/about",
        "/contact",
      ]);

      assert.deepStrictEqual(urls, [
        "https://example.com",
        "https://example.com/work",
        "https://example.com/research",
        "https://example.com/writing",
        "https://example.com/now",
        "https://example.com/about",
        "https://example.com/contact",
      ]);
    });

    it("omits lastModified for static routes", () => {
      const siteUrl = "https://example.com";
      const entries = buildSitemap({ siteUrl });

      for (const entry of entries) {
        assert.strictEqual(
          entry.lastModified,
          undefined,
          `Static route ${entry.url} must not have a synthetic lastModified timestamp`,
        );
      }
    });

    it("normalizes trailing slashes on base URL to avoid double slashes", () => {
      const siteUrl = "https://example.com/";
      const entries = buildSitemap({ siteUrl });

      for (const entry of entries) {
        assert.doesNotMatch(
          entry.url.replace(/^https?:\/\//, ""),
          /\/\//,
          `URL ${entry.url} must not contain double slashes`,
        );
      }
    });
  });

  describe("Dynamic published content", () => {
    const publishedDate = new Date("2026-09-15T10:00:00.000Z");

    const mockWork = [
      {
        project: { slug: "neural-retrieval", updatedAt: new Date("2026-09-10") },
        published: { publishedAt: publishedDate },
      },
    ];

    const mockResearch = [
      {
        research: { slug: "sparse-attention-eval", updatedAt: new Date("2026-09-12") },
        published: { publishedAt: publishedDate },
      },
    ];

    const mockArticles = [
      {
        article: { slug: "evaluating-llm-systems", updatedAt: new Date("2026-09-14") },
        published: { publishedAt: publishedDate },
      },
    ];

    it("maps published work, research, and articles to canonical URLs with lastModified", () => {
      const siteUrl = "https://example.com";
      const entries = buildSitemap({
        siteUrl,
        work: mockWork,
        research: mockResearch,
        articles: mockArticles,
      });

      const dynamicUrls = entries.slice(7);

      assert.strictEqual(dynamicUrls.length, 3);

      assert.strictEqual(
        dynamicUrls[0]?.url,
        "https://example.com/work/neural-retrieval",
      );
      assert.deepStrictEqual(dynamicUrls[0]?.lastModified, publishedDate);

      assert.strictEqual(
        dynamicUrls[1]?.url,
        "https://example.com/research/sparse-attention-eval",
      );
      assert.deepStrictEqual(dynamicUrls[1]?.lastModified, publishedDate);

      assert.strictEqual(
        dynamicUrls[2]?.url,
        "https://example.com/writing/evaluating-llm-systems",
      );
      assert.deepStrictEqual(dynamicUrls[2]?.lastModified, publishedDate);
    });

    it("falls back to item.updatedAt when publishedAt is null", () => {
      const fallbackDate = new Date("2026-08-20T12:00:00.000Z");
      const workWithoutPublishedAt = [
        {
          project: { slug: "legacy-project", updatedAt: fallbackDate },
          published: { publishedAt: null },
        },
      ];

      const entries = buildSitemap({
        siteUrl: "https://example.com",
        work: workWithoutPublishedAt,
      });

      const entry = entries.find((e) => e.url.endsWith("/work/legacy-project"));
      assert.ok(entry);
      assert.deepStrictEqual(entry.lastModified, fallbackDate);
    });

    it("strictly excludes administrative and API paths", () => {
      const entries = buildSitemap({
        siteUrl: "https://example.com",
        work: mockWork,
        research: mockResearch,
        articles: mockArticles,
      });

      for (const entry of entries) {
        assert.doesNotMatch(
          entry.url,
          /\/admin(\/|$)/,
          "Sitemap must not contain /admin",
        );
        assert.doesNotMatch(entry.url, /\/api(\/|$)/, "Sitemap must not contain /api");
        assert.doesNotMatch(entry.url, /\/login/, "Sitemap must not contain /login");
      }
    });
  });

  describe("Runtime fallback without database", () => {
    it("resolves sitemap cleanly without throwing even if DB is unavailable", async () => {
      // In an environment where the DB is unreachable, sitemap() must handle
      // Promise.allSettled and cleanly return the static routes.
      const entries = await sitemap();
      assert.ok(Array.isArray(entries));
      assert.ok(entries.length >= 7, "Must contain at least the 7 static routes");

      const staticUrls = entries.map((e) => e.url);
      assert.ok(staticUrls.some((u) => u.endsWith("/work")));
      assert.ok(staticUrls.some((u) => u.endsWith("/research")));
      assert.ok(staticUrls.some((u) => u.endsWith("/writing")));
      assert.ok(staticUrls.some((u) => u.endsWith("/now")));
      assert.ok(staticUrls.some((u) => u.endsWith("/about")));
      assert.ok(staticUrls.some((u) => u.endsWith("/contact")));
    });
  });
});
