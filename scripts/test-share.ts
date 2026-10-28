import assert from "node:assert";
import { describe, it } from "node:test";

import { clipSummary, shareLinks } from "../src/lib/share";

describe("shareLinks", () => {
  const links = shareLinks({
    url: "https://example.com/writing/the-world-is-not-a-finished-product",
    title: "The World Is Not a Finished Product.",
    text: "On questioning the systems we inherit & more.",
  });
  const by = Object.fromEntries(links.map((l) => [l.id, l.href]));

  it("offers X, LinkedIn, Facebook, WhatsApp and email in that order", () => {
    assert.deepStrictEqual(
      links.map((l) => l.id),
      ["x", "linkedin", "facebook", "whatsapp", "email"],
    );
  });

  it("encodes the page URL and title for each network", () => {
    const enc = encodeURIComponent(
      "https://example.com/writing/the-world-is-not-a-finished-product",
    );
    assert.ok(by.x!.startsWith("https://x.com/intent/post?"));
    assert.ok(by.x!.includes(`url=${enc}`));
    assert.ok(by.x!.includes("text=The%20World%20Is%20Not%20a%20Finished%20Product."));
    assert.strictEqual(
      by.linkedin,
      `https://www.linkedin.com/sharing/share-offsite/?url=${enc}`,
    );
    assert.strictEqual(
      by.facebook,
      `https://www.facebook.com/sharer/sharer.php?u=${enc}`,
    );
    assert.ok(by.whatsapp!.startsWith("https://wa.me/?text="));
    assert.ok(
      decodeURIComponent(by.whatsapp!.split("text=")[1]!).endsWith(
        "https://example.com/writing/the-world-is-not-a-finished-product",
      ),
    );
  });

  it("puts the summary and link in the email body, safely encoded", () => {
    const [subject, body] = by.email!.replace("mailto:?", "").split("&body=");
    assert.strictEqual(
      decodeURIComponent(subject!.replace("subject=", "")),
      "The World Is Not a Finished Product.",
    );
    assert.strictEqual(
      decodeURIComponent(body!),
      "On questioning the systems we inherit & more.\n\nhttps://example.com/writing/the-world-is-not-a-finished-product",
    );
  });

  it("works without a summary", () => {
    const email = shareLinks({ url: "https://e.com/a", title: "A" }).find(
      (l) => l.id === "email",
    )!;
    assert.strictEqual(email.href, "mailto:?subject=A&body=https%3A%2F%2Fe.com%2Fa");
  });
});

describe("clipSummary", () => {
  it("keeps short text and flattens whitespace", () => {
    assert.strictEqual(clipSummary("  One\n\ntwo  "), "One two");
    assert.strictEqual(clipSummary(null), "");
  });
  it("cuts long text on a word boundary", () => {
    const long = "word ".repeat(80);
    const out = clipSummary(long);
    assert.ok(out.length <= 200);
    assert.ok(out.endsWith("word…"));
  });
});
