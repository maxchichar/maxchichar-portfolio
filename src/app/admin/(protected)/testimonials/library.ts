import "server-only";

import { listMediaLibrary } from "@/server/services/media";

/** Image library for the photo picker. */
export async function imageLibrary() {
  const media = await listMediaLibrary({ status: "READY", kind: "image" });
  return media.map((m) => ({
    id: m.id,
    filename: m.filename,
    storageUrl: m.storageUrl,
    width: m.width,
    height: m.height,
  }));
}
