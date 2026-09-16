import "server-only";

import { eq, inArray } from "drizzle-orm";
import type { NeonDatabase } from "drizzle-orm/neon-serverless";

import { schema } from "@/lib/db";

type Tx =
  | NeonDatabase<typeof schema>
  | Parameters<Parameters<NeonDatabase<typeof schema>["transaction"]>[0]>[0];

function slugifyTag(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Finds or creates each tag by name, returning their ids. */
export async function ensureTags(tx: Tx, names: string[]): Promise<string[]> {
  const trimmed = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  if (trimmed.length === 0) return [];

  const existing = await tx
    .select()
    .from(schema.tags)
    .where(inArray(schema.tags.name, trimmed));
  const existingByName = new Map(existing.map((t) => [t.name, t]));

  const toCreate = trimmed.filter((n) => !existingByName.has(n));
  const created = toCreate.length
    ? await tx
        .insert(schema.tags)
        .values(toCreate.map((name) => ({ name, slug: slugifyTag(name) })))
        .returning()
    : [];

  return [...existing, ...created].map((t) => t.id);
}

export async function setProjectTags(tx: Tx, projectId: string, tagIds: string[]) {
  await tx.delete(schema.projectTags).where(eq(schema.projectTags.projectId, projectId));
  if (tagIds.length > 0) {
    await tx
      .insert(schema.projectTags)
      .values(tagIds.map((tagId) => ({ projectId, tagId })));
  }
}

export async function getProjectTags(tx: Tx, projectId: string) {
  return tx
    .select({ tag: schema.tags })
    .from(schema.projectTags)
    .innerJoin(schema.tags, eq(schema.projectTags.tagId, schema.tags.id))
    .where(eq(schema.projectTags.projectId, projectId))
    .then((rows) => rows.map((r) => r.tag));
}
