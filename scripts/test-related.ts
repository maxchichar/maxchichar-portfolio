import assert from "node:assert";
import { describe, it } from "node:test";

import { readNext, relatedScore, type ContentCard } from "../src/lib/related";

let n = 0;
const card = (over: Partial<ContentCard>): ContentCard => ({
  type: "writing",
  slug: `s${n}`,
  href: `/writing/s${n++}`,
  title: "",
  summary: "",
  coverUrl: null,
  tags: [],
  category: null,
  date: 0,
  order: 0,
  ...over,
});

const evalWork = card({
  type: "work",
  href: "/work/eval",
  tags: ["Evals", "agents"],
  category: "AI",
  order: 0,
});
const vision = card({ type: "work", href: "/work/vision", tags: ["vision"], order: 1 });
const search = card({ type: "work", href: "/work/search", tags: ["agents"], order: 2 });
const grading = card({
  type: "research",
  href: "/research/grading",
  tags: ["evals"],
  date: 2,
});
const essayOld = card({ href: "/writing/old", tags: ["agents"], date: 1, order: 1 });
const essayNew = card({
  href: "/writing/new",
  tags: ["agents", "evals"],
  date: 5,
  order: 0,
});
const unrelated = card({ href: "/writing/cooking", tags: ["food"], date: 9, order: 2 });
const ALL = [evalWork, vision, search, grading, essayOld, essayNew, unrelated];

describe("read next", () => {
  it("scores shared tags case-insensitively, plus category", () => {
    assert.strictEqual(relatedScore(evalWork, essayNew), 6);
    assert.strictEqual(relatedScore(evalWork, unrelated), 0);
    assert.strictEqual(
      relatedScore(card({ category: "AI" }), card({ category: "ai" })),
      1,
    );
  });

  it("Next up is the most related item of the same type", () => {
    assert.strictEqual(readNext(evalWork, ALL).next?.href, "/work/search");
  });

  it("falls back to the next item in listing order when nothing is related", () => {
    assert.strictEqual(readNext(vision, ALL).next?.href, "/work/search");
    // wraps around
    assert.strictEqual(
      readNext(card({ type: "work", href: "/work/search", tags: [], order: 2 }), [
        evalWork,
        vision,
        card({ type: "work", href: "/work/search", tags: [], order: 2 }),
      ]).next?.href,
      "/work/eval",
    );
  });

  it("Related is cross-type, ranked, excludes Next up, and never padded", () => {
    const { next, related } = readNext(evalWork, ALL);
    assert.deepStrictEqual(
      related.map((c) => c.href),
      ["/writing/new", "/research/grading", "/writing/old"],
    );
    assert.ok(!related.some((c) => c.href === next?.href));
    assert.deepStrictEqual(readNext(vision, ALL).related, []);
  });

  it("has no next when the item is alone of its kind", () => {
    assert.strictEqual(readNext(grading, ALL).next, null);
  });
});
