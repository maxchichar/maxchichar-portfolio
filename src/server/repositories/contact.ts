import "server-only";

import { and, count, eq, gte } from "drizzle-orm";
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
