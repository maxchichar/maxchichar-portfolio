import "server-only";

import { and, desc, eq } from "drizzle-orm";
import type { NeonDatabase } from "drizzle-orm/neon-serverless";

import { schema } from "@/lib/db";

type Tx =
  | NeonDatabase<typeof schema>
  | Parameters<Parameters<NeonDatabase<typeof schema>["transaction"]>[0]>[0];

export type ProjectVersionInsert = typeof schema.projectVersions.$inferInsert;
export type ProjectVersionRow = typeof schema.projectVersions.$inferSelect;
export type ProjectRow = typeof schema.projects.$inferSelect;

export async function findProjectBySlug(tx: Tx, slug: string) {
  const [row] = await tx
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.slug, slug))
    .limit(1);
  return row ?? null;
}

export async function findProjectById(tx: Tx, id: string) {
  const [row] = await tx
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.id, id))
    .limit(1);
  return row ?? null;
}

export async function listProjects(tx: Tx) {
  return tx.select().from(schema.projects).orderBy(desc(schema.projects.createdAt));
}

export async function insertProject(tx: Tx, input: { slug: string; createdBy: string }) {
  const [row] = await tx.insert(schema.projects).values(input).returning();
  if (!row) throw new Error("insertProject: insert returned no row");
  return row;
}

export async function getDraftVersion(
  tx: Tx,
  projectId: string,
): Promise<ProjectVersionRow | null> {
  const [row] = await tx
    .select()
    .from(schema.projectVersions)
    .where(
      and(
        eq(schema.projectVersions.projectId, projectId),
        eq(schema.projectVersions.status, "DRAFT"),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getPublishedVersion(
  tx: Tx,
  projectId: string,
): Promise<ProjectVersionRow | null> {
  const [row] = await tx
    .select()
    .from(schema.projectVersions)
    .where(
      and(
        eq(schema.projectVersions.projectId, projectId),
        eq(schema.projectVersions.status, "PUBLISHED"),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function listVersions(
  tx: Tx,
  projectId: string,
): Promise<ProjectVersionRow[]> {
  return tx
    .select()
    .from(schema.projectVersions)
    .where(eq(schema.projectVersions.projectId, projectId))
    .orderBy(desc(schema.projectVersions.versionNumber));
}

export async function getVersionById(
  tx: Tx,
  versionId: string,
): Promise<ProjectVersionRow | null> {
  const [row] = await tx
    .select()
    .from(schema.projectVersions)
    .where(eq(schema.projectVersions.id, versionId))
    .limit(1);
  return row ?? null;
}

export async function nextVersionNumber(tx: Tx, projectId: string): Promise<number> {
  const versions = await listVersions(tx, projectId);
  return (versions[0]?.versionNumber ?? 0) + 1;
}

export async function insertVersion(
  tx: Tx,
  input: ProjectVersionInsert,
): Promise<ProjectVersionRow> {
  const [row] = await tx.insert(schema.projectVersions).values(input).returning();
  if (!row) throw new Error("insertVersion: insert returned no row");
  return row;
}

export async function updateDraftVersion(
  tx: Tx,
  versionId: string,
  patch: Partial<ProjectVersionInsert>,
): Promise<ProjectVersionRow> {
  const [row] = await tx
    .update(schema.projectVersions)
    .set(patch)
    .where(
      and(
        eq(schema.projectVersions.id, versionId),
        eq(schema.projectVersions.status, "DRAFT"),
      ),
    )
    .returning();
  if (!row) {
    throw new Error(
      "updateDraftVersion: no row updated — version is not DRAFT (or does not exist). Published versions are immutable.",
    );
  }
  return row;
}

export async function markSuperseded(tx: Tx, versionId: string): Promise<void> {
  await tx
    .update(schema.projectVersions)
    .set({ status: "SUPERSEDED" })
    .where(
      and(
        eq(schema.projectVersions.id, versionId),
        eq(schema.projectVersions.status, "PUBLISHED"),
      ),
    );
}

export async function markPublished(
  tx: Tx,
  versionId: string,
): Promise<ProjectVersionRow> {
  const [row] = await tx
    .update(schema.projectVersions)
    .set({ status: "PUBLISHED", publishedAt: new Date() })
    .where(
      and(
        eq(schema.projectVersions.id, versionId),
        eq(schema.projectVersions.status, "DRAFT"),
      ),
    )
    .returning();
  if (!row) throw new Error("markPublished: no DRAFT version found to publish");
  return row;
}

export async function setItemStatus(
  tx: Tx,
  projectId: string,
  status: "ACTIVE" | "ARCHIVED",
): Promise<void> {
  await tx
    .update(schema.projects)
    .set({ status, updatedAt: new Date() })
    .where(eq(schema.projects.id, projectId));
}
