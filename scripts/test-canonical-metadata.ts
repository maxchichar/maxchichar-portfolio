import assert from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";

import {
  constructBaseMetadata,
  constructPageMetadata,
  getMetadataBase,
  getSiteUrl,
  normalizeCanonicalPath,
  resolveCanonicalUrl,
} from "../src/lib/metadata";

describe("Canonical URLs & Alternates Metadata (Level 9.5)", () => {
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

  describe("Canonical path normalization helper", () => {
    it("preserves root path as single slash", () => {
      assert.strictEqual(normalizeCanonicalPath("/"), "/");
      assert.strictEqual(normalizeCanonicalPath(""), undefined);
      assert.strictEqual(normalizeCanonicalPath("   "), undefined);
      assert.strictEqual(normalizeCanonicalPath(null), undefined);
      assert.strictEqual(normalizeCanonicalPath(undefined), undefined);
    });

    it("normalizes standard static paths", () => {
      assert.strictEqual(normalizeCanonicalPath("/work"), "/work");
      assert.strictEqual(normalizeCanonicalPath("/research"), "/research");
      assert.strictEqual(normalizeCanonicalPath("/writing"), "/writing");
      assert.strictEqual(normalizeCanonicalPath("/about"), "/about");
      assert.strictEqual(normalizeCanonicalPath("/now"), "/now");
      assert.strictEqual(normalizeCanonicalPath("/contact"), "/contact");
    });

    it("ensures leading slash if missing", () => {
      assert.strictEqual(normalizeCanonicalPath("work"), "/work");
      assert.strictEqual(normalizeCanonicalPath("research/paper-1"), "/research/paper-1");
    });

    it("strips trailing slashes from subpaths", () => {
      assert.strictEqual(normalizeCanonicalPath("/work/"), "/work");
      assert.strictEqual(
        normalizeCanonicalPath("/research/neural-net/"),
        "/research/neural-net",
      );
    });

    it("collapses duplicate slashes", () => {
      assert.strictEqual(
        normalizeCanonicalPath("//work///my-project//"),
        "/work/my-project",
      );
      assert.strictEqual(normalizeCanonicalPath("///"), "/");
    });

    it("strictly strips query parameters and hash fragments", () => {
      assert.strictEqual(
        normalizeCanonicalPath("/work/project-a?ref=twitter&utm_source=hn"),
        "/work/project-a",
      );
      assert.strictEqual(
        normalizeCanonicalPath("/writing/agent-dynamics?page=2#conclusion"),
        "/writing/agent-dynamics",
      );
      assert.strictEqual(normalizeCanonicalPath("/?ref=producthunt"), "/");
    });
  });

  describe("Site URL resolution & absolute canonical URLs", () => {
    it("resolves canonical URLs using localhost fallback by default", () => {
      assert.strictEqual(resolveCanonicalUrl("/"), "http://localhost:3000/");
      assert.strictEqual(resolveCanonicalUrl("/work"), "http://localhost:3000/work");
      assert.strictEqual(
        resolveCanonicalUrl("/work/my-project"),
        "http://localhost:3000/work/my-project",
      );
    });

    it("resolves canonical URLs using NEXT_PUBLIC_SITE_URL without duplicate slashes", () => {
      process.env.NEXT_PUBLIC_SITE_URL = "https://maxchichar.com";
      assert.strictEqual(resolveCanonicalUrl("/"), "https://maxchichar.com/");
      assert.strictEqual(resolveCanonicalUrl("/work"), "https://maxchichar.com/work");
      assert.strictEqual(
        resolveCanonicalUrl("/work/my-project"),
        "https://maxchichar.com/work/my-project",
      );
      assert.strictEqual(
        resolveCanonicalUrl("/work/my-project?ref=test"),
        "https://maxchichar.com/work/my-project",
      );
    });

    it("handles trailing slash on base URL environment variables cleanly", () => {
      process.env.NEXT_PUBLIC_SITE_URL = "https://maxchichar.com/";
      assert.strictEqual(resolveCanonicalUrl("/"), "https://maxchichar.com/");
      assert.strictEqual(
        resolveCanonicalUrl("/research"),
        "https://maxchichar.com/research",
      );
    });

    it("reflects configured site URL on getMetadataBase() and getSiteUrl()", () => {
      process.env.NEXT_PUBLIC_SITE_URL = "https://maxchichar.com";
      assert.strictEqual(getSiteUrl(), "https://maxchichar.com");
      const base = getMetadataBase();
      assert.strictEqual(base.origin, "https://maxchichar.com");
    });
  });

  describe("Root homepage canonical metadata", () => {
    it("constructBaseMetadata provides canonical '/' and matches og:url '/'", () => {
      const meta = constructBaseMetadata();

      const alternates = meta.alternates as Record<string, unknown> | undefined;
      const og = meta.openGraph as Record<string, unknown> | undefined;

      assert.ok(alternates, "Root metadata must have alternates");
      assert.strictEqual(alternates.canonical, "/");
      assert.ok(og, "Root metadata must have openGraph");
      assert.strictEqual(og.url, "/");
    });
  });

  describe("Static routes canonical generation", () => {
    const staticPaths = ["/work", "/research", "/writing", "/about", "/now", "/contact"];

    it("generates explicit canonicals for all static public routes", () => {
      for (const path of staticPaths) {
        const meta = constructPageMetadata({
          title: "Page Title",
          path,
        });

        const alternates = meta.alternates as Record<string, unknown> | undefined;
        assert.ok(alternates, `Missing alternates for ${path}`);
        assert.strictEqual(alternates.canonical, path);
      }
    });

    it("guarantees Open Graph URL and canonical URL match exactly", () => {
      for (const path of staticPaths) {
        const meta = constructPageMetadata({
          title: "Page Title",
          path,
        });

        const alternates = meta.alternates as Record<string, unknown> | undefined;
        const og = meta.openGraph as Record<string, unknown> | undefined;

        assert.strictEqual(
          alternates?.canonical,
          og?.url,
          `Canonical (${alternates?.canonical}) must match OG URL (${og?.url}) for ${path}`,
        );
      }
    });
  });

  describe("Dynamic route canonical generation", () => {
    it("generates correct dynamic Work canonical matching og:url", () => {
      const slug = "autonomous-agent-core";
      const meta = constructPageMetadata({
        title: "Autonomous Agent Core",
        path: `/work/${slug}`,
        type: "website",
      });

      const alternates = meta.alternates as Record<string, unknown> | undefined;
      const og = meta.openGraph as Record<string, unknown> | undefined;

      assert.strictEqual(alternates?.canonical, `/work/${slug}`);
      assert.strictEqual(og?.url, `/work/${slug}`);
      assert.strictEqual(alternates?.canonical, og?.url);
    });

    it("generates correct dynamic Research canonical matching og:url", () => {
      const slug = "attention-mechanisms-analysis";
      const meta = constructPageMetadata({
        title: "Attention Mechanisms Analysis",
        path: `/research/${slug}`,
        type: "article",
      });

      const alternates = meta.alternates as Record<string, unknown> | undefined;
      const og = meta.openGraph as Record<string, unknown> | undefined;

      assert.strictEqual(alternates?.canonical, `/research/${slug}`);
      assert.strictEqual(og?.url, `/research/${slug}`);
      assert.strictEqual(alternates?.canonical, og?.url);
    });

    it("generates correct dynamic Writing canonical matching og:url", () => {
      const slug = "scaling-laws-and-reasoning";
      const meta = constructPageMetadata({
        title: "Scaling Laws and Reasoning",
        path: `/writing/${slug}`,
        type: "article",
      });

      const alternates = meta.alternates as Record<string, unknown> | undefined;
      const og = meta.openGraph as Record<string, unknown> | undefined;

      assert.strictEqual(alternates?.canonical, `/writing/${slug}`);
      assert.strictEqual(og?.url, `/writing/${slug}`);
      assert.strictEqual(alternates?.canonical, og?.url);
    });

    it("strips incoming query parameters from dynamic paths", () => {
      const meta = constructPageMetadata({
        title: "Dynamic Project",
        path: "/work/my-project?ref=twitter&utm_campaign=launch",
      });

      const alternates = meta.alternates as Record<string, unknown> | undefined;
      const og = meta.openGraph as Record<string, unknown> | undefined;

      assert.strictEqual(alternates?.canonical, "/work/my-project");
      assert.strictEqual(og?.url, "/work/my-project");
    });
  });

  describe("Publication boundaries & failure closure", () => {
    it("omits alternates when no path is provided", () => {
      const meta = constructPageMetadata({
        title: "Project Not Found",
      });

      assert.strictEqual(meta.alternates, undefined);
      assert.strictEqual(
        (meta.openGraph as Record<string, unknown> | undefined)?.url,
        undefined,
      );
    });
  });
});
