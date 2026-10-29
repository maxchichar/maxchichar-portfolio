import assert from "node:assert";
import { describe, it } from "node:test";

import { fieldMaxLength, pageFields } from "../src/app/admin/(protected)/pages/fields";
import { parseBlocks } from "../src/components/pages/paragraphs";
import { toDescription } from "../src/lib/metadata";
import { contentSchemaForSlug, PAGE_SLUGS } from "../src/lib/validation/page";

describe("page editor fields", () => {
  it("edits exactly the fields each page's schema stores", () => {
    for (const slug of PAGE_SLUGS) {
      const schemaFields = Object.keys(contentSchemaForSlug(slug).shape)
        .filter((name) => name !== "slug")
        .sort();
      const editorFields = pageFields(slug)
        .map(({ name }) => name)
        .sort();
      assert.deepStrictEqual(editorFields, schemaFields, slug);
    }
  });

  it("reads character limits from the schema", () => {
    assert.strictEqual(fieldMaxLength("about", "intro"), 2000);
    assert.strictEqual(fieldMaxLength("home", "heroEyebrow"), 100);
  });
});

describe("parseBlocks", () => {
  it("splits paragraphs on blank lines and joins single line breaks", () => {
    assert.deepStrictEqual(parseBlocks("One\ntwo\n\nThree"), [
      { kind: "p", lines: ["One", "two"] },
      { kind: "p", lines: ["Three"] },
    ]);
  });

  it("turns bullet lines into a list, even straight after a paragraph", () => {
    assert.deepStrictEqual(parseBlocks("Areas:\n- Agents\n* Infra\n• Data\n\nAfter"), [
      { kind: "p", lines: ["Areas:"] },
      { kind: "ul", items: ["Agents", "Infra", "Data"] },
      { kind: "p", lines: ["After"] },
    ]);
  });

  it("leaves hyphenated prose alone", () => {
    assert.deepStrictEqual(parseBlocks("real-world problems -- and more"), [
      { kind: "p", lines: ["real-world problems -- and more"] },
    ]);
  });
});

describe("toDescription", () => {
  it("keeps short text and drops list markers", () => {
    assert.strictEqual(toDescription("- Agents\n- Infra"), "Agents Infra");
  });

  it("trims long text on a word boundary under 160 characters", () => {
    const text = "word ".repeat(60);
    const result = toDescription(text);
    assert.ok(result.length <= 158, String(result.length));
    assert.ok(result.endsWith("word…"), result);
  });
});
