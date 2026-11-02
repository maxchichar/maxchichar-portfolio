import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { expectedSchema, missingFromDatabase } from "../src/lib/db/schema-check";

// A database with everything the code expects.
function fullDatabase() {
  const columns: { table: string; column: string }[] = [];
  const indexes: string[] = [];
  for (const item of expectedSchema()) {
    if (item.startsWith("index ")) indexes.push(item.slice("index ".length));
    else if (item.includes(".")) {
      const [table, column] = item.split(".");
      columns.push({ table: table!, column: column! });
    }
  }
  return { columns, indexes };
}

describe("database schema check", () => {
  it("covers tables, columns and indexes from recent migrations", () => {
    const expected = expectedSchema();
    assert.ok(expected.includes("contact_replies"));
    assert.ok(expected.includes("contact_email_html"));
    assert.ok(expected.includes("site_settings.hero_media_id"));
    assert.ok(expected.includes("index contact_submissions_message_id_idx"));
  });

  it("finds nothing missing on an up-to-date database", () => {
    assert.deepEqual(missingFromDatabase(fullDatabase()), []);
  });

  it("names a missing table once, not each of its columns", () => {
    const db = fullDatabase();
    db.columns = db.columns.filter((c) => c.table !== "contact_replies");
    db.indexes = db.indexes.filter((i) => !i.startsWith("contact_replies_"));
    assert.deepEqual(missingFromDatabase(db), [
      "contact_replies",
      "index contact_replies_submission_created_at_idx",
    ]);
  });

  it("names a missing column and index", () => {
    const db = fullDatabase();
    db.columns = db.columns.filter(
      (c) => !(c.table === "contact_submissions" && c.column === "message_id"),
    );
    db.indexes = db.indexes.filter((i) => i !== "contact_submissions_message_id_idx");
    assert.deepEqual(missingFromDatabase(db), [
      "contact_submissions.message_id",
      "index contact_submissions_message_id_idx",
    ]);
  });
});
