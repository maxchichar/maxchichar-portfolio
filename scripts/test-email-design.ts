import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ownerEmail,
  profileFrom,
  replyEmail,
  visitorEmail,
} from "../src/server/services/contact-email";
import { cardEmail, signature } from "../src/server/services/email-design";

const settings = {
  siteName: "CHIBUEZE MAXWELL",
  siteDescription: "AI Engineer, entrepreneur, researcher, and writer",
  socialLinkedin: "https://linkedin.com/in/example",
  socialGithub: null,
  socialX: "https://x.com/example",
};
const submission = {
  id: "8c6d1a2e-1111-4111-8111-111111111111",
  name: "Ada <img src=x>",
  email: "ada@example.com",
  organization: null,
  reason: "Other",
  message: "Hello <script>alert(1)</script>\nSecond line",
};

describe("Email profile", () => {
  it("uses the sender's display name, never the all-caps site name", () => {
    assert.equal(
      profileFrom(settings, "Chibueze Maxwell <hello@chibuezemaxwell.com>").name,
      "Chibueze Maxwell",
    );
    assert.equal(
      profileFrom(settings, "hello@chibuezemaxwell.com").name,
      "Chibueze Maxwell",
    );
    assert.equal(profileFrom(settings, null).name, "Chibueze Maxwell");
  });

  it("lists only the social profiles that are set", () => {
    const profile = profileFrom(settings, null);
    assert.deepEqual(
      profile.links.map((l) => l.label),
      ["LinkedIn", "X"],
    );
    assert.equal(profile.role, settings.siteDescription);
    const html = signature(profile);
    assert.ok(html.includes("https://x.com/example"));
    assert.ok(!html.includes("GitHub"));
  });
});

describe("Email templates", () => {
  const profile = profileFrom(settings, "Chibueze Maxwell <hello@chibuezemaxwell.com>");
  const all = {
    owner: ownerEmail(submission, profile),
    receipt: visitorEmail(submission, profile),
    reply: replyEmail(
      { ...submission, createdAt: new Date("2026-11-19T14:20:00Z") },
      "Thanks <b>Ada</b>",
      profile,
    ),
  };

  it("escapes everything a visitor typed", () => {
    for (const [name, email] of Object.entries(all)) {
      assert.ok(!email.html.includes("<script>"), name);
      assert.ok(!email.html.includes("<img src=x>"), name);
      assert.ok(!email.html.includes("<b>Ada</b>"), name);
    }
  });

  it("never echoes the visitor's message in the receipt", () => {
    assert.ok(!all.receipt.html.includes("alert(1)"));
    assert.ok(!all.receipt.text.includes("alert(1)"));
  });

  it("works across clients: Outlook column, dark mode, phone sizes, preheader", () => {
    for (const [name, email] of Object.entries(all)) {
      assert.match(
        email.html,
        /<!--\[if mso\]><table role="presentation" width="600"/,
        name,
      );
      assert.match(email.html, /prefers-color-scheme:dark/, name);
      assert.match(email.html, /max-width:620px/, name);
      assert.match(email.html, /<html lang="en"/, name);
      assert.match(email.html, /display:none;max-height:0/, name);
    }
  });

  it("signs personal emails with the mark, name, role and links", () => {
    for (const email of [all.reply, all.receipt]) {
      assert.ok(email.html.includes("/email/mark.png"));
      assert.ok(email.html.includes("Chibueze Maxwell"));
      assert.ok(email.html.includes(settings.siteDescription));
      assert.ok(!email.html.includes("CHIBUEZE MAXWELL"));
    }
    assert.match(all.reply.text, /^--$/m);
  });

  it("keeps replies letter-like: no card frame", () => {
    assert.ok(!all.reply.html.includes('class="e-card"'));
    assert.ok(all.owner.html.includes('class="e-card"'));
  });

  it("escapes frame options", () => {
    const html = cardEmail(profile, "", {
      title: "<t>",
      preheader: "<p>",
      label: "<l>",
      footnote: "<f>",
      footerLinks: [{ label: "<a>", url: 'https://x.com/"' }],
    });
    for (const raw of ["<t>", "<p>", "<l>", "<f>", "<a>", '/"']) {
      assert.ok(!html.includes(raw), raw);
    }
  });
});
