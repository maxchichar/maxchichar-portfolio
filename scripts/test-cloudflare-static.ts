import assert from "node:assert/strict";
import { test } from "node:test";
import { isStaticShareImage } from "../src/lib/cloudflare-static";

test("only public share images use the Workers static asset shortcut", () => {
  for (const path of [
    "/opengraph-image",
    "/about/opengraph-image?hash=abc",
    "/work/my-project/opengraph-image",
    "/topics/ai/opengraph-image",
  ]) {
    assert.equal(isStaticShareImage(new Request(`https://example.com${path}`)), true);
  }
  for (const path of [
    "/admin/opengraph-image",
    "/preview/work/id",
    "/api/auth/callback/credentials",
    "/work/draft",
    "/work/a/b/opengraph-image",
  ]) {
    assert.equal(isStaticShareImage(new Request(`https://example.com${path}`)), false);
  }
  assert.equal(
    isStaticShareImage(
      new Request("https://example.com/opengraph-image", { method: "POST" }),
    ),
    false,
  );
});
