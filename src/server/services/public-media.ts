import "server-only";

import { db } from "@/lib/db";
import { publicUrlFor } from "@/lib/storage/r2";

import * as mediaRepo from "../repositories/media";

/** Public URL for a media row, or null unless it exists and is READY. */
export async function resolveReadyMediaUrl(
  mediaId: string | null,
): Promise<string | null> {
  if (!mediaId) return null;
  const media = await mediaRepo.findById(db, mediaId);
  return media && media.status === "READY" ? publicUrlFor(media.storageKey) : null;
}

/** Attaches each evidence item's image URL (screenshots etc.) for public pages. */
export async function withEvidenceMedia<T extends { mediaId: string | null }>(
  items: T[],
): Promise<(T & { mediaUrl: string | null })[]> {
  return Promise.all(
    items.map(async (item) => ({
      ...item,
      mediaUrl: await resolveReadyMediaUrl(item.mediaId),
    })),
  );
}
