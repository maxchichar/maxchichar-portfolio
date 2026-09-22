import "server-only";

import { fileTypeFromBuffer } from "file-type";
import { disableTypes, imageSize } from "image-size";

import { logAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import {
  ALLOWED_IMAGE_MIME_TYPES,
  type UploadRequestInput,
} from "@/lib/validation/media";
import {
  createPresignedUploadUrl,
  deleteObject,
  fetchObjectBytes,
  generateObjectKey,
  publicUrlFor,
} from "@/lib/storage/r2";

import * as mediaRepo from "../repositories/media";

// Defense in depth against image-size's known-unfixed DoS vulnerability in
// its ICNS/JXL/HEIF parsers (GHSA-w3rx-r6r6-pgpr, GHSA-5p2g-fcmc-qvqq):
// disable those handlers outright, on top of the MIME allow-list gate
// below that never lets their bytes reach image-size in the first place.
disableTypes(["icns", "jxl", "jxl-stream", "heif"]);

export class MediaServiceError extends Error {}

interface Actor {
  id: string;
}

/** Stage 1: validate the declared upload, generate a key, return a presigned PUT URL. */
export async function requestUpload(input: UploadRequestInput, actor: Actor) {
  const storageKey = generateObjectKey();
  const media = await mediaRepo.insertPendingMedia(db, {
    filename: input.filename,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    storageKey,
    storageUrl: publicUrlFor(storageKey),
    status: "PENDING",
    createdBy: actor.id,
  });

  const uploadUrl = await createPresignedUploadUrl(storageKey, input.mimeType);
  return { mediaId: media.id, uploadUrl };
}

/**
 * Stage 2: after the client PUTs the file directly to R2, re-validate the
 * REAL bytes server-side — never trust the client-declared MIME type from
 * stage 1. Transitions PENDING -> READY or REJECTED. Idempotent: calling
 * this again on an already-READY/REJECTED row is a no-op returning the
 * current row, not a re-validation (avoids re-fetching from R2 pointlessly
 * and avoids a confused client retry flipping a REJECTED file to READY).
 */
export async function confirmUpload(mediaId: string) {
  const existing = await mediaRepo.findById(db, mediaId);
  if (!existing) {
    throw new MediaServiceError("Media not found.");
  }
  if (existing.status !== "PENDING") {
    return existing;
  }

  let bytes: Buffer;
  try {
    bytes = await fetchObjectBytes(existing.storageKey);
  } catch (err) {
    await mediaRepo.markRejected(db, mediaId);
    await logAudit({
      userId: existing.createdBy,
      action: "media.rejected",
      resourceType: "media",
      resourceId: mediaId,
      metadata: {
        reason: "could not fetch object from storage",
        error: err instanceof Error ? err.message : String(err),
      },
    });
    throw new MediaServiceError("Could not read the uploaded file from storage.");
  }

  if (bytes.byteLength > 8 * 1024 * 1024) {
    await mediaRepo.markRejected(db, mediaId);
    await deleteObject(existing.storageKey).catch(() => {});
    await logAudit({
      userId: existing.createdBy,
      action: "media.rejected",
      resourceType: "media",
      resourceId: mediaId,
      metadata: { reason: "size exceeded on re-check" },
    });
    return mediaRepo.findById(db, mediaId);
  }

  const sniffed = await fileTypeFromBuffer(bytes);
  const realMime = sniffed?.mime;

  if (
    !realMime ||
    !ALLOWED_IMAGE_MIME_TYPES.includes(
      realMime as (typeof ALLOWED_IMAGE_MIME_TYPES)[number],
    )
  ) {
    await mediaRepo.markRejected(db, mediaId);
    await deleteObject(existing.storageKey).catch(() => {});
    await logAudit({
      userId: existing.createdBy,
      action: "media.rejected",
      resourceType: "media",
      resourceId: mediaId,
      metadata: {
        reason: "real bytes did not match an allowed image type",
        declaredMime: existing.mimeType,
        sniffedMime: realMime ?? null,
      },
    });
    return mediaRepo.findById(db, mediaId);
  }

  let width: number | null = null;
  let height: number | null = null;
  try {
    // Safe here specifically because realMime is already confirmed to be
    // one of the three allow-listed raster types — the vulnerable format
    // handlers are never reached, on top of being disabled outright above.
    const dims = imageSize(bytes);
    width = dims.width ?? null;
    height = dims.height ?? null;
  } catch {
    // Dimension extraction failing doesn't make the file unsafe — a
    // genuinely valid JPEG/PNG/WebP with unusual structure still passed
    // the magic-byte check. Store it as READY without dimensions rather
    // than rejecting a legitimate upload over a cosmetic metadata gap.
  }

  const updated = await mediaRepo.markReady(db, mediaId, {
    mimeType: realMime,
    sizeBytes: bytes.byteLength,
    width,
    height,
  });

  await logAudit({
    userId: existing.createdBy,
    action: "media.validated",
    resourceType: "media",
    resourceId: mediaId,
    metadata: { mimeType: realMime, width, height },
  });

  return updated;
}

/**
 * Level 7.1 added read-only library listing. Level 7.2 extends it with an
 * optional filename search and an "ALL" status option, and adds
 * getMediaById + updateAltText for the detail page. Still defaults to
 * READY-only when no status is given — only validated media is fit to
 * browse/copy a public URL from. No business logic beyond that default:
 * filtering/ordering live in the repository.
 */
export async function listMediaLibrary(options?: {
  status?: mediaRepo.MediaStatus | "ALL";
  filenameQuery?: string;
}) {
  const status = options?.status ?? "READY";
  return mediaRepo.listMedia(db, {
    status: status === "ALL" ? undefined : status,
    filenameQuery: options?.filenameQuery,
  });
}

export async function getMediaById(mediaId: string) {
  return mediaRepo.findById(db, mediaId);
}

export async function updateAltText(
  mediaId: string,
  altText: string | null,
  actor: Actor,
) {
  const updated = await mediaRepo.updateAltText(db, mediaId, altText);
  await logAudit({
    userId: actor.id,
    action: "media.alt_text_updated",
    resourceType: "media",
    resourceId: mediaId,
  });
  return updated;
}

/** Which content type(s), if any, currently reference this media — for
 * the detail page to explain why deletion is blocked, before the admin
 * even attempts it. */
export async function getMediaReferences(mediaId: string) {
  return mediaRepo.checkReferences(db, mediaId);
}

/**
 * Deletes a media row and its R2 object, but only if nothing references
 * it (Project/Research/Article cover, Evidence, or Site Settings — see
 * repositories/media.ts's checkReferences for the full, schema-verified
 * list). Blocked deletions never touch the DB row or the R2 object.
 *
 * Ordering, deliberately: the DB row is deleted first, inside the same
 * transaction as the reference re-check (closing the race window between
 * an admin loading the page and submitting the delete). The R2 object is
 * deleted afterward, best-effort. This order is the only one where a
 * partial failure stays harmless — if the R2 delete fails, the DB row is
 * already gone, so nothing can still display or link to the now-missing
 * object; it's just a leftover object costing a little storage. The
 * reverse order (R2 first) would risk the opposite: a DB row surviving
 * with a dead storageUrl, i.e. exactly the "broken content page" this
 * level exists to prevent — so it's never used, even though it's the more
 * intuitive order to reach for.
 *
 * Status is not special-cased. PENDING/REJECTED media is never exposed to
 * any picker or cover-selection UI, so its reference check is always
 * empty by construction — no separate code path needed. And R2's
 * deleteObject is a no-op on an already-missing key (confirmed against
 * the existing rejection-cleanup call sites, which already call it
 * best-effort after REJECTED transitions), so calling it unconditionally
 * here is safe for every status, including a REJECTED row whose object
 * may already be gone.
 */
export async function deleteMedia(mediaId: string, actor: Actor) {
  const media = await db.transaction(async (tx) => {
    const existing = await mediaRepo.findById(tx, mediaId);
    if (!existing) {
      throw new MediaServiceError("Media not found.");
    }

    const refs = await mediaRepo.checkReferences(tx, mediaId);
    const referencedBy = (Object.keys(refs) as (keyof typeof refs)[]).filter(
      (key) => refs[key],
    );
    if (referencedBy.length > 0) {
      throw new MediaServiceError(
        `Cannot delete — still referenced by: ${referencedBy.join(", ")}.`,
      );
    }

    try {
      return await mediaRepo.deleteById(tx, mediaId);
    } catch (err) {
      // Defense in depth: every reference column is a plain FK with no
      // onDelete action, so Postgres itself would reject this DELETE if
      // something slipped in as a reference between the check above and
      // here (e.g. a concurrent admin action in another tab). Translate
      // that into the same clear error rather than a raw DB exception.
      const code = (err as { code?: string })?.code;
      if (code === "23503") {
        throw new MediaServiceError(
          "Cannot delete — this media was just referenced by other content.",
        );
      }
      throw err;
    }
  });

  try {
    await deleteObject(media.storageKey);
  } catch (err) {
    // The DB row is already gone and nothing referenced it (verified
    // above), so a failed R2 cleanup here is an orphaned object, not a
    // broken page. Logged loudly so it's discoverable; not re-thrown,
    // since failing the whole operation at this point would just leave
    // the admin confused about whether the deletion "worked."
    console.error(
      `deleteMedia: DB row ${mediaId} deleted, but R2 object ${media.storageKey} could not be removed:`,
      err,
    );
  }

  await logAudit({
    userId: actor.id,
    action: "media.deleted",
    resourceType: "media",
    resourceId: mediaId,
    metadata: { filename: media.filename, storageKey: media.storageKey, status: media.status },
  });
}
