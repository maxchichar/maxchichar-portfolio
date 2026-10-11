import "server-only";

import { and, desc, eq, gt, isNull, lt, or, sql, count } from "drizzle-orm";
import type { NeonDatabase } from "drizzle-orm/neon-serverless";

import { schema } from "@/lib/db";

type Tx = NeonDatabase<typeof schema>;
export type ErrorEventRow = typeof schema.errorEvents.$inferSelect;
export type ErrorEventInsert = typeof schema.errorEvents.$inferInsert;

/** Inserts a new group or bumps an existing one; a resolved group reopens. */
export async function upsert(tx: Tx, data: ErrorEventInsert): Promise<ErrorEventRow> {
  const t = schema.errorEvents;
  const [row] = await tx
    .insert(t)
    .values(data)
    .onConflictDoUpdate({
      target: t.fingerprint,
      set: {
        count: sql`${t.count} + 1`,
        lastSeen: sql`now()`,
        lastPath: data.lastPath ?? null,
        method: data.method ?? null,
        digest: data.digest ?? null,
        stack: sql`coalesce(excluded.stack, ${t.stack})`,
        resolvedAt: null,
      },
    })
    .returning();
  if (!row) throw new Error("errors.upsert returned no row");
  return row;
}

/**
 * Atomically claims the right to alert for a group: succeeds only if it has
 * never alerted or last alerted before `cooldownStart`, so concurrent
 * instances can't send the same email twice.
 */
export async function claimAlert(
  tx: Tx,
  id: string,
  cooldownStart: Date,
): Promise<boolean> {
  const t = schema.errorEvents;
  const rows = await tx
    .update(t)
    .set({ lastAlertedAt: sql`now()` })
    .where(
      and(eq(t.id, id), or(isNull(t.lastAlertedAt), lt(t.lastAlertedAt, cooldownStart))),
    )
    .returning({ id: t.id });
  return rows.length > 0;
}

/** How many groups have sent an alert since `since` (the site-wide cap). */
export async function alertsSince(tx: Tx, since: Date): Promise<number> {
  const t = schema.errorEvents;
  const [row] = await tx.select({ n: count() }).from(t).where(gt(t.lastAlertedAt, since));
  return Number(row?.n ?? 0);
}

export function list(tx: Tx, limit = 200): Promise<ErrorEventRow[]> {
  const t = schema.errorEvents;
  return tx.select().from(t).orderBy(desc(t.lastSeen)).limit(limit);
}

export async function setResolved(tx: Tx, id: string, resolved: boolean) {
  const t = schema.errorEvents;
  // Clearing last_alerted_at means a regression after resolving alerts again.
  await tx
    .update(t)
    .set(
      resolved ? { resolvedAt: sql`now()`, lastAlertedAt: null } : { resolvedAt: null },
    )
    .where(eq(t.id, id));
}

export async function remove(tx: Tx, id: string) {
  await tx.delete(schema.errorEvents).where(eq(schema.errorEvents.id, id));
}
