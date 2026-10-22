import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { hasRichContent } from "../src/lib/rich-text";
import { parseRichTextField } from "../src/lib/validation/project";
import { evidenceCreateSchema } from "../src/lib/validation/evidence";
import {
  isOptimizableImage,
  storagePublicUrlFor,
  storageRemotePatterns,
} from "../src/lib/storage/image";
import { buildCspHeader } from "../src/lib/security-headers";

const doc = (...content: unknown[]) => ({ type: "doc", content });

describe("case-study image content", () => {
  it("retains an image-only section after editor form parsing", () => {
    const saved = parseRichTextField(
      JSON.stringify(
        doc({
          type: "image",
          attrs: {
            src: "https://media.example.com/uploads/diagram",
            alt: "Architecture",
          },
        }),
      ),
    );
    assert.equal(hasRichContent(saved), true);
    assert.equal(
      hasRichContent(
        doc({ type: "paragraph", content: [{ type: "text", text: "Evidence" }] }),
      ),
      true,
    );
  });

  it("omits empty sections and images the renderer cannot display", () => {
    for (const value of [
      null,
      doc(),
      doc({ type: "paragraph" }),
      doc({ type: "horizontalRule" }),
      ...[undefined, "", "javascript:alert(1)", "data:image/png;base64,aaa"].map((src) =>
        doc({ type: "image", attrs: { src } }),
      ),
    ]) {
      assert.equal(hasRichContent(value), false);
    }
  });

  it("preserves the selected evidence media ID through validation", () => {
    const mediaId = "8ecc6a75-ed1b-4ef9-a91c-9cebd851d864";
    const parsed = evidenceCreateSchema.parse({
      type: "screenshot",
      label: "RepoTrace",
      mediaId,
    });
    assert.equal(parsed.mediaId, mediaId);
    assert.equal(
      evidenceCreateSchema.safeParse({
        type: "screenshot",
        label: "RepoTrace",
        mediaId: "invalid",
      }).success,
      false,
    );
  });
});

describe("public storage delivery and Next.js configuration", () => {
  it("uses one normalized origin and path for URLs, optimizer and CSP", () => {
    const previous = process.env.STORAGE_PUBLIC_URL;
    const fallback = process.env.NEXT_PUBLIC_STORAGE_URL;
    try {
      delete process.env.NEXT_PUBLIC_STORAGE_URL;
      for (const base of [
        "https://media.example.com/assets/",
        "media.example.com/assets///",
      ]) {
        process.env.STORAGE_PUBLIC_URL = base;
        const url = storagePublicUrlFor("/uploads/diagram");
        assert.equal(url, "https://media.example.com/assets/uploads/diagram");
        assert.equal(isOptimizableImage(url), true);
        assert.deepEqual(storageRemotePatterns(), [
          {
            protocol: "https",
            hostname: "media.example.com",
            port: "",
            pathname: "/assets/uploads/**",
            search: "",
          },
        ]);
        assert.ok(
          buildCspHeader()
            .split("; ")
            .find((s) => s.startsWith("img-src "))
            ?.includes("https://media.example.com"),
        );
        assert.equal(isOptimizableImage(`${url}?token=abc`), false);
        assert.equal(
          isOptimizableImage("https://unrelated.example.com/uploads/diagram"),
          false,
        );
        assert.equal(
          isOptimizableImage("https://media.example.com/assets/other/diagram"),
          false,
        );
      }
      process.env.STORAGE_PUBLIC_URL = " ";
      process.env.NEXT_PUBLIC_STORAGE_URL = "https://media.example.com";
      assert.equal(
        storagePublicUrlFor("uploads/diagram"),
        "https://media.example.com/uploads/diagram",
      );
      delete process.env.NEXT_PUBLIC_STORAGE_URL;
      for (const invalid of [
        "",
        "https://account.r2.cloudflarestorage.com",
        "https://media.example.com?token=secret",
        "https://media.example.com/#hash",
        "https://user:password@media.example.com",
      ]) {
        process.env.STORAGE_PUBLIC_URL = invalid;
        assert.throws(() => storagePublicUrlFor("uploads/diagram"), /STORAGE_PUBLIC_URL/);
        assert.deepEqual(storageRemotePatterns(), []);
      }
    } finally {
      if (previous === undefined) delete process.env.STORAGE_PUBLIC_URL;
      else process.env.STORAGE_PUBLIC_URL = previous;
      if (fallback === undefined) delete process.env.NEXT_PUBLIC_STORAGE_URL;
      else process.env.NEXT_PUBLIC_STORAGE_URL = fallback;
    }
  });
});
