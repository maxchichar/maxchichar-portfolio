import assert from "node:assert";
import { describe, it } from "node:test";

import { isBenignClientError } from "../src/lib/benign-errors";

describe("isBenignClientError", () => {
  it("ignores cancelled View Transitions and ResizeObserver notices", () => {
    assert.ok(
      isBenignClientError(
        "Transition was aborted because of invalid state. Document hidden",
      ),
    );
    const domError = Object.assign(
      new Error("Transition was skipped because of a newer navigation"),
      { name: "AbortError" },
    );
    assert.ok(isBenignClientError(domError));
    assert.ok(isBenignClientError({ message: "ResizeObserver loop limit exceeded" }));
    assert.ok(
      isBenignClientError(
        "ResizeObserver loop completed with undelivered notifications.",
      ),
    );
  });

  it("ignores requests that never reached the server", () => {
    assert.ok(isBenignClientError(new TypeError("Load failed")));
    assert.ok(isBenignClientError(new TypeError("Failed to fetch")));
    assert.ok(
      isBenignClientError(
        new TypeError("NetworkError when attempting to fetch resource."),
      ),
    );
  });

  it("keeps real errors", () => {
    assert.ok(!isBenignClientError(new TypeError("Cannot read properties of undefined")));
    assert.ok(!isBenignClientError("Failed to load the transition data"));
    assert.ok(!isBenignClientError("Load failed: chunk 42 missing"));
    assert.ok(!isBenignClientError(null));
    assert.ok(!isBenignClientError(undefined));
    assert.ok(!isBenignClientError({}));
  });
});
