import assert from "node:assert";
import { describe, it } from "node:test";

import { hasArticleBody } from "../src/lib/validation/article";

const doc = (...content: unknown[]) => ({ type: "doc", content });

describe("article publishing body validation", () => {
  it("rejects the empty document shape that produced the blank live article", () => {
    for (const value of [
      null,
      "Article text outside a document",
      doc(),
      doc({ type: "paragraph" }),
      doc({ type: "paragraph", content: [{ type: "text", text: " \n " }] }),
      doc({ type: "horizontalRule" }),
    ]) {
      assert.strictEqual(hasArticleBody(value), false);
    }
  });

  it("accepts text nested inside lists and formatting", () => {
    assert.strictEqual(
      hasArticleBody(
        doc({
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [
                    { type: "text", text: "The world is not a finished product." },
                  ],
                },
              ],
            },
          ],
        }),
      ),
      true,
    );
  });

  it("accepts an image-only body without accepting unsafe or missing sources", () => {
    for (const src of ["/uploads/photo.png", "https://media.example.com/photo.png"]) {
      assert.strictEqual(hasArticleBody(doc({ type: "image", attrs: { src } })), true);
    }
    for (const src of [
      undefined,
      "",
      "data:image/png;base64,abc",
      "javascript:alert(1)",
    ]) {
      assert.strictEqual(hasArticleBody(doc({ type: "image", attrs: { src } })), false);
    }
  });
});
