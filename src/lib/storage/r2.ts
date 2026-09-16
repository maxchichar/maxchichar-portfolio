import "server-only";

import { randomUUID } from "node:crypto";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Cloudflare R2, S3-compatible API — docs/SPECIFICATION.md's media flow:
// presigned PUT direct to R2, never proxied through this server. Client
// never supplies the object key; we always generate it (UUID-based),
// never trust a user-supplied filename as a storage key.

const PRESIGN_EXPIRY_SECONDS = 60 * 5; // 5 minutes to complete the PUT

function client(): S3Client {
  const endpoint = process.env.STORAGE_ENDPOINT;
  const accessKeyId = process.env.STORAGE_ACCESS_KEY;
  const secretAccessKey = process.env.STORAGE_SECRET_KEY;
  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "R2 storage is not configured. STORAGE_ENDPOINT / STORAGE_ACCESS_KEY / STORAGE_SECRET_KEY must all be set — see .env.example.",
    );
  }
  return new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });
}

function bucket(): string {
  const b = process.env.STORAGE_BUCKET;
  if (!b) throw new Error("STORAGE_BUCKET is not set — see .env.example.");
  return b;
}

/** Generates a fresh, non-guessable object key. Never derived from user input. */
export function generateObjectKey(): string {
  return `uploads/${randomUUID()}`;
}

export async function createPresignedUploadUrl(
  storageKey: string,
  contentType: string,
): Promise<string> {
  const cmd = new PutObjectCommand({
    Bucket: bucket(),
    Key: storageKey,
    ContentType: contentType,
  });
  return getSignedUrl(client(), cmd, { expiresIn: PRESIGN_EXPIRY_SECONDS });
}

/** Fetches the real object bytes for server-side validation (magic-byte sniff, dimensions). */
export async function fetchObjectBytes(storageKey: string): Promise<Buffer> {
  const result = await client().send(
    new GetObjectCommand({ Bucket: bucket(), Key: storageKey }),
  );
  const stream = result.Body;
  if (!stream || !("transformToByteArray" in stream)) {
    throw new Error("R2 object body was empty or unreadable.");
  }
  const bytes = await stream.transformToByteArray();
  return Buffer.from(bytes);
}

export async function deleteObject(storageKey: string): Promise<void> {
  await client().send(new DeleteObjectCommand({ Bucket: bucket(), Key: storageKey }));
}

export function publicUrlFor(storageKey: string): string {
  const endpoint = process.env.STORAGE_ENDPOINT ?? "";
  return `${endpoint.replace(/\/$/, "")}/${bucket()}/${storageKey}`;
}
