import assert from "node:assert";
import { describe, it } from "node:test";

import { richDocToMarkdown } from "../src/lib/rich-text-markdown";

const doc = (...content: unknown[]) => ({ type: "doc", content });
const p = (...content: unknown[]) => ({ type: "paragraph", content });
const t = (text: string, marks?: unknown[]) => ({
  type: "text",
  text,
  ...(marks ? { marks } : {}),
});
const li = (...content: unknown[]) => ({ type: "listItem", content });
const BASE = "https://example.com";

describe("rich text to Markdown (llms-full.txt)", () => {
  it("renders headings (one level down), marks and paragraphs", () => {
    assert.strictEqual(
      richDocToMarkdown(
        doc(
          { type: "heading", attrs: { level: 2 }, content: [t("Problem")] },
          p(
            t("Agents "),
            t("fail", [{ type: "bold" }]),
            t(" "),
            t("quietly", [{ type: "italic" }]),
            t("."),
          ),
          p(t("run "), t("npm test", [{ type: "code" }])),
        ),
        BASE,
      ),
      "### Problem\n\nAgents **fail** *quietly*.\n\nrun `npm test`",
    );
  });

  it("renders lists, quotes, code blocks and rules", () => {
    assert.strictEqual(
      richDocToMarkdown(
        doc(
          { type: "bulletList", content: [li(p(t("one"))), li(p(t("two")))] },
          { type: "orderedList", attrs: { start: 3 }, content: [li(p(t("three")))] },
          { type: "blockquote", content: [p(t("quoted"))] },
          { type: "codeBlock", content: [t("a < b")] },
          { type: "horizontalRule" },
        ),
        BASE,
      ),
      "- one\n- two\n\n3. three\n\n> quoted\n\n```\na < b\n```\n\n---",
    );
  });

  it("keeps safe links (absolutised) and drops unsafe ones", () => {
    assert.strictEqual(
      richDocToMarkdown(
        doc(
          p(t("rel", [{ type: "link", attrs: { href: "/work/x" } }])),
          p(t("bad", [{ type: "link", attrs: { href: "javascript:alert(1)" } }])),
          { type: "image", attrs: { src: "/a.png", alt: "Chart" } },
          { type: "image", attrs: { src: "data:image/png;base64,AA" } },
        ),
        BASE,
      ),
      "[rel](https://example.com/work/x)\n\nbad\n\n![Chart](https://example.com/a.png)",
    );
  });

  it("returns an empty string for non-documents", () => {
    assert.strictEqual(richDocToMarkdown(null, BASE), "");
  });
});
