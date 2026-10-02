/**
 * Phase 10 — End-to-End Cloudflare R2 Media Verification
 *
 * Tests the complete media lifecycle against production R2 and Neon DB:
 * 1. Authenticated presign creation
 * 2. Direct S3 PUT to R2
 * 3. Server-side confirmation & magic-byte validation -> READY
 * 4. Verification that publicUrlFor() generates the public R2.dev URL
 * 5. Unauthenticated HTTP GET delivery from the public CDN endpoint
 * 6. Verification of HTTP 200, Content-Type, byte integrity, and no SigV4 required
 * 7. Clean up of test media via supported deleteMedia service
 */

import { publicUrlFor } from "@/lib/storage/r2";
import {
  confirmUpload,
  deleteMedia,
  getMediaById,
  requestUpload,
} from "@/server/services/media";

// 1x1 transparent PNG (67 bytes)
const TEST_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const TEST_PNG_BYTES = Buffer.from(TEST_PNG_BASE64, "base64");

const EXPECTED_PUBLIC_ORIGIN = "https://pub-be5b26d4fdc14d42a7bfa1843c84c207.r2.dev";
const ADMIN_ACTOR = { id: "2e4f8592-1a75-4ac3-b015-405f84c74c1d" };

function logSection(title: string) {
  console.log(`\n==================================================`);
  console.log(`=== ${title}`);
  console.log(`==================================================`);
}

function check(name: string, condition: boolean, details?: string) {
  if (condition) {
    console.log(`PASS: ${name}`);
  } else {
    console.error(`FAIL: ${name}${details ? ` — ${details}` : ""}`);
    throw new Error(`Verification check failed: ${name}`);
  }
}

async function run() {
  console.log("==================================================");
  console.log("=== PHASE 10: END-TO-END R2 MEDIA VERIFICATION ===");
  console.log("==================================================");

  // 1. Stage 1: Request Presigned Upload
  logSection("1. Stage 1: Request Presigned Upload");
  const uploadReq = await requestUpload(
    {
      filename: "phase10-r2-verification.png",
      mimeType: "image/png",
      sizeBytes: TEST_PNG_BYTES.byteLength,
    },
    ADMIN_ACTOR,
  );

  check("Media row created with valid ID", Boolean(uploadReq.mediaId));
  check(
    "Presigned upload URL generated",
    Boolean(uploadReq.uploadUrl && uploadReq.uploadUrl.startsWith("https://")),
  );

  const initialRow = await getMediaById(uploadReq.mediaId);
  check("Initial media status is PENDING", initialRow?.status === "PENDING");
  check(
    "Initial media storageUrl uses STORAGE_PUBLIC_URL",
    initialRow?.storageUrl.startsWith(EXPECTED_PUBLIC_ORIGIN) ?? false,
    `Actual: ${initialRow?.storageUrl}`,
  );

  // 2. Stage 2: Direct HTTP PUT to R2
  logSection("2. Stage 2: Direct HTTP PUT to R2");
  const putRes = await fetch(uploadReq.uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "image/png",
    },
    body: TEST_PNG_BYTES,
  });

  check(
    "Direct PUT to R2 returns HTTP 200",
    putRes.status === 200,
    `Status: ${putRes.status} ${putRes.statusText}`,
  );

  // 3. Stage 3: Confirm Upload & Validate Magic Bytes
  logSection("3. Stage 3: Confirm Upload & Validate Magic Bytes");
  const confirmed = await confirmUpload(uploadReq.mediaId);
  check("Confirmed media status is READY", confirmed?.status === "READY");
  check("Validated MIME type is image/png", confirmed?.mimeType === "image/png");
  check(
    "Validated file size matches byte length",
    confirmed?.sizeBytes === TEST_PNG_BYTES.byteLength,
  );
  check("Extracted width is 1", confirmed?.width === 1);
  check("Extracted height is 1", confirmed?.height === 1);

  // 4. Stage 4: URL Generation Invariant
  logSection("4. Stage 4: Public Delivery URL Verification");
  if (!confirmed) throw new Error("Confirmed row missing");
  const generatedUrl = publicUrlFor(confirmed.storageKey);
  check(
    "publicUrlFor() derives the exact public R2.dev URL",
    generatedUrl.startsWith(`${EXPECTED_PUBLIC_ORIGIN}/`),
    `Generated: ${generatedUrl}`,
  );
  check(
    "publicUrlFor() does not contain raw S3 API hostname",
    !generatedUrl.includes(".r2.cloudflarestorage.com"),
  );

  // 5. Stage 5: Unauthenticated Public CDN GET Fetch
  logSection("5. Stage 5: Unauthenticated Public CDN GET Fetch");
  console.log(`Fetching public media from: ${generatedUrl}`);
  const getRes = await fetch(generatedUrl, {
    method: "GET",
    headers: {
      // Intentionally omitting any Authorization or SigV4 headers
    },
  });

  check(
    "Public unauthenticated GET returns HTTP 200",
    getRes.status === 200,
    `Status: ${getRes.status}`,
  );
  const contentType = getRes.headers.get("content-type");
  check(
    "Public response Content-Type is image/png",
    contentType === "image/png",
    `Actual: ${contentType}`,
  );

  const fetchedBytes = Buffer.from(await getRes.arrayBuffer());
  check(
    "Public response byte length matches uploaded object",
    fetchedBytes.byteLength === TEST_PNG_BYTES.byteLength,
    `Expected: ${TEST_PNG_BYTES.byteLength}, got: ${fetchedBytes.byteLength}`,
  );
  check(
    "Public response binary content matches bit-for-bit",
    fetchedBytes.equals(TEST_PNG_BYTES),
  );

  // 6. Stage 6: Safe Cleanup of Verification Media
  logSection("6. Stage 6: Safe Cleanup of Verification Media");
  await deleteMedia(uploadReq.mediaId, ADMIN_ACTOR);
  const postDeleteRow = await getMediaById(uploadReq.mediaId);
  check("Media row removed from Neon database", postDeleteRow === null);

  const postDeleteGetRes = await fetch(generatedUrl, { method: "GET" });
  check(
    "Public GET on deleted media returns 404",
    postDeleteGetRes.status === 404,
    `Status: ${postDeleteGetRes.status}`,
  );

  logSection("PHASE 10 END-TO-END R2 TEST COMPLETED SUCCESSFULLY");
  console.log(">>> ALL END-TO-END R2 MEDIA TESTS PASS <<<");
  process.exit(0);
}

run().catch((err) => {
  console.error("FATAL ERROR IN R2 E2E VERIFICATION:", err);
  process.exit(1);
});
