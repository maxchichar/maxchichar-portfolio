import "server-only";

import { db, schema } from "@/lib/db";

// Minimal audit logging helper. Action strings match FINAL LOCKED
// SPECIFICATION §D.3/§D.8 at minimum, plus a couple of auth-specific ones
// ('auth.login', 'auth.login_failed', 'auth.locked') that are reasonable
// additions within the same free-text `action` column — there's no CHECK
// constraint restricting values, deliberately, since this list will grow
// with every later phase.
export async function logAudit(entry: {
  userId?: string | null;
  action: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await db.insert(schema.auditLogs).values({
    userId: entry.userId ?? null,
    action: entry.action,
    resourceType: entry.resourceType,
    resourceId: entry.resourceId,
    metadata: entry.metadata,
  });
}
