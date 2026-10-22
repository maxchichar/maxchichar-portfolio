import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { drizzle } from "drizzle-orm/neon-serverless";
import { getTableConfig } from "drizzle-orm/pg-core";
import { schema } from "../src/lib/db";
import { deleteArchivedProject } from "../src/server/repositories/projects";
import { deleteUnlinkedEvidence } from "../src/server/repositories/evidence";

const projectId = "1b699f8a-8676-4d18-9667-5c38dfca2a96";
describe("project deletion", () => {
  it("only deletes the requested archived project", async () => {
    const client = {
      async query(query: { text: string }, params: unknown[]) {
        assert.match(query.text, /^delete from "projects"/);
        assert.match(
          query.text,
          /where \("projects"\."id" = \$1 and "projects"\."status" = \$2\)/,
        );
        assert.deepEqual(params, [projectId, "ARCHIVED"]);
        return { rows: [] };
      },
    };
    const database = drizzle({ client: client as never, schema });
    assert.equal(await deleteArchivedProject(database, projectId), null);
  });
  it("cascades project versions and links, while preserving testimonials", () => {
    for (const table of [
      schema.projectVersions,
      schema.projectTags,
      schema.projectEvidence,
    ]) {
      const relation = getTableConfig(table).foreignKeys.find(
        (key) => key.reference().foreignTable === schema.projects,
      );
      assert.ok(relation);
      assert.equal(relation.onDelete, "cascade");
    }
    const testimonial = getTableConfig(schema.testimonials).foreignKeys.find(
      (key) => key.reference().foreignTable === schema.projects,
    );
    assert.equal(testimonial?.onDelete, "set null");
  });
  it("cleans only former project evidence with no remaining project or research references", async () => {
    const client = {
      async query(query: { text: string }, params: unknown[]) {
        assert.match(query.text, /^delete from "evidence"/);
        assert.match(query.text, /not exists \(select .* from "project_evidence"/);
        assert.match(query.text, /not exists \(select .* from "research_evidence"/);
        assert.deepEqual(params, [projectId]);
        return { rows: [] };
      },
    };
    const database = drizzle({ client: client as never, schema });
    await deleteUnlinkedEvidence(database, [projectId]);
    await deleteUnlinkedEvidence(database, []);
  });
});
