import assert from "node:assert";
import { describe, it } from "node:test";

import {
  DEFAULT_SITE_SETTINGS,
  siteSettingsSchema,
} from "../src/lib/validation/settings";

describe("Site Settings validation boundary", () => {
  it("provides canonical default site settings", () => {
    assert.strictEqual(DEFAULT_SITE_SETTINGS.siteName, "CHIBUEZE MAXWELL");
    assert.strictEqual(
      DEFAULT_SITE_SETTINGS.siteDescription,
      "Super Intelligence Engineer & Entrepreneur",
    );
    assert.strictEqual(DEFAULT_SITE_SETTINGS.socialGithub, null);
    assert.strictEqual(DEFAULT_SITE_SETTINGS.socialX, null);
  });

  it("validates valid site settings input", () => {
    const input = {
      siteName: "Jane Doe",
      siteDescription: "Systems Architect & Researcher",
      primaryEmail: "jane@example.com",
      socialGithub: "https://github.com/janedoe",
      socialX: "https://x.com/janedoe",
      socialLinkedin: "https://linkedin.com/in/janedoe",
      socialYoutube: "https://youtube.com/@janedoe",
      socialInstagram: "https://instagram.com/janedoe",
      socialTiktok: "https://tiktok.com/@janedoe",
      footerText: "Copyright 2026. All rights reserved.",
    };

    const parsed = siteSettingsSchema.safeParse(input);
    assert.strictEqual(parsed.success, true);
    if (parsed.success) {
      assert.strictEqual(parsed.data.siteName, "Jane Doe");
      assert.strictEqual(parsed.data.socialGithub, "https://github.com/janedoe");
      assert.strictEqual(parsed.data.primaryEmail, "jane@example.com");
    }
  });

  it("normalizes blank optional fields to null", () => {
    const input = {
      siteName: "Valid Name",
      siteDescription: "   ",
      primaryEmail: "",
      socialGithub: "   ",
      socialX: "",
      footerText: "",
    };

    const parsed = siteSettingsSchema.safeParse(input);
    assert.strictEqual(parsed.success, true);
    if (parsed.success) {
      assert.strictEqual(parsed.data.siteDescription, null);
      assert.strictEqual(parsed.data.primaryEmail, null);
      assert.strictEqual(parsed.data.socialGithub, null);
      assert.strictEqual(parsed.data.socialX, null);
      assert.strictEqual(parsed.data.footerText, null);
    }
  });

  it("rejects empty siteName", () => {
    const input = {
      siteName: "   ",
    };
    const parsed = siteSettingsSchema.safeParse(input);
    assert.strictEqual(parsed.success, false);
  });

  it("rejects unsafe URL protocols (e.g. javascript:, data:)", () => {
    const unsafeGithub = {
      siteName: "Valid Name",
      socialGithub: "javascript:alert(document.cookie)",
    };
    assert.strictEqual(siteSettingsSchema.safeParse(unsafeGithub).success, false);

    const unsafeX = {
      siteName: "Valid Name",
      socialX: "data:text/html,<script>alert(1)</script>",
    };
    assert.strictEqual(siteSettingsSchema.safeParse(unsafeX).success, false);
  });

  it("rejects invalid email formats", () => {
    const invalidEmail = {
      siteName: "Valid Name",
      primaryEmail: "not-an-email",
    };
    assert.strictEqual(siteSettingsSchema.safeParse(invalidEmail).success, false);
  });
});
