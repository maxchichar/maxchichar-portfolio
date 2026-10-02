import assert from "node:assert";
import { describe, it } from "node:test";

import {
  contactSubmissionSchema,
  CONTACT_REASONS,
  hashIp,
  RATE_LIMIT_MAX_COUNT,
  RATE_LIMIT_WINDOW_MS,
} from "../src/lib/validation/contact";

describe("Contact validation and security boundary", () => {
  it("accepts valid contact submission input", () => {
    const valid = {
      name: "Alice Engineer",
      email: "alice@example.com",
      organization: "Research Labs Inc",
      reason: CONTACT_REASONS[0],
      message: "I would like to discuss an AI systems project.",
    };

    const parsed = contactSubmissionSchema.safeParse(valid);
    assert.strictEqual(parsed.success, true);
    if (parsed.success) {
      assert.strictEqual(parsed.data.name, "Alice Engineer");
      assert.strictEqual(parsed.data.email, "alice@example.com");
      assert.strictEqual(parsed.data.organization, "Research Labs Inc");
      assert.strictEqual(parsed.data.reason, "Consulting / Contract");
      assert.strictEqual(parsed.data.honeypot, null);
    }
  });

  it("normalizes empty optional strings to null", () => {
    const input = {
      name: "Bob Builder",
      email: "bob@example.com",
      organization: "   ",
      reason: "",
      message: "Testing normalization of blank optional fields.",
    };

    const parsed = contactSubmissionSchema.safeParse(input);
    assert.strictEqual(parsed.success, true);
    if (parsed.success) {
      assert.strictEqual(parsed.data.organization, null);
      assert.strictEqual(parsed.data.reason, null);
    }
  });

  it("rejects invalid email formats", () => {
    const invalid = {
      name: "Alice",
      email: "not-an-email",
      message: "Hello there, please reply.",
    };

    const parsed = contactSubmissionSchema.safeParse(invalid);
    assert.strictEqual(parsed.success, false);
    if (!parsed.success) {
      assert.match(parsed.error.issues[0]?.message ?? "", /valid email/i);
    }
  });

  it("rejects missing or empty required fields", () => {
    const missingName = {
      name: "   ",
      email: "test@example.com",
      message: "Hello world message.",
    };
    assert.strictEqual(contactSubmissionSchema.safeParse(missingName).success, false);

    const missingMessage = {
      name: "Valid Name",
      email: "test@example.com",
      message: "   ",
    };
    assert.strictEqual(contactSubmissionSchema.safeParse(missingMessage).success, false);

    const shortMessage = {
      name: "Valid Name",
      email: "test@example.com",
      message: "Hi",
    };
    assert.strictEqual(contactSubmissionSchema.safeParse(shortMessage).success, false);
  });

  it("hashes IP addresses using SHA-256 without persisting raw IP", () => {
    const ip = "192.168.1.42";
    const hashed = hashIp(ip);

    assert.strictEqual(typeof hashed, "string");
    assert.strictEqual(hashed.length, 64); // SHA-256 hex string length
    assert.doesNotMatch(hashed, /192\.168\.1\.42/);

    // Deterministic hash
    assert.strictEqual(hashIp(ip), hashed);
    // Trims whitespace
    assert.strictEqual(hashIp(`  ${ip}  `), hashed);
  });

  it("verifies rate limit constraints match specification §D.5", () => {
    assert.strictEqual(RATE_LIMIT_MAX_COUNT, 5);
    assert.strictEqual(RATE_LIMIT_WINDOW_MS, 60 * 60 * 1000);
  });

  it("captures honeypot field when provided", () => {
    const withHoneypot = {
      name: "Spam Bot",
      email: "spambot@example.com",
      message: "Buy cheap products at this link.",
      honeypot: "https://spamlink.com",
    };

    const parsed = contactSubmissionSchema.safeParse(withHoneypot);
    assert.strictEqual(parsed.success, true);
    if (parsed.success) {
      assert.strictEqual(parsed.data.honeypot, "https://spamlink.com");
    }
  });
});
