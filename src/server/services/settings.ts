import "server-only";

import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { publicUrlFor } from "@/lib/storage/r2";
import {
  DEFAULT_SITE_SETTINGS,
  siteSettingsSchema,
  type PublicSiteSettings,
  type SiteImage,
} from "@/lib/validation/settings";

import * as mediaRepo from "../repositories/media";
import * as settingsRepo from "../repositories/settings";

export class SettingsServiceError extends Error {}

interface Actor {
  id: string;
  type: "HUMAN" | "AI";
}

/**
 * Resolves a media id into a renderable image. Anything that isn't READY
 * (or has since vanished) resolves to null, so a page never renders a
 * broken or unvalidated image.
 */
async function resolveSiteImage(mediaId: string | null): Promise<SiteImage | null> {
  if (!mediaId) return null;
  const media = await mediaRepo.findById(db, mediaId);
  if (!media || media.status !== "READY") return null;
  return {
    mediaId: media.id,
    url: publicUrlFor(media.storageKey),
    alt: media.altText,
    width: media.width,
    height: media.height,
  };
}

async function toPublicSettings(
  row: settingsRepo.SiteSettingsRow,
): Promise<PublicSiteSettings> {
  const [heroImage, aboutImage] = await Promise.all([
    resolveSiteImage(row.heroMediaId),
    resolveSiteImage(row.aboutMediaId),
  ]);

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
    heroImage,
    aboutImage,
  };
}

/**
 * Returns public site settings with canonical fallbacks.
 * Never throws if the database is unreachable or unseeded.
 */
export async function getPublicSiteSettings(): Promise<PublicSiteSettings> {
  try {
    const row = await settingsRepo.getSiteSettings(db);
    if (!row) return DEFAULT_SITE_SETTINGS;
    return await toPublicSettings(row);
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
    // Client-supplied media ids are untrusted — same rule as cover images:
    // the row must exist and have passed byte validation (READY).
    for (const mediaId of [parsed.data.heroMediaId, parsed.data.aboutMediaId]) {
      if (!mediaId) continue;
      const media = await mediaRepo.findById(db, mediaId);
      if (!media || media.status !== "READY") {
        return {
          success: false,
          error: "That image hasn't finished uploading and validating yet.",
        };
      }
    }

    const row = await settingsRepo.upsertSiteSettings(db, parsed.data, actor.id);

    await logAudit({
      userId: actor.id,
      action: "settings.updated",
      resourceType: "settings",
      metadata: { siteName: row.siteName },
    });

    return { success: true, settings: await toPublicSettings(row) };
  } catch (err: unknown) {
    console.error("updateSiteSettings error:", err);
    return {
      success: false,
      error: "Failed to update settings. Database may be unreachable.",
    };
  }
}

export type SiteImageField = "heroMediaId" | "aboutMediaId";

/**
 * Sets (or clears) one site image immediately — used by the Settings
 * imagery fields so an upload goes live without a separate form save.
 */
export async function setSiteImage(
  field: SiteImageField,
  mediaId: string | null,
  actor: Actor,
): Promise<{ success: boolean; error?: string }> {
  try {
    if (mediaId) {
      const media = await mediaRepo.findById(db, mediaId);
      if (!media || media.status !== "READY") {
        return {
          success: false,
          error: "That image hasn't finished uploading and validating yet.",
        };
      }
    }
    await settingsRepo.upsertSiteSettings(db, { [field]: mediaId }, actor.id);
    await logAudit({
      userId: actor.id,
      action: "settings.image_updated",
      resourceType: "settings",
      metadata: { field, mediaId },
    });
    return { success: true };
  } catch (err) {
    console.error("setSiteImage error:", err);
    return {
      success: false,
      error:
        "Couldn't save the image. If this keeps happening, make sure the latest database migration has been applied.",
    };
  }
}
