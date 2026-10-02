import assert from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";

import {
  constructBaseMetadata,
  constructPageMetadata,
  resolveCanonicalUrl,
} from "../src/lib/metadata";
import {
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
  buildJsonLdGraph,
  buildPersonJsonLd,
  buildResearchJsonLd,
  buildWebSiteJsonLd,
  buildWorkJsonLd,
  serializeJsonLd,
} from "../src/lib/structured-data";

describe("JSON-LD Structured Data (Level 9.6)", () => {
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

  describe("1. WebSite JSON-LD", () => {
    it("contains @context, @type, name, and url", () => {
      const site = buildWebSiteJsonLd({
        siteName: "CHIBUEZE MAXWELL",
        siteDescription: "Super Intelligence Engineer & Entrepreneur",
      });

      assert.strictEqual(site["@context"], "https://schema.org");
      assert.strictEqual(site["@type"], "WebSite");
      assert.strictEqual(site.name, "CHIBUEZE MAXWELL");
      assert.strictEqual(site.url, "http://localhost:3000/");
      assert.strictEqual(site.description, "Super Intelligence Engineer & Entrepreneur");
      assert.ok(site["@id"]);
    });

    it("respects custom site URL when provided or configured via environment", () => {
      process.env.NEXT_PUBLIC_SITE_URL = "https://maxchichar.com";
      const site = buildWebSiteJsonLd({
        siteName: "Max Chichar",
        siteDescription: "Builder & Founder",
      });

      assert.strictEqual(site.url, "https://maxchichar.com/");
      assert.strictEqual(site["@id"], "https://maxchichar.com/#website");
    });
  });

  describe("2. Person JSON-LD", () => {
    it("returns null when identity name is absent or whitespace", () => {
      assert.strictEqual(buildPersonJsonLd(), null);
      assert.strictEqual(buildPersonJsonLd({ name: null }), null);
      assert.strictEqual(buildPersonJsonLd({ name: "" }), null);
      assert.strictEqual(buildPersonJsonLd({ name: "   " }), null);
    });

    it("creates Person entity with identity name and canonical URL", () => {
      const person = buildPersonJsonLd({
        name: "CHIBUEZE MAXWELL",
        jobTitle: "Super Intelligence Engineer & Entrepreneur",
      });

      assert.ok(person);
      assert.strictEqual(person["@context"], "https://schema.org");
      assert.strictEqual(person["@type"], "Person");
      assert.strictEqual(person.name, "CHIBUEZE MAXWELL");
      assert.strictEqual(person.url, "http://localhost:3000/");
      assert.strictEqual(person.jobTitle, "Super Intelligence Engineer & Entrepreneur");
      assert.strictEqual(
        person.sameAs,
        undefined,
        "Must omit sameAs when no social links configured",
      );
    });

    it("never invents social URLs and only includes verified configured links", () => {
      const person = buildPersonJsonLd({
        name: "CHIBUEZE MAXWELL",
        socialLinks: [
          "https://github.com/maxchichar",
          "https://x.com/maxchichar",
          "",
          null,
          "not-a-valid-url",
        ],
      });

      assert.ok(person);
      const sameAs = person.sameAs as string[];
      assert.ok(Array.isArray(sameAs));
      assert.strictEqual(sameAs.length, 2);
      assert.deepStrictEqual(sameAs, [
        "https://github.com/maxchichar",
        "https://x.com/maxchichar",
      ]);
    });
  });

  describe("3. Work JSON-LD", () => {
    it("creates CreativeWork type by default with correct title, description, and canonical URL", () => {
      const work = buildWorkJsonLd({
        title: "Autonomous Agent Core",
        description: "A framework for autonomous agent operations.",
        slug: "autonomous-agent-core",
        category: "AI Systems",
        authorName: "CHIBUEZE MAXWELL",
      });

      assert.strictEqual(work["@context"], "https://schema.org");
      assert.strictEqual(work["@type"], "CreativeWork");
      assert.strictEqual(work.name, "Autonomous Agent Core");
      assert.strictEqual(work.headline, "Autonomous Agent Core");
      assert.strictEqual(
        work.description,
        "A framework for autonomous agent operations.",
      );
      assert.strictEqual(work.url, "http://localhost:3000/work/autonomous-agent-core");
      assert.ok(work.author);
    });

    it("uses SoftwareApplication type only when category explicitly supports it", () => {
      const software = buildWorkJsonLd({
        title: "Desktop IDE App",
        description: "An agentic coding application.",
        slug: "desktop-ide-app",
        category: "Software Application",
      });

      assert.strictEqual(software["@type"], "SoftwareApplication");
      assert.strictEqual(software.applicationCategory, "Software Application");
    });

    it("uses public coverUrl when present and falls back to default OG image when absent", () => {
      const withCover = buildWorkJsonLd({
        title: "Project Alpha",
        description: "Alpha project.",
        slug: "project-alpha",
        coverUrl: "https://r2.maxchichar.com/covers/alpha.jpg",
      });
      assert.strictEqual(withCover.image, "https://r2.maxchichar.com/covers/alpha.jpg");

      const withoutCover = buildWorkJsonLd({
        title: "Project Beta",
        description: "Beta project.",
        slug: "project-beta",
        coverUrl: null,
      });
      assert.strictEqual(withoutCover.image, "http://localhost:3000/og-default.png");
    });

    it("includes publication and modified dates only when valid dates exist", () => {
      const now = new Date("2026-03-15T10:00:00Z");
      const updated = new Date("2026-03-20T14:30:00Z");

      const withDates = buildWorkJsonLd({
        title: "Dated Work",
        description: "Dated work item.",
        slug: "dated-work",
        publishedAt: now,
        updatedAt: updated,
      });

      assert.strictEqual(withDates.datePublished, "2026-03-15T10:00:00.000Z");
      assert.strictEqual(withDates.dateModified, "2026-03-20T14:30:00.000Z");

      const withoutDates = buildWorkJsonLd({
        title: "Undated Work",
        description: "Undated work item.",
        slug: "undated-work",
        publishedAt: null,
        updatedAt: null,
      });

      assert.strictEqual(withoutDates.datePublished, undefined);
      assert.strictEqual(withoutDates.dateModified, undefined);
    });
  });

  describe("4. Research JSON-LD", () => {
    it("generates ScholarlyArticle with correct headline, description, URL, and author", () => {
      const research = buildResearchJsonLd({
        title: "Attention Mechanisms Analysis",
        abstract: "Comprehensive analysis of sparse attention.",
        slug: "attention-mechanisms-analysis",
        publishedAt: new Date("2026-01-10T00:00:00Z"),
        authorName: "CHIBUEZE MAXWELL",
      });

      assert.strictEqual(research["@context"], "https://schema.org");
      assert.strictEqual(research["@type"], "ScholarlyArticle");
      assert.strictEqual(research.name, "Attention Mechanisms Analysis");
      assert.strictEqual(research.headline, "Attention Mechanisms Analysis");
      assert.strictEqual(
        research.description,
        "Comprehensive analysis of sparse attention.",
      );
      assert.strictEqual(
        research.url,
        "http://localhost:3000/research/attention-mechanisms-analysis",
      );
      assert.strictEqual(research.datePublished, "2026-01-10T00:00:00.000Z");
      assert.deepStrictEqual(research.author, {
        "@type": "Person",
        "@id": "http://localhost:3000/#person",
        name: "CHIBUEZE MAXWELL",
        url: "http://localhost:3000/",
      });
    });
  });

  describe("5. Writing JSON-LD", () => {
    it("generates Article with correct headline, description, and canonical URL", () => {
      const article = buildArticleJsonLd({
        title: "Scaling Laws and Reasoning",
        excerpt: "Evaluating reasoning emergence in small architectures.",
        slug: "scaling-laws-and-reasoning",
        publishedAt: "2026-02-01T12:00:00Z",
        authorName: "CHIBUEZE MAXWELL",
      });

      assert.strictEqual(article["@context"], "https://schema.org");
      assert.strictEqual(article["@type"], "Article");
      assert.strictEqual(article.name, "Scaling Laws and Reasoning");
      assert.strictEqual(article.headline, "Scaling Laws and Reasoning");
      assert.strictEqual(
        article.description,
        "Evaluating reasoning emergence in small architectures.",
      );
      assert.strictEqual(
        article.url,
        "http://localhost:3000/writing/scaling-laws-and-reasoning",
      );
      assert.strictEqual(article.datePublished, "2026-02-01T12:00:00.000Z");
      assert.ok(article.author);
    });
  });

  describe("6. Breadcrumb JSON-LD", () => {
    it("produces correct 3-level hierarchy with absolute URLs and 1-based positions", () => {
      const breadcrumbs = buildBreadcrumbJsonLd([
        { name: "Home", url: "/" },
        { name: "Work", url: "/work" },
        { name: "Autonomous Agent Core", url: "/work/autonomous-agent-core" },
      ]);

      assert.strictEqual(breadcrumbs["@context"], "https://schema.org");
      assert.strictEqual(breadcrumbs["@type"], "BreadcrumbList");

      const items = breadcrumbs.itemListElement as Array<{
        "@type": string;
        position: number;
        name: string;
        item: string;
      }>;

      assert.strictEqual(items.length, 3);
      const [item1, item2, item3] = items;
      assert.ok(item1 && item2 && item3);

      assert.strictEqual(item1.position, 1);
      assert.strictEqual(item1.name, "Home");
      assert.strictEqual(item1.item, "http://localhost:3000/");

      assert.strictEqual(item2.position, 2);
      assert.strictEqual(item2.name, "Work");
      assert.strictEqual(item2.item, "http://localhost:3000/work");

      assert.strictEqual(item3.position, 3);
      assert.strictEqual(item3.name, "Autonomous Agent Core");
      assert.strictEqual(item3.item, "http://localhost:3000/work/autonomous-agent-core");
    });

    it("guarantees absolute URLs with no query parameters or duplicate slashes", () => {
      process.env.NEXT_PUBLIC_SITE_URL = "https://maxchichar.com/";
      const breadcrumbs = buildBreadcrumbJsonLd([
        { name: "Home", url: "/?ref=test" },
        { name: "Research", url: "//research///" },
        { name: "Paper", url: "/research/my-paper?tracking=1#section" },
      ]);

      const items = breadcrumbs.itemListElement as Array<{ item: string }>;
      const [crumb1, crumb2, crumb3] = items;
      assert.ok(crumb1 && crumb2 && crumb3);
      assert.strictEqual(crumb1.item, "https://maxchichar.com/");
      assert.strictEqual(crumb2.item, "https://maxchichar.com/research");
      assert.strictEqual(crumb3.item, "https://maxchichar.com/research/my-paper");
    });
  });

  describe("7. Security: Safe JSON Serialization & Injection Prevention", () => {
    it("safely escapes '<' as \\u003c to prevent premature script tag termination", () => {
      const maliciousPayload = {
        title: "Malicious Project </script><script>alert('xss')</script>",
        description: "Testing <script> injection and <tag> safety.",
      };

      const serialized = serializeJsonLd(maliciousPayload);

      assert.ok(
        !serialized.includes("</script>"),
        "Serialized output must NOT contain raw </script>",
      );
      assert.ok(
        !serialized.includes("<script>"),
        "Serialized output must NOT contain raw <script>",
      );
      assert.ok(serialized.includes("\\u003c/script>"), "Must escape '<' to \\u003c");

      // Verify it still parses cleanly as valid JSON back to the original content
      const parsed = JSON.parse(serialized);
      assert.strictEqual(parsed.title, maliciousPayload.title);
      assert.strictEqual(parsed.description, maliciousPayload.description);
    });
  });

  describe("8. Graph aggregation & Publication boundaries", () => {
    it("buildJsonLdGraph wraps items in single @graph with top-level @context", () => {
      const webSite = buildWebSiteJsonLd({ siteName: "CHIBUEZE MAXWELL" });
      const person = buildPersonJsonLd({ name: "CHIBUEZE MAXWELL" });

      const graph = buildJsonLdGraph([webSite, person]);

      assert.strictEqual(graph["@context"], "https://schema.org");
      const list = graph["@graph"] as Array<Record<string, unknown>>;
      assert.ok(Array.isArray(list));
      assert.strictEqual(list.length, 2);
      const [first, second] = list;
      assert.ok(first && second);
      assert.strictEqual(first["@type"], "WebSite");
      assert.strictEqual(
        first["@context"],
        undefined,
        "Children in @graph should not have duplicate @context",
      );
      assert.strictEqual(second["@type"], "Person");
    });

    it("filters null or undefined nodes cleanly from @graph", () => {
      const webSite = buildWebSiteJsonLd({ siteName: "CHIBUEZE MAXWELL" });
      const graph = buildJsonLdGraph([webSite, null, undefined]);

      const list = graph["@graph"] as Array<Record<string, unknown>>;
      assert.strictEqual(list.length, 1);
      const [single] = list;
      assert.ok(single);
      assert.strictEqual(single["@type"], "WebSite");
    });
  });

  describe("9. Canonical & Open Graph Consistency", () => {
    it("JSON-LD URL strictly matches page canonical URL and og:url for work detail", () => {
      const slug = "neural-synthesis";
      const path = `/work/${slug}`;
      const pageMeta = constructPageMetadata({
        title: "Neural Synthesis",
        path,
      });

      const work = buildWorkJsonLd({
        title: "Neural Synthesis",
        description: "Neural synthesis research project.",
        slug,
      });

      const alternates = pageMeta.alternates as Record<string, unknown>;
      const og = pageMeta.openGraph as Record<string, unknown>;

      // Relative canonical in metadata
      assert.strictEqual(alternates?.canonical, path);
      assert.strictEqual(og?.url, path);

      // JSON-LD URL resolves the exact same canonical path to absolute
      assert.strictEqual(work.url, resolveCanonicalUrl(path));
      assert.strictEqual(work.url, `http://localhost:3000${path}`);
    });

    it("JSON-LD URL strictly matches page canonical URL and og:url for research detail", () => {
      const slug = "transformer-bounds";
      const path = `/research/${slug}`;
      const pageMeta = constructPageMetadata({
        title: "Transformer Bounds",
        path,
        type: "article",
      });

      const research = buildResearchJsonLd({
        title: "Transformer Bounds",
        abstract: "Theoretical bounds of transformers.",
        slug,
      });

      const alternates = pageMeta.alternates as Record<string, unknown>;
      const og = pageMeta.openGraph as Record<string, unknown>;

      assert.strictEqual(alternates?.canonical, path);
      assert.strictEqual(og?.url, path);
      assert.strictEqual(research.url, resolveCanonicalUrl(path));
    });

    it("JSON-LD URL strictly matches page canonical URL and og:url for writing detail", () => {
      const slug = "future-of-agents";
      const path = `/writing/${slug}`;
      const pageMeta = constructPageMetadata({
        title: "Future of Agents",
        path,
        type: "article",
      });

      const article = buildArticleJsonLd({
        title: "Future of Agents",
        excerpt: "Essay on autonomous systems.",
        slug,
      });

      const alternates = pageMeta.alternates as Record<string, unknown>;
      const og = pageMeta.openGraph as Record<string, unknown>;

      assert.strictEqual(alternates?.canonical, path);
      assert.strictEqual(og?.url, path);
      assert.strictEqual(article.url, resolveCanonicalUrl(path));
    });
  });

  describe("10. Regression: Existing metadata foundation remains intact", () => {
    it("constructBaseMetadata continues providing valid metadataBase, title, and alternates", () => {
      const base = constructBaseMetadata();
      assert.ok(base.metadataBase instanceof URL);
      assert.strictEqual(base.metadataBase.origin, "http://localhost:3000");
      assert.strictEqual((base.alternates as Record<string, unknown>)?.canonical, "/");
      assert.strictEqual((base.openGraph as Record<string, unknown>)?.url, "/");
    });
  });
});
