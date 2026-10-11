import assert from "node:assert";
import { describe, it } from "node:test";

import {
  highlight,
  normalize,
  queryTerms,
  search,
  type SearchItem,
} from "../src/lib/search";

const item = (over: Partial<SearchItem>): SearchItem => ({
  type: "work",
  title: "",
  summary: "",
  href: "/",
  meta: null,
  tags: [],
  body: "",
  ...over,
});

const ITEMS: SearchItem[] = [
  item({
    title: "Agent Evaluation Harness",
    summary: "A reproducible harness for measuring agent reliability.",
    tags: ["evals", "agents"],
    href: "/work/agent-eval",
    body: "We replay recorded trajectories and grade each step with a rubric.",
  }),
  item({
    type: "writing",
    title: "What agent demos don't show you",
    summary: "The happy path is one trajectory.",
    href: "/writing/agents-in-production",
    body: "Production is thousands of trajectories. Measure latency budgets instead.",
  }),
  item({
    type: "research",
    title: "Step-level grading",
    summary: "Comparing step-level and outcome-only grading.",
    tags: ["evaluation"],
    href: "/research/step-level-grading",
    body: "Résumé of results: the grader catches failures earlier.",
  }),
];

describe("command palette search", () => {
  it("normalises case and accents", () => {
    assert.strictEqual(normalize("Résumé"), "resume");
    assert.deepStrictEqual(queryTerms("  Agent   EVAL! "), ["agent", "eval"]);
  });

  it("returns nothing for an empty query", () => {
    assert.deepStrictEqual(search(ITEMS, "   "), []);
  });

  it("requires every term to match (AND)", () => {
    const hits = search(ITEMS, "agent harness");
    assert.deepStrictEqual(
      hits.map((h) => h.item.href),
      ["/work/agent-eval"],
    );
  });

  it("ranks title matches above summary and body matches", () => {
    const hits = search(ITEMS, "grading");
    assert.strictEqual(hits[0]!.item.href, "/research/step-level-grading");
    const agent = search(ITEMS, "agent");
    assert.strictEqual(agent[0]!.item.title, "Agent Evaluation Harness");
  });

  it("finds words that only appear in the body, with a snippet", () => {
    const hits = search(ITEMS, "latency");
    assert.strictEqual(hits.length, 1);
    assert.strictEqual(hits[0]!.item.href, "/writing/agents-in-production");
    assert.ok(hits[0]!.snippet?.includes("latency"), hits[0]!.snippet ?? "no snippet");
  });

  it("matches accent-insensitively in the body", () => {
    assert.strictEqual(
      search(ITEMS, "resume")[0]?.item.href,
      "/research/step-level-grading",
    );
  });

  it("matches tags", () => {
    assert.strictEqual(search(ITEMS, "evals")[0]?.item.href, "/work/agent-eval");
  });

  it("highlights matched ranges", () => {
    assert.deepStrictEqual(highlight("Agent Evaluation", "eval"), [
      { text: "Agent ", match: false },
      { text: "Eval", match: true },
      { text: "uation", match: false },
    ]);
    // Accent-insensitive: "res" marks the accented "Rés".
    assert.deepStrictEqual(highlight("Résumé", "res"), [
      { text: "Rés", match: true },
      { text: "umé", match: false },
    ]);
  });
});
