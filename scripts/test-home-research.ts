import assert from "node:assert/strict";
import { test } from "node:test";
import { selectHomepageResearch } from "../src/lib/home-work";
import { researchDraftUpdateSchema } from "../src/lib/validation/research";

function item(id: string, publishedAt: string | null, featured = false, sortOrder = 0) {
  return { id, research: { featured, sortOrder }, published: { publishedAt } };
}

test("published unfeatured research appears on homepage without a featured flag", () => {
  const rows = [item("older", "2026-10-01"), item("stagnation", "2026-10-22")];
  const result = selectHomepageResearch(rows, 3);
  assert.deepEqual(
    result.map((r) => r.id),
    ["stagnation", "older"],
  );
  assert.equal(result[0], rows[1]);
  assert.deepEqual(
    rows.map((r) => r.id),
    ["older", "stagnation"],
  );
});

test("curated research comes first, fills remaining slots and breaks ties by recency", () => {
  const rows = [
    item("old", null),
    item("recent", "2026-10-22"),
    item("second", "2026-10-20", true, 2),
    item("first", "2026-10-01", true, 1),
    item("tie", "2026-10-22", true, 2),
  ];
  assert.deepEqual(
    selectHomepageResearch(rows, 4).map((r) => r.id),
    ["first", "tie", "second", "recent"],
  );
  assert.deepEqual(selectHomepageResearch([], 3), []);
  assert.equal(selectHomepageResearch(rows, 0).length, 0);
});

test("research cover supports keeping, setting and clearing with UUID validation", () => {
  const patch = {
    title: "Paper",
    type: "Investigation",
    abstract: "Abstract",
    sections: [],
    tags: [],
  };
  assert.equal(researchDraftUpdateSchema.parse(patch).coverMediaId, undefined);
  assert.equal(
    researchDraftUpdateSchema.parse({ ...patch, coverMediaId: null }).coverMediaId,
    null,
  );
  const id = "10000000-0000-4000-8000-000000000001";
  assert.equal(
    researchDraftUpdateSchema.parse({ ...patch, coverMediaId: id }).coverMediaId,
    id,
  );
  assert.equal(
    researchDraftUpdateSchema.safeParse({ ...patch, coverMediaId: "invalid" }).success,
    false,
  );
});
