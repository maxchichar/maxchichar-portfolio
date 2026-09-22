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
