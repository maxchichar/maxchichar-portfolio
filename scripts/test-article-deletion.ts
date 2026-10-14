import assert from "node:assert";
import { describe, it } from "node:test";
import { drizzle } from "drizzle-orm/neon-serverless";
import { getTableConfig } from "drizzle-orm/pg-core";

import { schema } from "../src/lib/db";
import { deleteArchivedArticle } from "../src/server/repositories/articles";

describe("archived article deletion", () => {
  it("restricts the actual delete query to the requested archived article", async () => {
    const id = "1b699f8a-8676-4d18-9667-5c38dfca2a96";
    const client = {
      async query(query: { text: string }, params: unknown[]) {
        assert.match(query.text, /^delete from "articles"/);
        assert.match(
          query.text,
          /where \("articles"\."id" = \$1 and "articles"\."status" = \$2\)/,
        );
        assert.deepStrictEqual(params, [id, "ARCHIVED"]);
        // Active/missing articles produce no deleted rows.
        return { rows: [] };
      },
    };
    const database = drizzle({ client: client as never, schema });
    assert.strictEqual(await deleteArchivedArticle(database, id), null);
  });

  it("removes article versions and tags through the schema's cascade relationships", () => {
    for (const table of [schema.articleVersions, schema.articleTags]) {
      const relation = getTableConfig(table).foreignKeys.find(
        (key) => key.reference().foreignTable === schema.articles,
      );
      assert.ok(relation);
      assert.strictEqual(relation.onDelete, "cascade");
    }
  });
});
