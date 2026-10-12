import assert from "node:assert";
import { describe, it } from "node:test";

import { withFallback } from "../src/lib/with-fallback";

describe("withFallback", () => {
  it("passes the value through when the read succeeds", async () => {
    const errors: unknown[] = [];
    const result = await withFallback(Promise.resolve([1, 2]), [], (e) => errors.push(e));
    assert.deepStrictEqual(result, { value: [1, 2], failed: false });
    assert.strictEqual(errors.length, 0);
  });

  it("returns the fallback and reports the error when the read fails", async () => {
    const errors: unknown[] = [];
    const boom = new Error("DATABASE_URL is not set");
    const result = await withFallback(Promise.reject(boom), [], (e) => errors.push(e));
    assert.deepStrictEqual(result, { value: [], failed: true });
    assert.deepStrictEqual(errors, [boom]);
  });

  it("still returns the fallback if reporting itself throws", async () => {
    const result = await withFallback(Promise.reject(new Error("db down")), null, () => {
      throw new Error("reporter down");
    });
    assert.deepStrictEqual(result, { value: null, failed: true });
  });
});
