import assert from "node:assert";
import { describe, it } from "node:test";

import { linkify, parseEmailText } from "../src/lib/email-text";

describe("parseEmailText", () => {
  it("turns a label followed by a URL into one link button", () => {
    const { body } = parseEmailText(
      "Read this article on LinkedIn to join the conversation\nRead on LinkedIn\nhttps://www.linkedin.com/comm/pulse/top-stories?lipi=urn%3Ali",
    );
    assert.deepStrictEqual(body[0], {
      kind: "paragraph",
      lines: [
        [
          {
            kind: "text",
            text: "Read this article on LinkedIn to join the conversation",
          },
        ],
      ],
    });
    assert.strictEqual(body[1]?.kind, "cta");
    assert.ok(body[1]?.kind === "cta");
    assert.strictEqual(body[1].label, "Read on LinkedIn");
    assert.strictEqual(body[1].host, "linkedin.com");
    assert.strictEqual(body[1].path, "/comm/pulse/top-stories");
    assert.ok(body[1].href.includes("lipi="));
  });

  it("keeps a sentence before a URL as text, not a label", () => {
    const { body } = parseEmailText("Here is the doc.\nhttps://example.com/doc");
    assert.strictEqual(body[0]?.kind, "paragraph");
    assert.ok(body[1]?.kind === "cta" && body[1].label === null);
  });

  it("drops repeated paragraphs, padding and invisible characters", () => {
    const { body } = parseEmailText(
      "​͏By Entrepreneur Media India\n\n\n\n   By Entrepreneur Media India\n\nHello",
    );
    assert.strictEqual(body.length, 2);
    assert.deepStrictEqual(body[0], {
      kind: "paragraph",
      lines: [[{ kind: "text", text: "By Entrepreneur Media India" }]],
    });
  });

  it("moves unsubscribe and legal text into the footer", () => {
    const parsed = parseEmailText(
      "Big news this week.\n\nUnsubscribe: https://example.com/u\n\n© 2026 Example Inc.",
    );
    assert.strictEqual(parsed.body.length, 1);
    assert.strictEqual(parsed.footer.length, 2);
    assert.ok(
      parsed.footer[0]?.kind === "cta" && parsed.footer[0].label === "Unsubscribe",
    );
  });

  it("collapses the earlier thread of a reply", () => {
    const parsed = parseEmailText(
      "Sounds good, Thursday works.\n\nOn Mon, Oct 27, 2026 at 9:00 AM Max <max@example.com> wrote:\n> Can we meet?\n> Thanks",
    );
    assert.strictEqual(parsed.body.length, 1);
    assert.ok(parsed.quoted?.includes("Can we meet?"));
    assert.ok(parsed.quoted?.split("\n").every((line) => !line.startsWith(">")));
  });

  it("does not collapse a forwarded message or a quote with nothing before it", () => {
    assert.strictEqual(parseEmailText("> just a quote").quoted, null);
    const fwd = parseEmailText(
      "---------- Forwarded message ---------\nFrom: A <a@b.co>\n\nHello",
    );
    assert.strictEqual(fwd.quoted, null);
  });

  it("makes lists and dividers", () => {
    const { body } = parseEmailText("- one\n- two\n\n-----\n\nend");
    assert.strictEqual(body[0]?.kind, "list");
    assert.strictEqual(body[1]?.kind, "divider");
  });
});

describe("linkify", () => {
  it("links URLs and email addresses, leaving trailing punctuation out", () => {
    const parts = linkify("Mail me@site.com or see https://site.com/a/b.");
    assert.deepStrictEqual(parts, [
      { kind: "text", text: "Mail " },
      { kind: "link", href: "mailto:me@site.com", label: "me@site.com" },
      { kind: "text", text: " or see " },
      { kind: "link", href: "https://site.com/a/b", label: "site.com/a/b" },
      { kind: "text", text: "." },
    ]);
  });

  it("only ever links http(s) and mailto", () => {
    const parts = linkify("javascript:alert(1) data:text/html,x");
    assert.ok(parts.every((p) => p.kind === "text"));
  });
});
