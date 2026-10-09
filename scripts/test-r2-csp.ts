// Regression test: the browser PUTs uploads straight to the presigned R2 URL,
// so that URL's origin must be allowed by the CSP connect-src. Run with:
//   npx tsx --conditions=react-server scripts/test-r2-csp.ts
import assert from "node:assert/strict";

process.env.STORAGE_ENDPOINT ||= "https://abc123.r2.cloudflarestorage.com";
process.env.STORAGE_ACCESS_KEY ||= "test-key";
process.env.STORAGE_SECRET_KEY ||= "test-secret";
process.env.STORAGE_BUCKET ||= "portfolio-media";

async function main() {
  const { createPresignedUploadUrl } = await import("../src/lib/storage/r2");
  const { buildCspHeader } = await import("../src/lib/security-headers");

  const url = new URL(await createPresignedUploadUrl("uploads/test", "image/jpeg"));
  const connectSrc =
    buildCspHeader({ isDev: false })
      .split("; ")
      .find((d) => d.startsWith("connect-src"))
      ?.split(" ")
      .slice(1) ?? [];

  assert.ok(
    connectSrc.includes(url.origin),
    `presigned upload origin ${url.origin} is not in connect-src (${connectSrc.join(" ")})`,
  );
  console.log(`PASS presigned upload origin ${url.origin} is allowed by connect-src`);
}

main().catch((err) => {
  console.error("FAIL", err instanceof Error ? err.message : err);
  process.exit(1);
});
