import assert from "node:assert";
import { describe, it } from "node:test";

import { ADMIN_HOSTNAME, adminHostRedirects } from "../src/lib/admin-host";

describe("adminHostRedirects", () => {
  const rules = adminHostRedirects();

  it("applies only on the admin domain", () => {
    for (const rule of rules) {
      assert.deepStrictEqual(rule.has, [{ type: "host", value: ADMIN_HOSTNAME }]);
      assert.strictEqual(rule.permanent, false);
    }
  });

  it("opens the admin from the admin domain's home", () => {
    assert.deepStrictEqual(
      rules.find((r) => r.source === "/"),
      { source: "/", has: rules[0]?.has, destination: "/admin", permanent: false },
    );
  });

  it("sends public pages to the canonical site with the same path", () => {
    const writing = rules.find((r) => r.source === "/writing/:path*");
    assert.strictEqual(
      writing?.destination,
      "https://chibuezemaxwell.com/writing/:path*",
    );
    assert.ok(rules.some((r) => r.source === "/about"));
  });

  it("never redirects the admin, previews, APIs or assets", () => {
    for (const rule of rules) {
      assert.ok(!/^\/(admin|preview|api|_next)/.test(rule.source), rule.source);
    }
  });
});
