import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { replyEmail } from "../src/server/services/contact-email";
import { replySender } from "../src/server/services/email";

const original = {
  name: "Ada <script>",
  message: "First line\nSecond <b>line</b>",
  createdAt: new Date("2026-10-01T09:30:00Z"),
};

describe("Inbox reply email", () => {
  it("puts the reply first and quotes the original message in plain text", () => {
    const { text } = replyEmail(original, "Thanks, Ada.");
    assert.ok(text.startsWith("Thanks, Ada.\n"));
    assert.match(text, /Ada <script> wrote:/);
    assert.match(text, /^> First line$/m);
    assert.match(text, /^> Second <b>line<\/b>$/m);
  });

  it("escapes the reply and the quoted message in HTML", () => {
    const { html } = replyEmail(original, "See <a href=x>this</a>");
    assert.ok(!html.includes("<script>"));
    assert.ok(!html.includes("<a href=x>"));
    assert.ok(html.includes("&lt;b&gt;line&lt;/b&gt;"));
  });
});

describe("Reply sender", () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it("prefers REPLY_FROM_EMAIL, then CONTACT_FROM_EMAIL", () => {
    process.env.CONTACT_FROM_EMAIL = "Site <site@chibuezemaxwell.com>";
    process.env.REPLY_FROM_EMAIL = "Max <hello@chibuezemaxwell.com>";
    assert.equal(replySender(), "Max <hello@chibuezemaxwell.com>");
    delete process.env.REPLY_FROM_EMAIL;
    assert.equal(replySender(), "Site <site@chibuezemaxwell.com>");
  });

  it("is unavailable without a verified sender", () => {
    delete process.env.REPLY_FROM_EMAIL;
    delete process.env.CONTACT_FROM_EMAIL;
    assert.equal(replySender(), null);
  });
});
