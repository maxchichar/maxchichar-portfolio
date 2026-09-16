import { z } from "zod";

// Strict allow-list, not a denylist. Deliberately excludes SVG (can carry
// embedded scripts — docs/SPECIFICATION.md) and anything image-size's
// known-vulnerable parsers touch (ICNS/JXL/HEIF — GHSA-w3rx-r6r6-pgpr,
// GHSA-5p2g-fcmc-qvqq, no fix available upstream). Gating on this list
// BEFORE ever calling image-size means those vulnerable code paths are
// never reached, regardless of what a malicious upload claims to be.
export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8MB — a cover image, not a design asset dump

export const uploadRequestSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.enum(ALLOWED_IMAGE_MIME_TYPES),
  sizeBytes: z
    .number()
    .int()
    .positive()
    .max(MAX_UPLOAD_BYTES, `File exceeds the ${MAX_UPLOAD_BYTES / 1024 / 1024}MB limit.`),
});
export type UploadRequestInput = z.infer<typeof uploadRequestSchema>;
