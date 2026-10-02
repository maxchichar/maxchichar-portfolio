/**
 * Phase 10 — Safe Environment & Vercel Configuration Verifier
 *
 * Validates structural compliance of production environment variables
 * without logging, printing, or disclosing any credentials or secret values.
 */

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
    throw new Error(`Configuration verification failed: ${name}`);
  }
}

export async function verifyVercelProductionConfig(
  env: Record<string, string | undefined>,
) {
  console.log("==================================================");
  console.log("=== PHASE 10.2: PRODUCTION CONFIGURATION AUDIT ===");
  console.log("==================================================");

  // 1. Database Configuration
  logSection("1. Neon Database Configuration");
  const dbUrl = env.DATABASE_URL;
  check("DATABASE_URL is set and non-empty", Boolean(dbUrl && dbUrl.trim().length > 0));
  if (dbUrl) {
    check(
      "DATABASE_URL uses PostgreSQL scheme",
      dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://"),
    );
    check(
      "DATABASE_URL targets Neon infrastructure (*.neon.tech)",
      dbUrl.includes(".neon.tech"),
    );
    check(
      "DATABASE_URL uses pooled connection endpoint (-pooler)",
      dbUrl.includes("-pooler"),
    );
    check(
      "DATABASE_URL enforces TLS requirement (sslmode=require)",
      dbUrl.includes("sslmode=require"),
    );
  }

  // 2. Auth.js Configuration
  logSection("2. Auth.js Configuration");
  const authSecret = env.AUTH_SECRET;
  check(
    "AUTH_SECRET is set and non-empty",
    Boolean(authSecret && authSecret.trim().length > 0),
  );
  if (authSecret) {
    check(
      "AUTH_SECRET has sufficient entropy (>= 32 characters)",
      authSecret.length >= 32,
    );
    check(
      "AUTH_SECRET is not a generic placeholder",
      !authSecret.toLowerCase().includes("placeholder") &&
        !authSecret.toLowerCase().includes("change-me"),
    );
  }

  // 3. Cloudflare R2 Storage Configuration
  logSection("3. Cloudflare R2 Storage Configuration");
  const storageEndpoint = env.STORAGE_ENDPOINT;
  const storageBucket = env.STORAGE_BUCKET;
  const storageAccessKey = env.STORAGE_ACCESS_KEY;
  const storageSecretKey = env.STORAGE_SECRET_KEY;

  check(
    "STORAGE_ENDPOINT is set and non-empty",
    Boolean(storageEndpoint && storageEndpoint.trim().length > 0),
  );
  if (storageEndpoint) {
    check(
      "STORAGE_ENDPOINT is a valid HTTPS URL",
      storageEndpoint.startsWith("https://"),
    );
    check(
      "STORAGE_ENDPOINT targets Cloudflare R2 (*.r2.cloudflarestorage.com)",
      storageEndpoint.includes(".r2.cloudflarestorage.com"),
    );
    check(
      "STORAGE_ENDPOINT contains no path or query components",
      new URL(storageEndpoint).pathname === "/" ||
        new URL(storageEndpoint).pathname === "",
    );
  }

  check(
    "STORAGE_BUCKET is set and non-empty",
    Boolean(storageBucket && storageBucket.trim().length > 0),
  );
  check(
    "STORAGE_ACCESS_KEY is set and non-empty",
    Boolean(storageAccessKey && storageAccessKey.trim().length > 0),
  );
  check(
    "STORAGE_SECRET_KEY is set and non-empty",
    Boolean(storageSecretKey && storageSecretKey.trim().length > 0),
  );

  const storagePublicUrl = env.STORAGE_PUBLIC_URL;
  if (storagePublicUrl !== undefined && storagePublicUrl !== "") {
    check("STORAGE_PUBLIC_URL is non-empty", storagePublicUrl.trim().length > 0);
    check(
      "STORAGE_PUBLIC_URL is a valid HTTPS URL",
      storagePublicUrl.startsWith("https://"),
    );
    check("STORAGE_PUBLIC_URL contains no credentials", !storagePublicUrl.includes("@"));
    check(
      "STORAGE_PUBLIC_URL contains no trailing slash",
      !storagePublicUrl.endsWith("/"),
    );
    check(
      "STORAGE_PUBLIC_URL is not localhost",
      !storagePublicUrl.includes("localhost") && !storagePublicUrl.includes("127.0.0.1"),
    );
    check(
      "STORAGE_PUBLIC_URL is not raw *.r2.cloudflarestorage.com S3 API endpoint",
      !storagePublicUrl.includes(".r2.cloudflarestorage.com"),
    );
    let parsedPublicUrl: URL | null = null;
    try {
      parsedPublicUrl = new URL(storagePublicUrl);
    } catch {
      parsedPublicUrl = null;
    }
    check("STORAGE_PUBLIC_URL parses as valid URL", Boolean(parsedPublicUrl));
    if (parsedPublicUrl) {
      check("STORAGE_PUBLIC_URL contains no query string", parsedPublicUrl.search === "");
      check("STORAGE_PUBLIC_URL contains no hash fragment", parsedPublicUrl.hash === "");
    }
  }

  // 4. Production Domain & Canonical URL
  logSection("4. Production Domain & Canonical URL");
  const siteUrl = env.NEXT_PUBLIC_SITE_URL;
  check(
    "NEXT_PUBLIC_SITE_URL is set and non-empty",
    Boolean(siteUrl && siteUrl.trim().length > 0),
  );
  if (siteUrl) {
    check("NEXT_PUBLIC_SITE_URL uses https:// scheme", siteUrl.startsWith("https://"));
    check("NEXT_PUBLIC_SITE_URL contains no trailing slash", !siteUrl.endsWith("/"));
    check(
      "NEXT_PUBLIC_SITE_URL is not localhost",
      !siteUrl.includes("localhost") && !siteUrl.includes("127.0.0.1"),
    );
    let parsedUrl: URL | null = null;
    try {
      parsedUrl = new URL(siteUrl);
    } catch {
      parsedUrl = null;
    }
    check("NEXT_PUBLIC_SITE_URL parses as valid URL", Boolean(parsedUrl));
    if (parsedUrl) {
      check(
        "NEXT_PUBLIC_SITE_URL contains no search/query parameters",
        parsedUrl.search === "",
      );
      check("NEXT_PUBLIC_SITE_URL contains no hash fragment", parsedUrl.hash === "");
    }
  }

  logSection("PHASE 10.2 CONFIGURATION RESULT");
  console.log(">>> ALL PRODUCTION ENVIRONMENT CONTRACT REQUIREMENTS VERIFIED <<<");
}

// Direct execution entrypoint
if (import.meta.url === `file://${process.argv[1]}`) {
  verifyVercelProductionConfig(process.env).catch((err) => {
    console.error("\nFATAL ERROR IN CONFIGURATION VERIFICATION:", err.message);
    process.exit(1);
  });
}
