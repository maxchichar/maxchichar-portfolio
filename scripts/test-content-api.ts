import assert from "node:assert";
import { describe, it } from "node:test";

import {
  API_KEY_PREFIX,
  generateApiKey,
  hashApiKey,
  normaliseScopes,
  parseBearerKey,
} from "../src/lib/api-keys";
import {
  createArticleRequestSchema,
  firstIssue,
  requestContent,
  serializeArticle,
  updateDraftRequestSchema,
} from "../src/lib/content-api";

describe("API keys", () => {
  it("generates long, unique, prefixed keys", () => {
    const a = generateApiKey();
    const b = generateApiKey();
    assert.ok(a.startsWith(API_KEY_PREFIX));
    assert.ok(a.length >= 40);
    assert.notStrictEqual(a, b);
  });

  it("stores a stable SHA-256 hash, never the key", () => {
    const key = generateApiKey();
    assert.strictEqual(hashApiKey(key), hashApiKey(key));
    assert.match(hashApiKey(key), /^[0-9a-f]{64}$/);
    assert.ok(!hashApiKey(key).includes(key));
  });

  it("never grants publish, and draft implies read", () => {
    assert.deepStrictEqual(normaliseScopes(["content:publish", "content:draft"]), [
      "content:read",
      "content:draft",
    ]);
    assert.deepStrictEqual(normaliseScopes(["content:publish", 3, "admin"]), []);
    assert.deepStrictEqual(normaliseScopes(["content:read"]), ["content:read"]);
  });

  it("reads only well-formed bearer keys", () => {
    const key = generateApiKey();
    assert.strictEqual(parseBearerKey(`Bearer ${key}`), key);
    assert.strictEqual(parseBearerKey(`bearer   ${key} `), key);
    assert.strictEqual(parseBearerKey(key), null);
    assert.strictEqual(parseBearerKey("Bearer sk-something-else"), null);
    assert.strictEqual(parseBearerKey(null), null);
    assert.strictEqual(
      parseBearerKey(`Bearer ${API_KEY_PREFIX}${"x".repeat(300)}`),
      null,
    );
  });
});

describe("request schemas", () => {
  const create = { slug: "on-systems", title: "On Systems", excerpt: "Why they fail." };

  it("accepts a new article with a Markdown body", () => {
    assert.ok(createArticleRequestSchema.safeParse({ ...create, body: "# Hi" }).success);
  });

  it("rejects bad slugs, unknown fields and both body formats at once", () => {
    const bad = createArticleRequestSchema.safeParse({ ...create, slug: "On Systems" });
    assert.ok(!bad.success);
    assert.match(firstIssue(bad.error), /^slug: /);
    assert.ok(
      !createArticleRequestSchema.safeParse({ ...create, publish: true }).success,
    );
    assert.ok(
      !createArticleRequestSchema.safeParse({
        ...create,
        body: "x",
        content: { type: "doc", content: [] },
      }).success,
    );
  });

  it("needs at least one field to update and refuses a status change", () => {
    assert.ok(!updateDraftRequestSchema.safeParse({}).success);
    assert.ok(updateDraftRequestSchema.safeParse({ title: "New" }).success);
    assert.ok(!updateDraftRequestSchema.safeParse({ status: "PUBLISHED" }).success);
  });

  it("turns Markdown into an editor document", () => {
    const doc = requestContent({ body: "## Heading\n\nSome **bold** text." }) as {
      type: string;
      content: { type: string }[];
    };
    assert.strictEqual(doc.type, "doc");
    assert.strictEqual(doc.content[0]?.type, "heading");
    assert.strictEqual(requestContent({}), undefined);
  });
});

describe("serializeArticle", () => {
  const version = {
    id: "v1",
    versionNumber: 2,
    status: "DRAFT",
    title: "On Systems",
    excerpt: "Why they fail.",
    category: null,
    content: {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Hello." }] }],
    },
    readingTime: 1,
    createdByType: "AI",
    generationMode: "AI_GENERATED",
    source: "content-api:Writing agent",
    createdAt: new Date("2026-10-29T10:00:00Z"),
    publishedAt: null,
  };

  it("returns both formats, provenance, and no live URL for an unpublished draft", () => {
    const out = serializeArticle(
      {
        article: {
          id: "a1",
          slug: "on-systems",
          status: "ACTIVE",
          createdAt: new Date("2026-10-29T10:00:00Z"),
        },
        draft: version,
        published: null,
        tags: [{ name: "Systems" }],
      },
      "https://chibuezemaxwell.com",
    );
    assert.strictEqual(out.url, null);
    assert.deepStrictEqual(out.tags, ["Systems"]);
    assert.strictEqual(out.draft?.markdown.trim(), "Hello.");
    assert.deepStrictEqual(out.draft?.provenance, {
      createdByType: "AI",
      generationMode: "AI_GENERATED",
      source: "content-api:Writing agent",
    });
    assert.strictEqual(out.published, null);
  });

  it("links to the live page once published", () => {
    const out = serializeArticle(
      {
        article: {
          id: "a1",
          slug: "on-systems",
          status: "ACTIVE",
          createdAt: new Date(),
        },
        draft: null,
        published: { ...version, status: "PUBLISHED", publishedAt: new Date() },
        tags: [],
      },
      "https://chibuezemaxwell.com/",
    );
    assert.strictEqual(out.url, "https://chibuezemaxwell.com/writing/on-systems");
  });
});
