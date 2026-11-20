import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ownerEmail,
  profileFrom,
  replyEmail,
  visitorEmail,
} from "../src/server/services/contact-email";
import { emailPhotoUrl } from "../src/server/services/contact-email";
import { cardEmail, DARK, signature, TOKENS } from "../src/server/services/email-design";

process.env.STORAGE_PUBLIC_URL = "https://pub-test.r2.dev";
const PHOTO = "https://pub-test.r2.dev/uploads/3b1f0d6e-0000-4000-8000-000000000000";

/** WCAG 2 contrast ratio between two #rrggbb colors. */
function contrast(a: string, b: string) {
  const lum = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

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

describe("Profile photo", () => {
  const site = "https://chibuezemaxwell.com";

  it("uses a square upload, resized through the site's image resizer", () => {
    const url = emailPhotoUrl(site, { url: PHOTO, width: 1200, height: 1180 });
    assert.equal(url, `${site}/_next/image?url=${encodeURIComponent(PHOTO)}&w=256&q=75`);
  });

  it("falls back to the brand mark rather than squash or send megabytes", () => {
    // Portrait (like the About photo), unknown size, foreign host, query string.
    assert.equal(emailPhotoUrl(site, { url: PHOTO, width: 2000, height: 3000 }), null);
    assert.equal(emailPhotoUrl(site, { url: PHOTO, width: null, height: null }), null);
    assert.equal(
      emailPhotoUrl(site, { url: "https://evil.example/a.jpg", width: 10, height: 10 }),
      null,
    );
    assert.equal(
      emailPhotoUrl(site, { url: `${PHOTO}?x=1`, width: 10, height: 10 }),
      null,
    );
    assert.equal(emailPhotoUrl(site, null), null);
  });

  it("shows the photo with the name on emails people read, the mark on alerts", () => {
    const withPhoto = profileFrom(
      settings,
      "Chibueze Maxwell <hello@chibuezemaxwell.com>",
      {
        url: PHOTO,
        width: 800,
        height: 800,
      },
    );
    const photo = /_next\/image\?url=[^"]+&amp;w=256&amp;q=75/;
    const receipt = visitorEmail(submission, withPhoto).html;
    assert.equal(receipt.match(new RegExp(photo, "g"))?.length, 2, "header + signature");
    assert.match(
      replyEmail({ ...submission, createdAt: new Date() }, "Hi", withPhoto).html,
      photo,
    );
    const alert = ownerEmail(submission, withPhoto).html;
    assert.ok(alert.includes("/email/mark.png"));
    assert.ok(
      !photo.test(alert.split('class="e-card"')[0]!),
      "alert header keeps the mark",
    );

    const without = visitorEmail(submission, profileFrom(settings, null)).html;
    assert.ok(!photo.test(without));
    assert.ok(without.includes("/email/mark.png"));
  });
});

describe("Accessibility and size", () => {
  it("meets WCAG AA (4.5:1) for every text color it uses, light and dark", () => {
    const pairs: [string, string, string][] = [
      ["ink on card", TOKENS.ink, TOKENS.card],
      ["body on card", TOKENS.body, TOKENS.card],
      ["muted on card", TOKENS.muted, TOKENS.card],
      ["muted on canvas", TOKENS.muted, TOKENS.canvas],
      ["muted on quote", TOKENS.muted, TOKENS.quote],
      ["body on quote", TOKENS.body, TOKENS.quote],
      ["violet on card", TOKENS.violet, TOKENS.card],
      ["button text", "#ffffff", TOKENS.violet],
      ["danger on card", TOKENS.danger, TOKENS.card],
      ["dark text", DARK.text, DARK.card],
      ["dark body", DARK.body, DARK.card],
      ["dark muted on card", DARK.muted, DARK.card],
      ["dark muted on canvas", DARK.muted, DARK.canvas],
      ["dark muted on quote", DARK.muted, DARK.quote],
      ["dark body on quote", DARK.body, DARK.quote],
      ["dark link on card", DARK.link, DARK.card],
      ["dark link on canvas", DARK.link, DARK.canvas],
      ["dark danger", DARK.danger, DARK.card],
    ];
    for (const [name, fg, bg] of pairs) {
      assert.ok(contrast(fg, bg) >= 4.5, `${name}: ${contrast(fg, bg).toFixed(2)}`);
    }
  });

  it("stays far below Gmail's 102 KB clipping limit, even with a long message", () => {
    const profile = profileFrom(settings, null);
    const long = { ...submission, message: "word ".repeat(2000) };
    for (const html of [
      ownerEmail(long, profile).html,
      visitorEmail(long, profile).html,
      replyEmail({ ...long, createdAt: new Date() }, "word ".repeat(2000), profile).html,
    ]) {
      assert.ok(Buffer.byteLength(html) < 60_000, String(Buffer.byteLength(html)));
    }
  });
});
