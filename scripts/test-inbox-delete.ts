import assert from "node:assert/strict";
import { before, beforeEach, describe, it } from "node:test";

const id = "12345678-1234-4234-8234-123456789012";
let session: { user: { id: string } } | null;
let role: string | undefined;
let exists: boolean;
let failAudit: boolean;
let committed: string[];
let service: typeof import("../src/server/services/contact");

function stub(path: string, exports: unknown) {
  const filename = require.resolve(path);
  require.cache[filename] = {
    id: filename,
    filename,
    loaded: true,
    exports,
  } as NodeJS.Module;
}

// All persistence is simulated. This test never opens a database connection.
before(async () => {
  stub("../src/lib/auth/config", { auth: async () => session });
  const { schema } = await import("../src/lib/db");
  stub("../src/lib/db", {
    schema,
    db: {
      transaction: async (callback: (tx: unknown) => Promise<void>) => {
        const staged: string[] = [];
        const tx = {
          select: () => ({
            from: () => ({
              where: () => ({ limit: async () => (role ? [{ role }] : []) }),
            }),
          }),
          delete: () => ({
            where: () => ({
              returning: async () => {
                staged.push("delete");
                return exists ? [{ id }] : [];
              },
            }),
          }),
          insert: () => ({
            values: async (entry: { resourceId: string; action: string }) => {
              assert.equal(entry.resourceId, id);
              assert.equal(entry.action, "contact.deleted");
              if (failAudit) throw new Error("private database details");
              staged.push("audit");
            },
          }),
        };
        await callback(tx);
        committed.push(...staged);
      },
    },
  });
  service = await import("../src/server/services/contact");
});

beforeEach(() => {
  session = { user: { id } };
  role = "ADMIN";
  exists = true;
  failAudit = false;
  committed = [];
});

describe("Inbox deletion authorization and transaction", () => {
  it("rejects unauthenticated requests", async () => {
    session = null;
    await assert.rejects(service.deleteSubmission(id), /sign in/);
    assert.deepEqual(committed, []);
  });
  for (const deniedRole of ["EDITOR", "AUTHOR", undefined]) {
    it(`rejects current role ${deniedRole}`, async () => {
      role = deniedRole;
      await assert.rejects(service.deleteSubmission(id), /Only admins/);
      assert.deepEqual(committed, []);
    });
  }
  it("rejects malformed IDs", async () => {
    await assert.rejects(service.deleteSubmission("invalid"), /Invalid message/);
    assert.deepEqual(committed, []);
  });
  it("commits deletion and audit together", async () => {
    await service.deleteSubmission(id);
    assert.deepEqual(committed, ["delete", "audit"]);
  });
  it("treats an already deleted message as success without duplicate audit", async () => {
    exists = false;
    await service.deleteSubmission(id);
    assert.deepEqual(committed, ["delete"]);
  });
  it("does not commit when audit logging fails", async () => {
    failAudit = true;
    await assert.rejects(service.deleteSubmission(id), /private database details/);
    assert.deepEqual(committed, []);
  });
});
