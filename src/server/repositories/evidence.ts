import "server-only";

import { and, asc, eq } from "drizzle-orm";
import type { NeonDatabase } from "drizzle-orm/neon-serverless";

import { schema } from "@/lib/db";

type Tx =
  | NeonDatabase<typeof schema>
  | Parameters<Parameters<NeonDatabase<typeof schema>["transaction"]>[0]>[0];

export type EvidenceInsert = typeof schema.evidence.$inferInsert;

export async function listEvidenceForProject(tx: Tx, projectId: string) {
  return tx
    .select({ evidence: schema.evidence })
    .from(schema.projectEvidence)
    .innerJoin(schema.evidence, eq(schema.projectEvidence.evidenceId, schema.evidence.id))
    .where(eq(schema.projectEvidence.projectId, projectId))
    .orderBy(asc(schema.evidence.sortOrder))
    .then((rows) => rows.map((r) => r.evidence));
}

export async function insertEvidenceForProject(
  tx: Tx,
  projectId: string,
  input: EvidenceInsert,
) {
  const [row] = await tx.insert(schema.evidence).values(input).returning();
  if (!row) throw new Error("insertEvidenceForProject: insert returned no row");
  await tx.insert(schema.projectEvidence).values({ projectId, evidenceId: row.id });
  return row;
}

/**
 * Deletes evidence only if it's actually linked to `projectId` via
 * project_evidence — scoped, not a bare delete-by-id. Found via security
 * review: an evidenceId belonging to a different project must not be
 * deletable just because the caller supplied a valid projectId alongside
 * it. Returns whether a row was actually deleted.
 */
export async function deleteEvidenceForProject(
  tx: Tx,
  projectId: string,
  evidenceId: string,
): Promise<boolean> {
  const [link] = await tx
    .select()
    .from(schema.projectEvidence)
    .where(
      and(
        eq(schema.projectEvidence.projectId, projectId),
        eq(schema.projectEvidence.evidenceId, evidenceId),
      ),
    )
    .limit(1);

  if (!link) return false;

  await tx.delete(schema.evidence).where(eq(schema.evidence.id, evidenceId));
  return true;
}

export async function listEvidenceForResearch(tx: Tx, researchId: string) {
  return tx
    .select({ evidence: schema.evidence })
    .from(schema.researchEvidence)
    .innerJoin(
      schema.evidence,
      eq(schema.researchEvidence.evidenceId, schema.evidence.id),
    )
    .where(eq(schema.researchEvidence.researchId, researchId))
    .orderBy(asc(schema.evidence.sortOrder))
    .then((rows) => rows.map((r) => r.evidence));
}

export async function insertEvidenceForResearch(
  tx: Tx,
  researchId: string,
  input: EvidenceInsert,
) {
  const [row] = await tx.insert(schema.evidence).values(input).returning();
  if (!row) throw new Error("insertEvidenceForResearch: insert returned no row");
  await tx.insert(schema.researchEvidence).values({ researchId, evidenceId: row.id });
  return row;
}

/** Same scoped-delete safety property as deleteEvidenceForProject, via research_evidence. */
export async function deleteEvidenceForResearch(
  tx: Tx,
  researchId: string,
  evidenceId: string,
): Promise<boolean> {
  const [link] = await tx
    .select()
    .from(schema.researchEvidence)
    .where(
      and(
        eq(schema.researchEvidence.researchId, researchId),
        eq(schema.researchEvidence.evidenceId, evidenceId),
      ),
    )
    .limit(1);

  if (!link) return false;

  await tx.delete(schema.evidence).where(eq(schema.evidence.id, evidenceId));
  return true;
}
