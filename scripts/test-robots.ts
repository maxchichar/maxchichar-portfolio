import assert from "node:assert";
import { describe, it, beforeEach, afterEach } from "node:test";

import robots from "../src/app/robots";

describe("Robots configuration (Level 9.2)", () => {
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

  it("produces standard crawler policy for all user agents", () => {
    const config = robots();

    assert.ok(config.rules, "Robots rules must be defined");
    assert.ok(Array.isArray(config.rules));

    const rules = Array.isArray(config.rules) ? config.rules[0]! : config.rules;

    assert.strictEqual(rules.userAgent, "*");
    assert.strictEqual(rules.allow, "/");

    const disallows = Array.isArray(rules.disallow) ? rules.disallow : [rules.disallow];

    assert.ok(disallows.includes("/admin/"), "Must disallow /admin/");
    assert.ok(disallows.includes("/admin/*"), "Must disallow /admin/*");
    assert.ok(disallows.includes("/api/"), "Must disallow /api/");
    assert.ok(disallows.includes("/api/*"), "Must disallow /api/*");

    // Must not disallow public routes
    const publicPaths = [
      "/",
      "/work",
      "/work/any-slug",
      "/research",
      "/research/any-slug",
      "/writing",
      "/writing/any-slug",
      "/about",
      "/now",
      "/contact",
    ];

    for (const p of publicPaths) {
      assert.strictEqual(
        disallows.includes(p),
        false,
        `Public route ${p} must not be disallowed`,
      );
    }
  });

  it("points to canonical /sitemap.xml with localhost fallback", () => {
    const config = robots();
    assert.strictEqual(config.sitemap, "http://localhost:3000/sitemap.xml");
  });

  it("respects PORT environment variable in sitemap URL fallback", () => {
    process.env.PORT = "3100";
    const config = robots();
    assert.strictEqual(config.sitemap, "http://localhost:3100/sitemap.xml");
  });

  it("points to configured NEXT_PUBLIC_SITE_URL /sitemap.xml without double slashes", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://custom-domain.com";
    const config = robots();
    assert.strictEqual(config.sitemap, "https://custom-domain.com/sitemap.xml");

    // Trailing slash handling
    process.env.NEXT_PUBLIC_SITE_URL = "https://custom-domain.com/";
    const configWithSlash = robots();
    assert.strictEqual(configWithSlash.sitemap, "https://custom-domain.com/sitemap.xml");
  });

  it("respects Vercel deployment URL environment variables", () => {
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "portfolio-os.vercel.app";
    const config = robots();
    assert.strictEqual(config.sitemap, "https://portfolio-os.vercel.app/sitemap.xml");
  });

  it("names AI search and training crawlers in their own groups", () => {
    delete process.env.AI_TRAINING_CRAWLERS;
    const rules = robots().rules as Array<{
      userAgent: string | string[];
      allow?: string | string[];
      disallow?: string | string[];
    }>;
    const group = (ua: string) =>
      rules.find((r) =>
        (Array.isArray(r.userAgent) ? r.userAgent : [r.userAgent]).includes(ua),
      )!;
    for (const ua of ["OAI-SearchBot", "PerplexityBot", "Claude-SearchBot", "GPTBot"]) {
      assert.strictEqual(group(ua).allow, "/", ua);
      assert.ok((group(ua).disallow as string[]).includes("/admin/"), ua);
    }
  });

  it("can block training crawlers without touching search or AI search", () => {
    process.env.AI_TRAINING_CRAWLERS = "block";
    const rules = robots().rules as Array<{
      userAgent: string[] | string;
      disallow?: unknown;
      allow?: unknown;
    }>;
    const training = rules.find((r) => (r.userAgent as string[]).includes?.("GPTBot"))!;
    assert.strictEqual(training.disallow, "/");
    const search = rules.find((r) =>
      (r.userAgent as string[]).includes?.("OAI-SearchBot"),
    )!;
    assert.strictEqual(search.allow, "/");
    assert.strictEqual(rules[0]!.allow, "/");
  });
});
