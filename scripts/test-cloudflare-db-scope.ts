import assert from "node:assert/strict";
import { test } from "node:test";
import { databaseScope } from "../src/lib/db/request";
import { db } from "../src/lib/db";

test("concurrent Worker requests resolve separate database instances", async () => {
  type Database = Parameters<typeof databaseScope.run>[0];
  const a = {
    id: "a",
    select() {
      return this.id;
    },
  };
  const b = {
    id: "b",
    select() {
      return this.id;
    },
  };
  await Promise.all(
    [a, b].map((database) =>
      databaseScope.run(database as unknown as Database, async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        assert.equal(db.select(), database.id);
      }),
    ),
  );
  assert.equal(databaseScope.getStore(), undefined);
});
