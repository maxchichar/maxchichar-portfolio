import "server-only";

import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import {
  DEFAULT_SITE_SETTINGS,
  siteSettingsSchema,
  type PublicSiteSettings,
} from "@/lib/validation/settings";

import * as settingsRepo from "../repositories/settings";

export class SettingsServiceError extends Error {}

interface Actor {
  id: string;
  type: "HUMAN" | "AI";
}

/**
 * Returns public site settings with canonical fallbacks.
 * Never throws if the database is unreachable or unseeded.
 */
export async function getPublicSiteSettings(): Promise<PublicSiteSettings> {
  try {
    const row = await settingsRepo.getSiteSettings(db);
    if (!row) return DEFAULT_SITE_SETTINGS;

    return {
      siteName: row.siteName || DEFAULT_SITE_SETTINGS.siteName,
      siteDescription: row.siteDescription ?? DEFAULT_SITE_SETTINGS.siteDescription,
      primaryEmail: row.primaryEmail ?? null,
      socialGithub: row.socialGithub ?? null,
      socialX: row.socialX ?? null,
      socialLinkedin: row.socialLinkedin ?? null,
      socialYoutube: row.socialYoutube ?? null,
      socialInstagram: row.socialInstagram ?? null,
      socialTiktok: row.socialTiktok ?? null,
      footerText: row.footerText ?? null,
    };
  } catch {
    // If database is unavailable, fall back cleanly to locked default tokens
    return DEFAULT_SITE_SETTINGS;
  }
}

/**
 * Updates site settings for the singleton row (id = 1).
 */
export async function updateSiteSettings(
  rawInput: unknown,
  actor: Actor,
): Promise<{ success: boolean; settings?: PublicSiteSettings; error?: string }> {
  const parsed = siteSettingsSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid settings input.",
    };
  }

  try {
    const row = await settingsRepo.upsertSiteSettings(db, parsed.data, actor.id);

    await logAudit({
      userId: actor.id,
      action: "settings.updated",
      resourceType: "settings",
      metadata: { siteName: row.siteName },
    });

    return {
      success: true,
      settings: {
        siteName: row.siteName,
        siteDescription: row.siteDescription,
        primaryEmail: row.primaryEmail,
        socialGithub: row.socialGithub,
        socialX: row.socialX,
        socialLinkedin: row.socialLinkedin,
        socialYoutube: row.socialYoutube,
        socialInstagram: row.socialInstagram,
        socialTiktok: row.socialTiktok,
        footerText: row.footerText,
      },
    };
  } catch (err: unknown) {
    console.error("updateSiteSettings error:", err);
    return {
      success: false,
      error: "Failed to update settings. Database may be unreachable.",
    };
  }
}
