import "server-only";

import { and, count, desc, eq, gte, ne } from "drizzle-orm";
import type { NeonDatabase } from "drizzle-orm/neon-serverless";

import { schema } from "@/lib/db";

type Tx =
  | NeonDatabase<typeof schema>
  | Parameters<Parameters<NeonDatabase<typeof schema>["transaction"]>[0]>[0];

export type ContactSubmissionRow = typeof schema.contactSubmissions.$inferSelect;
export type ContactSubmissionInsert = typeof schema.contactSubmissions.$inferInsert;

export async function insertContactSubmission(
  tx: Tx,
  data: ContactSubmissionInsert,
): Promise<ContactSubmissionRow> {
  const [row] = await tx.insert(schema.contactSubmissions).values(data).returning();
  if (!row) throw new Error("insertContactSubmission: insert returned no row");
  return row;
}

export async function countRecentSubmissionsByIpHash(
  tx: Tx,
  ipHash: string,
  since: Date,
): Promise<number> {
  const [result] = await tx
    .select({ count: count() })
    .from(schema.contactSubmissions)
    .where(
      and(
        eq(schema.contactSubmissions.ipHash, ipHash),
        gte(schema.contactSubmissions.createdAt, since),
      ),
    );
  return Number(result?.count ?? 0);
}

export const INBOX_STATUSES = ["NEW", "READ", "ARCHIVED", "SPAM"] as const;
export type InboxStatus = (typeof INBOX_STATUSES)[number];

/** Admin inbox listing. `null` = everything except spam and archived. */
export async function listSubmissions(tx: Tx, status: InboxStatus | null) {
  const c = schema.contactSubmissions;
  const where = status
    ? eq(c.status, status)
    : and(ne(c.status, "SPAM"), ne(c.status, "ARCHIVED"));
  return tx.select().from(c).where(where).orderBy(desc(c.createdAt)).limit(200);
}

export async function countSubmissionsByStatus(tx: Tx) {
  const c = schema.contactSubmissions;
  const rows = await tx
    .select({ status: c.status, count: count() })
    .from(c)
    .groupBy(c.status);
  return Object.fromEntries(rows.map((r) => [r.status, Number(r.count)])) as Partial<
    Record<InboxStatus, number>
  >;
}

export async function findSubmissionById(tx: Tx, id: string) {
  const [row] = await tx
    .select()
    .from(schema.contactSubmissions)
    .where(eq(schema.contactSubmissions.id, id))
    .limit(1);
  return row ?? null;
}

export async function updateSubmissionStatus(tx: Tx, id: string, status: InboxStatus) {
  await tx
    .update(schema.contactSubmissions)
    .set({ status })
    .where(eq(schema.contactSubmissions.id, id));
}
