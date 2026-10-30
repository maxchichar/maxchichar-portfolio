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
    assert.deepStrictEqual(person.alternateName, [
      "MAXCHICHAR",
      "Chibueze Charles Maxwell",
    ]);
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

describe("CollectionPage structured data", () => {
  it("lists a section's items in order, each at its canonical URL", async () => {
    const { buildCollectionPageJsonLd } = await import("../src/lib/structured-data");
    const graph = buildCollectionPageJsonLd({
      path: "/work",
      name: "Selected Work",
      description: " Projects ",
      items: [
        { path: "/work/repotrace", name: "RepoTrace" },
        { path: "/work/refjou", name: "RefJou" },
      ],
    }) as { "@context": string; "@graph": Array<Record<string, unknown>> };

    assert.strictEqual(graph["@context"], "https://schema.org");
    const [page, list, breadcrumbs] = graph["@graph"];
    assert.strictEqual(page!["@type"], "CollectionPage");
    assert.strictEqual(page!.url, "http://localhost:3000/work");
    assert.strictEqual(page!.description, "Projects");
    assert.deepStrictEqual(page!.mainEntity, { "@id": list!["@id"] });
    assert.deepStrictEqual(page!.about, { "@id": "http://localhost:3000/#person" });
    assert.deepStrictEqual(page!.isPartOf, { "@id": "http://localhost:3000/#website" });

    assert.strictEqual(list!["@type"], "ItemList");
    assert.strictEqual(list!.numberOfItems, 2);
    assert.deepStrictEqual(list!.itemListElement, [
      {
        "@type": "ListItem",
        position: 1,
        url: "http://localhost:3000/work/repotrace",
        name: "RepoTrace",
      },
      {
        "@type": "ListItem",
        position: 2,
        url: "http://localhost:3000/work/refjou",
        name: "RefJou",
      },
    ]);

    assert.strictEqual(breadcrumbs!["@type"], "BreadcrumbList");
    assert.strictEqual((breadcrumbs!.itemListElement as unknown[]).length, 2);
    // Nested nodes in a @graph never repeat @context.
    for (const node of graph["@graph"]) assert.strictEqual(node["@context"], undefined);
  });

  it("omits an empty description", async () => {
    const { buildCollectionPageJsonLd } = await import("../src/lib/structured-data");
    const graph = buildCollectionPageJsonLd({
      path: "/writing",
      name: "Writing",
      description: "  ",
      items: [],
    }) as { "@graph": Array<Record<string, unknown>> };
    assert.strictEqual(graph["@graph"][0]!.description, undefined);
    assert.strictEqual(graph["@graph"][1]!.numberOfItems, 0);
  });
});

describe("SoftwareSourceCode structured data", () => {
  const base = {
    title: "RefJou",
    description: "Reference journal.",
    slug: "refjou",
    authorName: "CHIBUEZE MAXWELL",
  };

  it("separates programming languages from frameworks and tools", async () => {
    const { programmingLanguagesOf } = await import("../src/lib/structured-data");
    assert.deepStrictEqual(
      programmingLanguagesOf(["TypeScript", "Next.js", "python", "Docker", "ts", "C++"]),
      ["TypeScript", "Python", "C++"],
    );
    assert.deepStrictEqual(programmingLanguagesOf(null), []);
  });

  it("describes the repository and links back to a software project", async () => {
    const { buildSourceCodeJsonLd, buildWorkJsonLd } =
      await import("../src/lib/structured-data");
    const options = {
      ...base,
      category: "Web Application",
      githubUrl: " https://github.com/maxchichar/refjou ",
      technologies: ["TypeScript", "Next.js", "PostgreSQL"],
    };
    const work = buildWorkJsonLd(options);
    const code = buildSourceCodeJsonLd(options)!;

    assert.strictEqual(code["@type"], "SoftwareSourceCode");
    assert.strictEqual(code.codeRepository, "https://github.com/maxchichar/refjou");
    assert.strictEqual(code.url, "https://github.com/maxchichar/refjou");
    assert.strictEqual(code.programmingLanguage, "TypeScript");
    assert.strictEqual(code.keywords, "TypeScript, Next.js, PostgreSQL");
    assert.strictEqual((code.author as Record<string, unknown>).name, "Chibueze Maxwell");
    assert.deepStrictEqual(code.targetProduct, { "@id": work["@id"] });
    assert.deepStrictEqual(work.isBasedOn, { "@id": code["@id"] });
  });

  it("links a non-software project only through isBasedOn", async () => {
    const { buildSourceCodeJsonLd, buildWorkJsonLd } =
      await import("../src/lib/structured-data");
    const options = { ...base, githubUrl: "https://github.com/maxchichar/py-modu" };
    const code = buildSourceCodeJsonLd(options)!;
    assert.strictEqual(code.targetProduct, undefined);
    assert.strictEqual(code.programmingLanguage, undefined);
    assert.deepStrictEqual(buildWorkJsonLd(options).isBasedOn, { "@id": code["@id"] });
  });

  it("adds nothing without a usable repository URL", async () => {
    const { buildSourceCodeJsonLd, buildWorkJsonLd } =
      await import("../src/lib/structured-data");
    for (const githubUrl of [
      null,
      "",
      "  ",
      "github.com/no-scheme",
      "javascript:alert(1)",
    ]) {
      assert.strictEqual(
        buildSourceCodeJsonLd({ ...base, githubUrl }),
        null,
        String(githubUrl),
      );
      assert.strictEqual(buildWorkJsonLd({ ...base, githubUrl }).isBasedOn, undefined);
    }
  });
});
