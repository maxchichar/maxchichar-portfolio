import assert from "node:assert";
import { describe, it } from "node:test";

import { withScheme } from "../src/lib/social-url";
import { siteSettingsSchema } from "../src/lib/validation/settings";

describe("withScheme", () => {
  it("adds https:// to a bare profile link so it passes the settings rule", () => {
    for (const [input, expected] of <[string, string][]>[
      ["github.com/maxchichar", "https://github.com/maxchichar"],
      ["  x.com/maxchichar ", "https://x.com/maxchichar"],
      ["//instagram.com/me", "https://instagram.com/me"],
    ]) {
      const value = withScheme(input);
      assert.strictEqual(value, expected);
      assert.ok(siteSettingsSchema.shape.socialGithub.safeParse(value).success, value);
    }
  });

  it("leaves blanks and links that already have a scheme alone", () => {
    assert.strictEqual(withScheme(""), "");
    assert.strictEqual(withScheme("https://x.com/me"), "https://x.com/me");
    assert.strictEqual(withScheme("http://example.com"), "http://example.com");
    // Not rewritten into something that looks valid; the schema still rejects it.
    assert.strictEqual(withScheme("javascript:alert(1)"), "javascript:alert(1)");
  });
});
