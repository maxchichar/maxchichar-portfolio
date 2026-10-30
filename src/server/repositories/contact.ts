import "server-only";

import { and, asc, count, desc, eq, gte, ne } from "drizzle-orm";
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

/** Return only the deleted ID; message content never enters the audit log. */
export async function deleteSubmission(tx: Tx, id: string) {
  const [row] = await tx
    .delete(schema.contactSubmissions)
    .where(eq(schema.contactSubmissions.id, id))
    .returning({ id: schema.contactSubmissions.id });
  return row ?? null;
}

export type ContactReplyRow = typeof schema.contactReplies.$inferSelect;

export async function insertReply(
  tx: Tx,
  data: typeof schema.contactReplies.$inferInsert,
) {
  const [row] = await tx.insert(schema.contactReplies).values(data).returning();
  if (!row) throw new Error("insertReply: insert returned no row");
  return row;
}

/** Replies for one message, oldest first so the thread reads top to bottom. */
export async function listReplies(tx: Tx, submissionId: string) {
  const r = schema.contactReplies;
  return tx
    .select()
    .from(r)
    .where(eq(r.submissionId, submissionId))
    .orderBy(asc(r.createdAt));
}

/** Everything sent from the inbox, newest first, with who it answered. */
export async function listSentReplies(tx: Tx) {
  const r = schema.contactReplies;
  const c = schema.contactSubmissions;
  return tx
    .select({
      id: r.id,
      submissionId: r.submissionId,
      toEmail: r.toEmail,
      subject: r.subject,
      body: r.body,
      createdAt: r.createdAt,
      name: c.name,
    })
    .from(r)
    .innerJoin(c, eq(c.id, r.submissionId))
    .orderBy(desc(r.createdAt))
    .limit(200);
}

export async function countReplies(tx: Tx) {
  const [result] = await tx.select({ count: count() }).from(schema.contactReplies);
  return Number(result?.count ?? 0);
}
