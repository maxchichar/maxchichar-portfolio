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

// Documents (the CV). PDF only, verified by magic bytes on confirm like
// images; never passed to image-size.
export const ALLOWED_DOCUMENT_MIME_TYPES = ["application/pdf"] as const;

export const ALLOWED_UPLOAD_MIME_TYPES = [
  ...ALLOWED_IMAGE_MIME_TYPES,
  ...ALLOWED_DOCUMENT_MIME_TYPES,
] as const;

export type MediaKind = "image" | "document";

export function mediaKindOf(mimeType: string): MediaKind | null {
  if ((ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(mimeType)) return "image";
  if ((ALLOWED_DOCUMENT_MIME_TYPES as readonly string[]).includes(mimeType)) {
    return "document";
  }
  return null;
}

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8MB — a cover image, not a design asset dump

export const uploadRequestSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.enum(ALLOWED_UPLOAD_MIME_TYPES, {
    message: "Only JPEG, PNG, WebP images or PDF documents can be uploaded.",
  }),
  sizeBytes: z
    .number()
    .int()
    .positive()
    .max(MAX_UPLOAD_BYTES, `File exceeds the ${MAX_UPLOAD_BYTES / 1024 / 1024}MB limit.`),
});
export type UploadRequestInput = z.infer<typeof uploadRequestSchema>;

export const altTextUpdateSchema = z.object({
  altText: z.string().trim().max(300).optional().nullable(),
});
export type AltTextUpdateInput = z.infer<typeof altTextUpdateSchema>;
