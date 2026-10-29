import assert from "node:assert";
import { describe, it } from "node:test";

import {
  ASSIST_SYSTEM_PROMPT,
  EXCERPT_MAX,
  assistRequestSchema,
  buildAssistPrompt,
  cleanAiText,
  clipToLength,
  finaliseAssistResult,
  mergeTags,
} from "../src/lib/ai/article-assist";
import { articleDraftUpdateSchema } from "../src/lib/validation/article";

describe("cleanAiText", () => {
  it("replaces em dashes with commas", () => {
    assert.strictEqual(
      cleanAiText("Systems we inherit — and how to change them."),
      "Systems we inherit, and how to change them.",
    );
    assert.strictEqual(cleanAiText("Fast—and cheap"), "Fast, and cheap");
  });

  it("strips wrapping quotes and extra spaces", () => {
    assert.strictEqual(cleanAiText('  "A better  title"  '), "A better title");
    assert.strictEqual(cleanAiText("“Quoted”"), "Quoted");
  });

  it("keeps apostrophes inside words", () => {
    assert.strictEqual(cleanAiText("It's the builder's job"), "It's the builder's job");
  });
});

describe("clipToLength", () => {
  it("leaves short text alone", () => {
    assert.strictEqual(clipToLength("Short.", 300), "Short.");
  });

  it("cuts at a sentence end when one is near", () => {
    const text = `${"a".repeat(200)}. ${"b".repeat(200)}`;
    assert.strictEqual(clipToLength(text, 300), `${"a".repeat(200)}.`);
  });

  it("otherwise cuts at a word and adds an ellipsis", () => {
    const text = "word ".repeat(100).trim();
    const clipped = clipToLength(text, 50);
    assert.ok(clipped.length <= 50);
    assert.ok(clipped.endsWith("word…"));
  });
});

describe("finaliseAssistResult", () => {
  it("cleans and limits the excerpt", () => {
    const result = finaliseAssistResult(
      "excerpt",
      { excerpt: `Why systems fail — ${"really ".repeat(80)}` },
      { title: "T" },
    );
    assert.strictEqual(result.kind, "excerpt");
    if (result.kind !== "excerpt") return;
    assert.ok(result.excerpt.length <= EXCERPT_MAX);
    assert.ok(!result.excerpt.includes("—"));
  });

  it("drops the current title and duplicates from title ideas", () => {
    const result = finaliseAssistResult(
      "titles",
      { titles: ["Current Title", "New one", "new one", "Another — idea", ""] },
      { title: "current title" },
    );
    assert.deepStrictEqual(result, {
      kind: "titles",
      titles: ["New one", "Another, idea"],
    });
  });

  it("cleans tags, removing hashes, duplicates and long entries", () => {
    const result = finaliseAssistResult(
      "tags",
      {
        tags: [
          "#Rust",
          "rust",
          "Systems design",
          "x".repeat(41),
          "AI.",
          "A",
          "B",
          "C",
          "D",
        ],
      },
      { title: "" },
    );
    assert.deepStrictEqual(result, {
      kind: "tags",
      tags: ["Rust", "Systems design", "AI", "A", "B", "C"],
    });
  });

  it("caps review suggestions at six and drops empty ones", () => {
    const suggestions = Array.from({ length: 9 }, (_, i) => ({
      issue: i === 0 ? "" : `Issue ${i}`,
      suggestion: `Fix ${i}`,
    }));
    const result = finaliseAssistResult(
      "review",
      { summary: "Nearly ready — tighten the opening.", suggestions },
      { title: "" },
    );
    assert.strictEqual(result.kind, "review");
    if (result.kind !== "review") return;
    assert.strictEqual(result.summary, "Nearly ready, tighten the opening.");
    assert.strictEqual(result.suggestions.length, 6);
    assert.strictEqual(result.suggestions[0]?.issue, "Issue 1");
  });

  it("rejects an answer of the wrong shape", () => {
    assert.throws(() => finaliseAssistResult("tags", { titles: [] }, { title: "" }));
  });
});

describe("mergeTags", () => {
  it("adds new tags after existing ones without duplicates", () => {
    assert.strictEqual(
      mergeTags("Rust, Career", ["rust", "Systems"]),
      "Rust, Career, Systems",
    );
    assert.strictEqual(mergeTags("", ["A", "B"]), "A, B");
  });
});

describe("prompts", () => {
  it("puts the article after the task, and the house style in the system prompt", () => {
    const prompt = buildAssistPrompt({
      kind: "excerpt",
      title: "On Systems",
      excerpt: "",
      body: "Body text.",
    });
    assert.match(prompt, /^Write the article's excerpt/);
    assert.match(prompt, /<title>On Systems<\/title>/);
    assert.match(prompt, /<excerpt>\(none yet\)<\/excerpt>/);
    assert.match(prompt, /Body text\./);
    assert.match(ASSIST_SYSTEM_PROMPT, /Never use em dashes/);
  });
});

describe("assistRequestSchema", () => {
  const base = {
    articleId: "6f1c1d0e-8b8a-4c55-9a51-2c1f5d7f2a10",
    kind: "tags",
    title: "T",
    excerpt: "",
  };

  it("accepts a normal request", () => {
    assert.ok(assistRequestSchema.safeParse({ ...base, body: "Text" }).success);
  });

  it("refuses unknown kinds and over-long bodies rather than cutting them", () => {
    assert.ok(
      !assistRequestSchema.safeParse({ ...base, kind: "publish", body: "" }).success,
    );
    assert.ok(
      !assistRequestSchema.safeParse({ ...base, body: "x".repeat(120_001) }).success,
    );
  });
});

describe("draft provenance field", () => {
  const draft = {
    title: "T",
    excerpt: "E",
    content: { type: "doc", content: [] },
  };

  it("accepts a Claude response id", () => {
    const parsed = articleDraftUpdateSchema.safeParse({
      ...draft,
      aiGenerationId: "msg_01AbC123",
    });
    assert.ok(parsed.success);
    assert.strictEqual(parsed.data.aiGenerationId, "msg_01AbC123");
  });

  it("rejects anything that isn't an id", () => {
    assert.ok(
      !articleDraftUpdateSchema.safeParse({ ...draft, aiGenerationId: "<script>" })
        .success,
    );
  });
});
