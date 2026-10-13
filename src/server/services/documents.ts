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

function pgCode(err: unknown): string | undefined {
  let current: unknown = err;
  for (let i = 0; i < 3 && current && typeof current === "object"; i++) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === "string") return code;
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
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
      const expected = key === "cv" ? "document" : "image";
      if (mediaKindOf(media.mimeType) !== expected) {
        return {
          success: false,
          error:
            key === "cv"
              ? "The CV must be a PDF."
              : "The profile photo must be an image.",
        };
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
    const what = key === "cv" ? "The CV" : "The profile photo";
    // 42P01: table missing; 23514: the slot isn't allowed yet (older schema).
    if (isMissingTableError(err) || pgCode(err) === "23514") {
      return {
        success: false,
        error: `${what} needs a database update first. Run \`npm run db:push\`, then try again.`,
      };
    }
    console.error("setSiteDocument error:", err);
    return {
      success: false,
      error: `Couldn't save ${what.toLowerCase()}. Please try again.`,
    };
  }
}
