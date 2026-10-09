import assert from "node:assert";
import { describe, it, beforeEach, afterEach } from "node:test";

import {
  constructBaseMetadata,
  DEFAULT_SITE_DESCRIPTION,
  DEFAULT_SITE_TITLE,
  getMetadataBase,
  getSiteUrl,
} from "../src/lib/metadata";

describe("Base Metadata helper logic (Level 9.1)", () => {
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

  describe("Site URL resolution", () => {
    it("falls back safely to localhost:3000 when no environment variables are set", () => {
      const url = getSiteUrl();
      assert.strictEqual(url, "http://localhost:3000");
    });

    it("respects PORT environment variable in localhost fallback", () => {
      process.env.PORT = "3100";
      const url = getSiteUrl();
      assert.strictEqual(url, "http://localhost:3100");
    });

    it("prioritizes NEXT_PUBLIC_SITE_URL when provided", () => {
      process.env.NEXT_PUBLIC_SITE_URL = "https://custom-public-domain.com";
      process.env.SITE_URL = "https://ignored-server-domain.com";
      assert.strictEqual(getSiteUrl(), "https://custom-public-domain.com");
    });

    it("uses SITE_URL when NEXT_PUBLIC_SITE_URL is not set", () => {
      process.env.SITE_URL = "https://server-domain.com";
      assert.strictEqual(getSiteUrl(), "https://server-domain.com");
    });

    it("uses VERCEL_PROJECT_PRODUCTION_URL when set", () => {
      process.env.VERCEL_PROJECT_PRODUCTION_URL = "my-project.vercel.app";
      assert.strictEqual(getSiteUrl(), "https://my-project.vercel.app");
    });

    it("uses VERCEL_URL when VERCEL_PROJECT_PRODUCTION_URL is not set", () => {
      process.env.VERCEL_URL = "preview-deployment.vercel.app";
      assert.strictEqual(getSiteUrl(), "https://preview-deployment.vercel.app");
    });

    it("normalizes URLs lacking a protocol by prepending https://", () => {
      process.env.NEXT_PUBLIC_SITE_URL = "example.com";
      assert.strictEqual(getSiteUrl(), "https://example.com");
    });

    it("provides a valid URL object for metadataBase", () => {
      const base = getMetadataBase();
      assert.ok(base instanceof URL);
      assert.strictEqual(base.origin, "http://localhost:3000");
    });
  });

  describe("Base Metadata construction", () => {
    it("provides locked default title, description, template, and robots", () => {
      const meta = constructBaseMetadata();

      assert.strictEqual(DEFAULT_SITE_TITLE, "CHIBUEZE MAXWELL");
      assert.strictEqual(
        DEFAULT_SITE_DESCRIPTION,
        "Super Intelligence Engineer & Entrepreneur. I build intelligent systems for real-world problems.",
      );

      assert.ok(meta.metadataBase instanceof URL);
      assert.deepStrictEqual(meta.title, {
        default: "CHIBUEZE MAXWELL",
        template: "%s | CHIBUEZE MAXWELL",
      });
      assert.strictEqual(meta.description, DEFAULT_SITE_DESCRIPTION);
      assert.deepStrictEqual(meta.robots, {
        index: true,
        follow: true,
      });

      // Includes base metadata fields and Level 9.4/9.5 Open Graph, Twitter, and Alternates additions
      const keys = Object.keys(meta).sort();
      assert.deepStrictEqual(keys, [
        "alternates",
        "description",
        "metadataBase",
        "openGraph",
        "robots",
        "title",
        "twitter",
      ]);
      assert.deepStrictEqual(meta.alternates, {
        canonical: "/",
      });
    });

    it("applies settings-driven siteName to title default and template", () => {
      const meta = constructBaseMetadata({
        siteName: "Maxwell C.",
        siteDescription: "Custom AI research portfolio.",
      });

      assert.deepStrictEqual(meta.title, {
        default: "Maxwell C.",
        template: "%s | Maxwell C.",
      });
      assert.strictEqual(meta.description, "Custom AI research portfolio.");
    });

    it("preserves established fallback CHIBUEZE MAXWELL when siteName is empty or whitespace", () => {
      const metaEmpty = constructBaseMetadata({ siteName: "" });
      assert.deepStrictEqual(metaEmpty.title, {
        default: "CHIBUEZE MAXWELL",
        template: "%s | CHIBUEZE MAXWELL",
      });

      const metaWhitespace = constructBaseMetadata({ siteName: "   " });
      assert.deepStrictEqual(metaWhitespace.title, {
        default: "CHIBUEZE MAXWELL",
        template: "%s | CHIBUEZE MAXWELL",
      });
    });

    it("uses DEFAULT_SITE_DESCRIPTION when settings description is blank or null", () => {
      const meta = constructBaseMetadata({
        siteName: "CHIBUEZE MAXWELL",
        siteDescription: null,
      });

      assert.strictEqual(meta.description, DEFAULT_SITE_DESCRIPTION);
    });
  });
});
