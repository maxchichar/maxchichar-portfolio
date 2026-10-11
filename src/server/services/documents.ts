import "server-only";

import { logAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { isMissingTableError } from "@/lib/db/errors";
import type { SiteDocumentKey } from "@/lib/db/schema";
import { publicUrlFor } from "@/lib/storage/r2";
import { mediaKindOf } from "@/lib/validation/media";

import * as documentsRepo from "../repositories/documents";
import * as mediaRepo from "../repositories/media";

export interface SiteDocument {
  mediaId: string;
  filename: string;
  storageKey: string;
  url: string;
  sizeBytes: number;
  updatedAt: Date;
}

let warnedMissing = false;
function warnMissingTable() {
  if (warnedMissing) return;
  warnedMissing = true;
  console.warn(
    "site_documents table not found: run `npm run db:push` to enable the CV download.",
  );
}

/**
 * The document in a slot, or null when there is none, it isn't READY, or
 * the table doesn't exist yet. Never throws: a missing CV must never break
 * the pages that offer it.
 */
export async function getSiteDocument(
  key: SiteDocumentKey,
): Promise<SiteDocument | null> {
  try {
    const row = await documentsRepo.findDocument(db, key);
    if (!row || row.media.status !== "READY") return null;
    return {
      mediaId: row.media.id,
      filename: row.media.filename,
      storageKey: row.media.storageKey,
      url: publicUrlFor(row.media.storageKey),
      sizeBytes: row.media.sizeBytes,
      updatedAt: row.updatedAt,
    };
  } catch (err) {
    if (isMissingTableError(err)) warnMissingTable();
    else console.error("getSiteDocument error:", err);
    return null;
  }
}

/** For the admin: whether the feature is usable (table migrated). */
export async function isSiteDocumentsAvailable(): Promise<boolean> {
  try {
    await documentsRepo.findDocument(db, "cv");
    return true;
  } catch (err) {
    if (isMissingTableError(err)) return false;
    throw err;
  }
}

/** Sets or clears a document slot. Only READY PDFs are accepted. */
export async function setSiteDocument(
  key: SiteDocumentKey,
  mediaId: string | null,
  actor: { id: string },
): Promise<{ success: boolean; error?: string }> {
  try {
    if (mediaId) {
      const media = await mediaRepo.findById(db, mediaId);
      if (!media || media.status !== "READY") {
        return {
          success: false,
          error: "That file hasn't finished uploading and validating yet.",
        };
      }
      if (mediaKindOf(media.mimeType) !== "document") {
        return { success: false, error: "The CV must be a PDF." };
      }
      await documentsRepo.setDocument(db, key, mediaId, actor.id);
    } else {
      await documentsRepo.clearDocument(db, key);
    }
    await logAudit({
      userId: actor.id,
      action: "settings.document_updated",
      resourceType: "settings",
      metadata: { key, mediaId },
    });
    return { success: true };
  } catch (err) {
    if (isMissingTableError(err)) {
      return {
        success: false,
        error:
          "The CV needs a database update first. Run `npm run db:push`, then try again.",
      };
    }
    console.error("setSiteDocument error:", err);
    return { success: false, error: "Couldn't save the CV. Please try again." };
  }
}
