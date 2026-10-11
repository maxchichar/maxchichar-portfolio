import "server-only";

import { and, asc, desc, eq } from "drizzle-orm";
import type { NeonDatabase } from "drizzle-orm/neon-serverless";

import { schema } from "@/lib/db";

type Tx =
  | NeonDatabase<typeof schema>
  | Parameters<Parameters<NeonDatabase<typeof schema>["transaction"]>[0]>[0];

export type TestimonialRow = typeof schema.testimonials.$inferSelect;
export type TestimonialInsert = typeof schema.testimonials.$inferInsert;

const ORDER = [asc(schema.testimonials.sortOrder), desc(schema.testimonials.createdAt)];

export function listAll(tx: Tx): Promise<TestimonialRow[]> {
  return tx
    .select()
    .from(schema.testimonials)
    .orderBy(...ORDER);
}

export function listVisible(
  tx: Tx,
  filter: { featured?: boolean; projectId?: string },
): Promise<TestimonialRow[]> {
  return tx
    .select()
    .from(schema.testimonials)
    .where(
      and(
        eq(schema.testimonials.visible, true),
        filter.featured ? eq(schema.testimonials.featured, true) : undefined,
        filter.projectId
          ? eq(schema.testimonials.projectId, filter.projectId)
          : undefined,
      ),
    )
    .orderBy(...ORDER);
}

export async function findById(tx: Tx, id: string): Promise<TestimonialRow | null> {
  const [row] = await tx
    .select()
    .from(schema.testimonials)
    .where(eq(schema.testimonials.id, id))
    .limit(1);
  return row ?? null;
}

export async function insert(tx: Tx, data: TestimonialInsert): Promise<TestimonialRow> {
  const [row] = await tx.insert(schema.testimonials).values(data).returning();
  if (!row) throw new Error("testimonials.insert returned no row");
  return row;
}

export async function update(
  tx: Tx,
  id: string,
  data: Partial<TestimonialInsert>,
): Promise<TestimonialRow | null> {
  const [row] = await tx
    .update(schema.testimonials)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(schema.testimonials.id, id))
    .returning();
  return row ?? null;
}

export async function remove(tx: Tx, id: string): Promise<void> {
  await tx.delete(schema.testimonials).where(eq(schema.testimonials.id, id));
}
