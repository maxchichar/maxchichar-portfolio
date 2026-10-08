import "server-only";

import { eq } from "drizzle-orm";
import type { NeonDatabase } from "drizzle-orm/neon-serverless";

import { schema } from "@/lib/db";

type Tx =
  | NeonDatabase<typeof schema>
  | Parameters<Parameters<NeonDatabase<typeof schema>["transaction"]>[0]>[0];

export type SiteSettingsRow = typeof schema.siteSettings.$inferSelect;
export type SiteSettingsInsert = typeof schema.siteSettings.$inferInsert;

export async function getSiteSettings(tx: Tx): Promise<SiteSettingsRow | null> {
  const [row] = await tx
    .select()
    .from(schema.siteSettings)
    .where(eq(schema.siteSettings.id, 1))
    .limit(1);
  return row ?? null;
}

export async function upsertSiteSettings(
  tx: Tx,
  data: Partial<SiteSettingsInsert>,
  actorId?: string,
): Promise<SiteSettingsRow> {
  const existing = await getSiteSettings(tx);

  if (existing) {
    const [row] = await tx
      .update(schema.siteSettings)
      .set({
        ...data,
        updatedBy: actorId ?? existing.updatedBy,
        updatedAt: new Date(),
      })
      .where(eq(schema.siteSettings.id, 1))
      .returning();
    if (!row) throw new Error("upsertSiteSettings: update returned no row");
    return row;
  }

  const [row] = await tx
    .insert(schema.siteSettings)
    .values({
      id: 1,
      siteName: data.siteName ?? "CHIBUEZE MAXWELL",
      siteDescription:
        data.siteDescription ?? "Super Intelligence Engineer & Entrepreneur",
      primaryEmail: data.primaryEmail ?? null,
      socialGithub: data.socialGithub ?? null,
      socialX: data.socialX ?? null,
      socialLinkedin: data.socialLinkedin ?? null,
      socialYoutube: data.socialYoutube ?? null,
      socialInstagram: data.socialInstagram ?? null,
      socialTiktok: data.socialTiktok ?? null,
      footerText: data.footerText ?? null,
      heroMediaId: data.heroMediaId ?? null,
      aboutMediaId: data.aboutMediaId ?? null,
      updatedBy: actorId ?? null,
      updatedAt: new Date(),
    })
    .returning();
  if (!row) throw new Error("upsertSiteSettings: insert returned no row");
  return row;
}
