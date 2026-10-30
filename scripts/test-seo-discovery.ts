import assert from "node:assert";
import { afterEach, describe, it } from "node:test";

import { buildIndexNowPayload, getIndexNowKey } from "../src/lib/indexnow";
import {
  buildVerification,
  constructBaseMetadata,
  constructPageMetadata,
  SITE_VIEWPORT,
} from "../src/lib/metadata";

const originalEnv = { ...process.env };

describe("Search engine verification", () => {
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("verifies Google site-wide by default and omits unset engines", () => {
    delete process.env.BING_SITE_VERIFICATION;
    delete process.env.YANDEX_SITE_VERIFICATION;
    delete process.env.PINTEREST_SITE_VERIFICATION;
    delete process.env.GOOGLE_SITE_VERIFICATION;
    const v = buildVerification();
    assert.ok(v?.google);
    assert.strictEqual(v?.yandex, undefined);
    assert.strictEqual(v?.other, undefined);
    assert.deepStrictEqual(constructBaseMetadata().verification, v);
  });

  it("adds Bing (msvalidate.01) and Yandex tokens from the environment", () => {
    process.env.BING_SITE_VERIFICATION = " bing-token ";
    process.env.YANDEX_SITE_VERIFICATION = "yandex-token";
    const v = buildVerification();
    assert.strictEqual(v?.yandex, "yandex-token");
    assert.deepStrictEqual(v?.other, { "msvalidate.01": "bing-token" });
  });
});

describe("Browser and crawler metadata", () => {
  it("allows large image previews and full snippets", () => {
    const robots = constructBaseMetadata().robots as {
      googleBot: Record<string, unknown>;
    };
    assert.strictEqual(robots.googleBot["max-image-preview"], "large");
    assert.strictEqual(robots.googleBot["max-snippet"], -1);
  });

  it("sets a theme colour for both colour schemes", () => {
    assert.strictEqual(Array.isArray(SITE_VIEWPORT.themeColor), true);
    assert.strictEqual((SITE_VIEWPORT.themeColor as unknown[]).length, 2);
  });

  it("adds article dates, author and tags to Open Graph", () => {
    const meta = constructPageMetadata({
      title: "Post",
      path: "/writing/post",
      type: "article",
      publishedTime: new Date("2026-01-02T00:00:00Z"),
      modifiedTime: "not a date",
      tags: ["AI"],
    });
    const og = meta.openGraph as Record<string, unknown>;
    assert.strictEqual(og.publishedTime, "2026-01-02T00:00:00.000Z");
    assert.strictEqual(og.modifiedTime, undefined);
    assert.deepStrictEqual(og.authors, ["Chibueze Maxwell"]);
    assert.deepStrictEqual(og.tags, ["AI"]);
  });

  it("keeps article fields off website pages", () => {
    const og = constructPageMetadata({
      title: "Work",
      path: "/work",
      publishedTime: new Date(),
    }).openGraph as Record<string, unknown>;
    assert.strictEqual(og.publishedTime, undefined);
    assert.strictEqual(og.authors, undefined);
  });
});

describe("IndexNow", () => {
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("accepts only spec-valid keys", () => {
    process.env.INDEXNOW_KEY = "short";
    assert.strictEqual(getIndexNowKey(), null);
    process.env.INDEXNOW_KEY = "abc_def_ghi";
    assert.strictEqual(getIndexNowKey(), null);
    process.env.INDEXNOW_KEY = " 0123456789abcdef ";
    assert.strictEqual(getIndexNowKey(), "0123456789abcdef");
  });

  it("builds an absolute, de-duplicated submission", () => {
    const payload = buildIndexNowPayload("https://chibuezemaxwell.com", "0123456789", [
      "/writing/a",
      "/writing/a",
      "/",
    ]);
    assert.deepStrictEqual(payload, {
      host: "chibuezemaxwell.com",
      key: "0123456789",
      keyLocation: "https://chibuezemaxwell.com/indexnow.txt",
      urlList: ["https://chibuezemaxwell.com/writing/a", "https://chibuezemaxwell.com/"],
    });
  });

  it("never submits without a key, for local sites, or with no URLs", () => {
    assert.strictEqual(buildIndexNowPayload("https://x.com", null, ["/"]), null);
    assert.strictEqual(
      buildIndexNowPayload("http://localhost:3000", "0123456789", ["/"]),
      null,
    );
    assert.strictEqual(buildIndexNowPayload("https://x.com", "0123456789", []), null);
  });
});

describe("Person entity", () => {
  it("writes names as people write them, not in display capitals", async () => {
    const { toPersonName } = await import("../src/lib/structured-data");
    assert.strictEqual(toPersonName("CHIBUEZE MAXWELL"), "Chibueze Maxwell");
    assert.strictEqual(toPersonName("ADA LOVELACE-KING"), "Ada Lovelace-King");
    assert.strictEqual(toPersonName("Ada McLovelace"), "Ada McLovelace");
  });

  it("carries description, image and evidenced topics, deduplicated", async () => {
    const { buildPersonJsonLd } = await import("../src/lib/structured-data");
    const person = buildPersonJsonLd({
      name: "CHIBUEZE MAXWELL",
      description: " AI engineer ",
      image: "https://cdn.example/me.jpg",
      knowsAbout: ["AI", "AI", " "],
    })!;
    assert.strictEqual(person.alternateName, "MAXCHICHAR");
    assert.strictEqual(person.description, "AI engineer");
    assert.strictEqual(person.image, "https://cdn.example/me.jpg");
    assert.deepStrictEqual(person.knowsAbout, ["AI"]);
    assert.ok(String(person.mainEntityOfPage).endsWith("/about"));
  });

  it("links content to the person as author and publisher, and to the site", async () => {
    const { buildArticleJsonLd } = await import("../src/lib/structured-data");
    const article = buildArticleJsonLd({
      title: "T",
      excerpt: "E",
      slug: "t",
      authorName: "CHIBUEZE MAXWELL",
    });
    assert.strictEqual(article.mainEntityOfPage, article.url);
    assert.deepStrictEqual(article.publisher, {
      "@id": "http://localhost:3000/#person",
    });
    assert.deepStrictEqual(article.isPartOf, { "@id": "http://localhost:3000/#website" });
    assert.strictEqual(article.inLanguage, "en");
  });
});
