import assert from "node:assert";
import { describe, it } from "node:test";

import {
  buildTopics,
  describeCounts,
  groupTopicItems,
  relatedTopics,
  topicHref,
  type TaggedCard,
} from "../src/lib/topics";

let n = 0;
const tag = (name: string) => ({
  name,
  slug: name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, ""),
});
const card = (over: Partial<TaggedCard> & { tagNames?: string[] }): TaggedCard => {
  const { tagNames = [], ...rest } = over;
  const i = n++;
  return {
    type: "writing",
    slug: `s${i}`,
    href: `/writing/s${i}`,
    title: `Item ${i}`,
    summary: "",
    coverUrl: null,
    tags: tagNames,
    tagRefs: tagNames.map(tag),
    category: null,
    date: 0,
    order: 0,
    ...rest,
  };
};

const agentsWork = card({ type: "work", tagNames: ["Agents", "Evals"], date: 3 });
const agentsEssay = card({ tagNames: ["Agents"], date: 9 });
const evalsResearch = card({ type: "research", tagNames: ["Evals", "Vision"], date: 1 });
const lonely = card({ tagNames: ["Robotics"], date: 2 });
const cards = [agentsWork, agentsEssay, evalsResearch, lonely];

describe("topics", () => {
  it("builds one topic per tag slug, most used first, ties alphabetical", () => {
    const topics = buildTopics(cards);
    assert.deepStrictEqual(
      topics.map((t) => [t.slug, t.count]),
      [
        ["agents", 2],
        ["evals", 2],
        ["robotics", 1],
        ["vision", 1],
      ],
    );
  });

  it("counts by type and orders items newest first", () => {
    const agents = buildTopics(cards).find((t) => t.slug === "agents")!;
    assert.deepStrictEqual(agents.counts, { work: 1, research: 0, writing: 1 });
    assert.deepStrictEqual(agents.items, [agentsEssay, agentsWork]);
  });

  it("ignores duplicate and empty slugs on a card", () => {
    const messy = card({
      tagRefs: [
        { name: "C++", slug: "c" },
        { name: "C", slug: "c" },
        { name: "+++", slug: "" },
      ],
    });
    const topics = buildTopics([messy]);
    assert.deepStrictEqual(
      topics.map((t) => [t.slug, t.name, t.count]),
      [["c", "C++", 1]],
    );
  });

  it("groups items in site order and skips empty groups", () => {
    const agents = buildTopics(cards).find((t) => t.slug === "agents")!;
    assert.deepStrictEqual(
      groupTopicItems(agents).map((g) => [g.type, g.items.length]),
      [
        ["work", 1],
        ["writing", 1],
      ],
    );
  });

  it("finds related topics by shared items", () => {
    const topics = buildTopics(cards);
    const evals = topics.find((t) => t.slug === "evals")!;
    assert.deepStrictEqual(
      relatedTopics(evals, topics).map((t) => t.slug),
      ["agents", "vision"],
    );
    const robotics = topics.find((t) => t.slug === "robotics")!;
    assert.deepStrictEqual(relatedTopics(robotics, topics), []);
  });

  it("describes counts in plain English", () => {
    assert.strictEqual(describeCounts({ work: 1, research: 0, writing: 0 }), "1 project");
    assert.strictEqual(
      describeCounts({ work: 2, research: 1, writing: 3 }),
      "2 projects, 1 research piece and 3 essays",
    );
    assert.strictEqual(
      describeCounts({ work: 0, research: 2, writing: 1 }),
      "2 research pieces and 1 essay",
    );
  });

  it("links tags to topic pages, or not at all without a slug", () => {
    assert.strictEqual(topicHref({ slug: "agents" }), "/topics/agents");
    assert.strictEqual(topicHref({ slug: "" }), null);
    assert.strictEqual(topicHref({ slug: null }), null);
  });
});
