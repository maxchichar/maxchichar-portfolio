import assert from "node:assert";
import { describe, it } from "node:test";

import { cleanErrorMessage, errorFingerprint } from "../src/lib/error-fingerprint";

describe("error grouping", () => {
  it("groups the same error with different ids or numbers", () => {
    const a = errorFingerprint("server", "/work/[slug]", "Post 123 not found");
    const b = errorFingerprint("server", "/work/[slug]", "Post 98765 not found");
    const c = errorFingerprint(
      "server",
      "/work/[slug]",
      "Row 3f2b8c1e-1a2b-4c3d-8e9f-0a1b2c3d4e5f missing",
    );
    const d = errorFingerprint(
      "server",
      "/work/[slug]",
      "Row 9a8b7c6d-1a2b-4c3d-8e9f-0a1b2c3d4e5f missing",
    );
    assert.strictEqual(a, b);
    assert.strictEqual(c, d);
  });

  it("keeps different messages, routes and sources apart", () => {
    const base = errorFingerprint("server", "/about", "boom");
    assert.notStrictEqual(base, errorFingerprint("server", "/about", "bang"));
    assert.notStrictEqual(base, errorFingerprint("server", "/now", "boom"));
    assert.notStrictEqual(base, errorFingerprint("client", "/about", "boom"));
  });

  it("cleans messages to one bounded line", () => {
    assert.strictEqual(cleanErrorMessage("  a\n  b\t c "), "a b c");
    assert.strictEqual(cleanErrorMessage("x".repeat(900)).length, 500);
    assert.strictEqual(cleanErrorMessage(undefined), "Unknown error");
  });
});
