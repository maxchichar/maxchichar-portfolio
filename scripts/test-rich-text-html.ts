import assert from "node:assert";
import { describe, it } from "node:test";

import { richDocToHtml } from "../src/lib/rich-text-html";

const doc = (...content: unknown[]) => ({ type: "doc", content });
const p = (...content: unknown[]) => ({ type: "paragraph", content });
const t = (text: string, marks?: unknown[]) => ({
  type: "text",
  text,
  ...(marks ? { marks } : {}),
});
const BASE = "https://example.com";

describe("rich text to HTML (feed content)", () => {
  it("escapes text, so stored content can never inject markup", () => {
    assert.strictEqual(
      richDocToHtml(doc(p(t('<script>alert("x")</script> & co'))), BASE),
      "<p>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; co</p>",
    );
  });

  it("renders marks, headings, lists and code", () => {
    const html = richDocToHtml(
      doc(
        { type: "heading", attrs: { level: 1 }, content: [t("Title")] },
        p(t("bold", [{ type: "bold" }]), t(" and "), t("x<y", [{ type: "code" }])),
        {
          type: "orderedList",
          attrs: { start: 3 },
          content: [{ type: "listItem", content: [p(t("one"))] }],
        },
        { type: "codeBlock", content: [t("a < b")] },
      ),
      BASE,
    );
    assert.strictEqual(
      html,
      '<h2>Title</h2><p><strong>bold</strong> and <code>x&lt;y</code></p><ol start="3"><li><p>one</p></li></ol><pre><code>a &lt; b</code></pre>',
    );
  });

  it("drops unsafe links and images, absolutises relative ones", () => {
    const html = richDocToHtml(
      doc(
        p(t("bad", [{ type: "link", attrs: { href: "javascript:alert(1)" } }])),
        p(t("rel", [{ type: "link", attrs: { href: "/work/x" } }])),
        { type: "image", attrs: { src: "data:image/png;base64,AAA" } },
        { type: "image", attrs: { src: "/a.png", alt: 'q"uote' } },
      ),
      BASE,
    );
    assert.strictEqual(
      html,
      '<p>bad</p><p><a href="https://example.com/work/x">rel</a></p><figure><img src="https://example.com/a.png" alt="q&quot;uote"></figure>',
    );
  });

  it("returns an empty string for non-documents", () => {
    assert.strictEqual(richDocToHtml("nope", BASE), "");
  });
});
