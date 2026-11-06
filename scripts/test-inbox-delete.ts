import assert from "node:assert/strict";
import { before, beforeEach, describe, it } from "node:test";

const id = "12345678-1234-4234-8234-123456789012";
let session: { user: { id: string } } | null;
let role: string | undefined;
let exists: boolean;
let failAudit: boolean;
let committed: string[];
let existing: string[];
let auditAction: string;
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
      transaction: async (callback: (tx: unknown) => Promise<unknown>) => {
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
                return exists ? existing.map((rowId) => ({ id: rowId })) : [];
              },
            }),
          }),
          update: () => ({
            set: (values: { status: string }) => ({
              where: () => ({
                returning: async () => {
                  staged.push(`update:${values.status}`);
                  return exists ? existing.map((rowId) => ({ id: rowId })) : [];
                },
              }),
            }),
          }),
          insert: () => ({
            values: async (
              value:
                | { resourceId: string; action: string }
                | { resourceId: string; action: string }[],
            ) => {
              const entries = Array.isArray(value) ? value : [value];
              for (const entry of entries) {
                assert.ok(existing.includes(entry.resourceId));
                assert.equal(entry.action, auditAction);
              }
              if (failAudit) throw new Error("private database details");
              staged.push(...entries.map(() => "audit"));
            },
          }),
        };
        const result = await callback(tx);
        committed.push(...staged);
        return result;
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
  existing = [id];
  auditAction = "contact.deleted";
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

const id2 = "22345678-1234-4234-8234-123456789012";

describe("Bulk inbox deletion", () => {
  it("deletes several messages with one audit entry each, in one transaction", async () => {
    existing = [id, id2];
    assert.equal(await service.deleteSubmissions([id, id2, id]), 2);
    assert.deepEqual(committed, ["delete", "audit", "audit"]);
  });
  it("rejects unauthenticated requests", async () => {
    session = null;
    await assert.rejects(service.deleteSubmissions([id]), /sign in/);
    assert.deepEqual(committed, []);
  });
  it("rejects non-admins", async () => {
    role = "EDITOR";
    await assert.rejects(service.deleteSubmissions([id]), /Only admins/);
    assert.deepEqual(committed, []);
  });
  it("rejects an empty selection, malformed IDs and oversized batches", async () => {
    await assert.rejects(service.deleteSubmissions([]), /Select some messages/);
    await assert.rejects(service.deleteSubmissions([id, "invalid"]), /Invalid message/);
    const many = Array.from(
      { length: service.MAX_BULK_DELETE + 1 },
      (_, i) => `${String(i).padStart(8, "0")}-1234-4234-8234-123456789012`,
    );
    await assert.rejects(service.deleteSubmissions(many), /at most/);
    assert.deepEqual(committed, []);
  });
  it("counts messages already gone as nothing deleted, without audit", async () => {
    exists = false;
    assert.equal(await service.deleteSubmissions([id]), 0);
    assert.deepEqual(committed, ["delete"]);
  });
  it("does not commit when audit logging fails", async () => {
    existing = [id, id2];
    failAudit = true;
    await assert.rejects(
      service.deleteSubmissions([id, id2]),
      /private database details/,
    );
    assert.deepEqual(committed, []);
  });
});

describe("Bulk status changes", () => {
  beforeEach(() => {
    auditAction = "contact.status_updated";
  });
  it("marks several messages read with one audit entry each", async () => {
    existing = [id, id2];
    assert.equal(await service.setSubmissionsStatus([id, id2], "READ"), 2);
    assert.deepEqual(committed, ["update:READ", "audit", "audit"]);
  });
  it("marks messages unread", async () => {
    assert.equal(await service.setSubmissionsStatus([id], "NEW"), 1);
    assert.deepEqual(committed, ["update:NEW", "audit"]);
  });
  it("rejects unauthenticated requests, bad statuses and bad IDs", async () => {
    await assert.rejects(service.setSubmissionsStatus([id], "DELETED"), /Invalid status/);
    await assert.rejects(
      service.setSubmissionsStatus(["nope"], "READ"),
      /Invalid message/,
    );
    await assert.rejects(service.setSubmissionsStatus([], "READ"), /Select some/);
    session = null;
    await assert.rejects(service.setSubmissionsStatus([id], "READ"), /sign in/);
    assert.deepEqual(committed, []);
  });
  it("audits nothing when nothing changed", async () => {
    exists = false;
    assert.equal(await service.setSubmissionsStatus([id], "READ"), 0);
    assert.deepEqual(committed, ["update:READ"]);
  });
});
