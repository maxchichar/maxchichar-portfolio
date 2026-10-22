import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { selectHomepageWork } from "../src/lib/home-work";

function item(id: string, publishedAt: string | null, featured = false, sortOrder = 0) {
  return { id, project: { featured, sortOrder }, published: { publishedAt } };
}

describe("homepage work selection", () => {
  it("shows newly published unfeatured projects instead of an empty homepage", () => {
    const rows = [item("old", "2026-10-01"), item("recent", "2026-10-22")];
    assert.deepEqual(
      selectHomepageWork(rows, 4).map((r) => r.id),
      ["recent", "old"],
    );
    assert.deepEqual(
      rows.map((r) => r.id),
      ["old", "recent"],
    );
  });
  it("keeps featured ordering and fills remaining slots with recent work", () => {
    const rows = [
      item("old", "2026-10-01"),
      item("featured-second", "2026-10-22", true, 2),
      item("recent", "2026-10-22"),
      item("featured-first", "2026-10-01", true, 1),
    ];
    assert.deepEqual(
      selectHomepageWork(rows, 3).map((r) => r.id),
      ["featured-first", "featured-second", "recent"],
    );
  });
  it("handles no published work and missing publication dates", () => {
    assert.deepEqual(selectHomepageWork([], 4), []);
    assert.deepEqual(
      selectHomepageWork([item("undated", null), item("recent", "2026-10-22")], 1).map(
        (r) => r.id,
      ),
      ["recent"],
    );
  });
});
