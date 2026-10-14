import assert from "node:assert";
import { describe, it } from "node:test";
import { richDocToHtml } from "../src/lib/rich-text-html";

import {
  docPlainText,
  markdownToTiptapDoc,
  repairArticleContent,
} from "../src/lib/markdown-doc";

const ESSAY = `*On questioning the systems we inherit, thinking independently, and refusing to mistake what exists for what is possible.*

---

### The World Is Not a Finished Product

I've always found something strange about the phrase *"That's just how the world works."*

People say it with such certainty. As though the world arrived with an instruction manual, and somewhere inside it was written that everything must remain exactly as we found it.

### Familiarity Is Not Truth

- Something being normal doesn't make it optimal.
- Something being accepted doesn't make it correct.

Not for the sake of being different. But because **the world is not a finished product.** And neither am I.`;

const EMPTY = { type: "doc", content: [{ type: "paragraph" }] };

describe("markdownToTiptapDoc", () => {
  it("builds headings, marks, lists, quotes, dividers and code", () => {
    const doc = markdownToTiptapDoc(
      "# Big\n\n### Small\n\nA **b** *i* ~~s~~ `c` [l](https://x.dev) [bad](javascript:alert(1))\n\n> quote\n\n---\n\n1. one\n2. two\n\n```\nx = 1\n```",
    );
    const types = doc.content.map((n) => n.type);
    assert.deepStrictEqual(types, [
      "heading",
      "heading",
      "paragraph",
      "blockquote",
      "horizontalRule",
      "orderedList",
      "codeBlock",
    ]);
    assert.deepStrictEqual(
      doc.content.slice(0, 2).map((h) => h.attrs?.level),
      [2, 3],
    );
    const marks = (doc.content[2]!.content ?? []).map((n) => [
      n.text,
      (n.marks ?? []).map((m) => m.type).join("+"),
    ]);
    assert.deepStrictEqual(marks, [
      ["A ", ""],
      ["b", "bold"],
      [" ", ""],
      ["i", "italic"],
      [" ", ""],
      ["s", "strike"],
      [" ", ""],
      ["c", "code"],
      [" ", ""],
      ["l", "link"],
      [" ", ""],
      ["bad", ""], // unsafe link dropped, text kept
    ]);
  });

  it("decodes entities and keeps apostrophes", () => {
    assert.strictEqual(docPlainText(markdownToTiptapDoc("I've & <you>")), "I've & <you>");
  });

  it("keeps Markdown images as blocks and renders their source and caption", () => {
    const doc = markdownToTiptapDoc(
      'Before ![Photo &amp; detail](/uploads/photo.png "Caption") after',
    );
    assert.deepStrictEqual(
      doc.content.map((n) => n.type),
      ["paragraph", "image", "paragraph"],
    );
    assert.deepStrictEqual(doc.content[1]?.attrs, {
      src: "/uploads/photo.png",
      alt: "Photo & detail",
      title: "Caption",
    });
    const html = richDocToHtml(doc, "https://example.com");
    assert.ok(html.includes('src="https://example.com/uploads/photo.png"'));
    assert.ok(html.includes("<figcaption>Caption</figcaption>"));
    assert.ok(!html.includes("<p><figure>"));
  });

  it("drops unsafe image sources instead of creating image nodes", () => {
    for (const src of [
      "javascript:alert",
      "data:image/png;base64,abc",
      "//evil.test/a.png",
    ]) {
      const doc = markdownToTiptapDoc(`![Photo](${src})`);
      assert.ok(!JSON.stringify(doc).includes('"type":"image"'));
    }
  });
});

describe("repairArticleContent", () => {
  it("preserves an image in a body repaired from literal Markdown", () => {
    const fixed = repairArticleContent({
      title: "T",
      excerpt: "Summary",
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "![Photo](https://media.example.com/photo.png)" },
            ],
          },
        ],
      },
    });
    assert.strictEqual(fixed?.content.content[0]?.type, "image");
  });

  it("does not replace an image-only body with a long excerpt", () => {
    assert.strictEqual(
      repairArticleContent({
        title: "T",
        excerpt: "Summary ".repeat(45),
        content: {
          type: "doc",
          content: [{ type: "image", attrs: { src: "/photo.png" } }],
        },
      }),
      null,
    );
  });
  it("moves a whole essay out of the excerpt into the body", () => {
    const fixed = repairArticleContent({
      title: "The World Is Not a Finished Product.",
      excerpt: ESSAY,
      content: EMPTY,
    });
    assert.ok(fixed);
    assert.strictEqual(
      fixed.excerpt,
      "On questioning the systems we inherit, thinking independently, and refusing to mistake what exists for what is possible.",
    );
    const types = fixed.content.content.map((n) => n.type);
    // Opening summary + divider + title-repeating heading are not duplicated.
    assert.deepStrictEqual(types, [
      "paragraph",
      "paragraph",
      "heading",
      "bulletList",
      "paragraph",
    ]);
    assert.ok(!/[#*]|---/.test(docPlainText(fixed.content)));
  });

  it("formats a body that was saved as literal Markdown", () => {
    const body = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "## Part one" }] },
        { type: "paragraph", content: [{ type: "text", text: "Some **bold** text." }] },
      ],
    };
    const fixed = repairArticleContent({
      title: "T",
      excerpt: "A short summary.",
      content: body,
    });
    assert.ok(fixed);
    assert.strictEqual(fixed.excerpt, "A short summary.");
    assert.deepStrictEqual(
      fixed.content.content.map((n) => n.type),
      ["heading", "paragraph"],
    );
  });

  it("strips Markdown from a short excerpt", () => {
    const fixed = repairArticleContent({
      title: "T",
      excerpt: "*On questioning the systems we inherit.*",
      content: {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "Fine." }] }],
      },
    });
    assert.deepStrictEqual(fixed?.excerpt, "On questioning the systems we inherit.");
  });

  it("leaves healthy articles alone", () => {
    const body = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Intro" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Plain prose, 3 * 4 = 12." }],
        },
      ],
    };
    assert.strictEqual(
      repairArticleContent({ title: "T", excerpt: "A normal excerpt.", content: body }),
      null,
    );
    assert.strictEqual(
      repairArticleContent({ title: "T", excerpt: "Short.", content: EMPTY }),
      null,
    );
  });
});
