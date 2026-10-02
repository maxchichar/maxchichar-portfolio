import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";

import {
  constructBaseMetadata,
  constructPageMetadata,
  DEFAULT_OG_IMAGE,
  DEFAULT_SITE_DESCRIPTION,
  DEFAULT_SITE_TITLE,
  getMetadataBase,
  getSiteUrl,
} from "../src/lib/metadata";

describe("Open Graph & Twitter Metadata (Level 9.4)", () => {
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

  describe("Default OG image asset", () => {
    it("default OG image exists at public/og-default.png with non-zero size", () => {
      const imgPath = path.join(process.cwd(), "public", "og-default.png");
      assert.ok(fs.existsSync(imgPath), "public/og-default.png must exist");

      const stats = fs.statSync(imgPath);
      assert.ok(stats.size > 0, "public/og-default.png must not be empty");
    });

    it("default image path constant matches /og-default.png", () => {
      assert.strictEqual(DEFAULT_OG_IMAGE, "/og-default.png");
    });
  });

  describe("Root Metadata Open Graph & Twitter configuration", () => {
    it("provides root Open Graph metadata with title, description, siteName, url, type, and default image", () => {
      const meta = constructBaseMetadata();
      const og = meta.openGraph as Record<string, unknown> | undefined;

      assert.ok(og, "Root metadata must include openGraph");
      assert.strictEqual(og.title, DEFAULT_SITE_TITLE);
      assert.strictEqual(og.description, DEFAULT_SITE_DESCRIPTION);
      assert.strictEqual(og.siteName, DEFAULT_SITE_TITLE);
      assert.strictEqual(og.url, "/");
      assert.strictEqual(og.type, "website");
      assert.deepStrictEqual(og.images, [DEFAULT_OG_IMAGE]);
    });

    it("provides root Twitter Card metadata with summary_large_image, title, description, and default image", () => {
      const meta = constructBaseMetadata();
      const tw = meta.twitter as Record<string, unknown> | undefined;

      assert.ok(tw, "Root metadata must include twitter");
      assert.strictEqual(tw.card, "summary_large_image");
      assert.strictEqual(tw.title, DEFAULT_SITE_TITLE);
      assert.strictEqual(tw.description, DEFAULT_SITE_DESCRIPTION);
      assert.deepStrictEqual(tw.images, [DEFAULT_OG_IMAGE]);
    });

    it("strictly omits Twitter/X handles (no fake site or creator handle)", () => {
      const meta = constructBaseMetadata();
      const tw = meta.twitter as Record<string, unknown> | undefined;

      assert.strictEqual(tw?.site, undefined);
      assert.strictEqual(tw?.creator, undefined);
    });

    it("adapts root Open Graph and Twitter metadata to custom settings", () => {
      const meta = constructBaseMetadata({
        siteName: "Custom Maxwell",
        siteDescription: "Custom AI research portfolio description.",
      });
      const og = meta.openGraph as Record<string, unknown> | undefined;
      const tw = meta.twitter as Record<string, unknown> | undefined;

      assert.strictEqual(og?.title, "Custom Maxwell");
      assert.strictEqual(og?.description, "Custom AI research portfolio description.");
      assert.strictEqual(og?.siteName, "Custom Maxwell");
      assert.strictEqual(tw?.title, "Custom Maxwell");
      assert.strictEqual(tw?.description, "Custom AI research portfolio description.");
    });
  });

  describe("Detail pages and cover image fallback", () => {
    it("uses legitimate coverUrl when provided for Open Graph and Twitter images", () => {
      const meta = constructPageMetadata({
        title: "Autonomous Agent Core",
        description: "An AI system case study.",
        path: "/work/autonomous-agent-core",
        image: "https://storage.example.com/media/case-study-cover.png",
        type: "website",
      });
      const og = meta.openGraph as Record<string, unknown> | undefined;
      const tw = meta.twitter as Record<string, unknown> | undefined;

      assert.strictEqual(meta.title, "Autonomous Agent Core");
      assert.strictEqual(meta.description, "An AI system case study.");
      assert.deepStrictEqual(og?.images, [
        "https://storage.example.com/media/case-study-cover.png",
      ]);
      assert.deepStrictEqual(tw?.images, [
        "https://storage.example.com/media/case-study-cover.png",
      ]);
      assert.strictEqual(og?.type, "website");
      assert.strictEqual(og?.url, "/work/autonomous-agent-core");
      assert.strictEqual(tw?.card, "summary_large_image");
      assert.strictEqual(tw?.title, "Autonomous Agent Core");
      assert.strictEqual(tw?.description, "An AI system case study.");
    });

    it("falls back cleanly to /og-default.png when coverUrl is null, undefined, or empty", () => {
      const metaNull = constructPageMetadata({
        title: "Research Paper",
        description: "Abstract notes.",
        path: "/research/neural-arch",
        image: null,
        type: "article",
      });
      const ogNull = metaNull.openGraph as Record<string, unknown> | undefined;
      const twNull = metaNull.twitter as Record<string, unknown> | undefined;
      assert.deepStrictEqual(ogNull?.images, [DEFAULT_OG_IMAGE]);
      assert.deepStrictEqual(twNull?.images, [DEFAULT_OG_IMAGE]);
      assert.strictEqual(ogNull?.type, "article");

      const metaUndefined = constructPageMetadata({
        title: "Essay Title",
        description: "Excerpt notes.",
        path: "/writing/future-of-ai",
        image: undefined,
        type: "article",
      });
      const ogUndef = metaUndefined.openGraph as Record<string, unknown> | undefined;
      const twUndef = metaUndefined.twitter as Record<string, unknown> | undefined;
      assert.deepStrictEqual(ogUndef?.images, [DEFAULT_OG_IMAGE]);
      assert.deepStrictEqual(twUndef?.images, [DEFAULT_OG_IMAGE]);

      const metaEmpty = constructPageMetadata({
        title: "Empty Image",
        description: "Description",
        image: "   ",
      });
      const ogEmpty = metaEmpty.openGraph as Record<string, unknown> | undefined;
      const twEmpty = metaEmpty.twitter as Record<string, unknown> | undefined;
      assert.deepStrictEqual(ogEmpty?.images, [DEFAULT_OG_IMAGE]);
      assert.deepStrictEqual(twEmpty?.images, [DEFAULT_OG_IMAGE]);
    });

    it("strictly omits Twitter handles on page metadata", () => {
      const meta = constructPageMetadata({
        title: "Test Page",
        path: "/test",
      });
      const tw = meta.twitter as Record<string, unknown> | undefined;

      assert.strictEqual(tw?.site, undefined);
      assert.strictEqual(tw?.creator, undefined);
    });

    it("defaults to website type when no type is specified", () => {
      const meta = constructPageMetadata({
        title: "Selected Work",
        path: "/work",
      });
      const og = meta.openGraph as Record<string, unknown> | undefined;
      assert.strictEqual(og?.type, "website");
    });
  });

  describe("Site URL mechanism integration", () => {
    it("metadata uses the existing site URL resolution mechanism", () => {
      process.env.NEXT_PUBLIC_SITE_URL = "https://maxchichar.com";
      const siteUrl = getSiteUrl();
      const metaBase = getMetadataBase();
      const meta = constructBaseMetadata();

      assert.strictEqual(siteUrl, "https://maxchichar.com");
      assert.strictEqual(metaBase.origin, "https://maxchichar.com");
      assert.strictEqual(
        (meta.metadataBase as URL | undefined)?.origin,
        "https://maxchichar.com",
      );
    });
  });
});
