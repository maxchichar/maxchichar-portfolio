import fs from "node:fs";
import path from "node:path";

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
    throw new Error(`Preflight check failed: ${name}`);
  }
}

async function runPreflight() {
  console.log("==================================================");
  console.log("=== PHASE 10.1: PRE-DEPLOYMENT PREFLIGHT AUDIT ===");
  console.log("==================================================");

  // 1. Repository Files & Specifications
  logSection("CHECK 1: Repository Structure & Architecture Files");
  const rootDir = process.cwd();

  const requiredFiles = [
    "docs/SPECIFICATION.md",
    "next.config.ts",
    "drizzle.config.ts",
    "package.json",
    "package-lock.json",
    ".gitignore",
    ".env.example",
    "public/og-default.png",
    "src/lib/db/schema.ts",
    "src/lib/auth/config.ts",
    "src/lib/security-headers.ts",
    "src/lib/metadata.ts",
    "src/lib/structured-data.ts",
    "src/lib/storage/r2.ts",
    "src/app/robots.ts",
    "src/app/sitemap.ts",
    "scripts/verify-phase9.ts",
    "scripts/verify-neon-db.ts",
    "drizzle/0000_damp_black_tom.sql",
  ];

  for (const relPath of requiredFiles) {
    const fullPath = path.join(rootDir, relPath);
    const exists = fs.existsSync(fullPath);
    check(`Required file exists: ${relPath}`, exists);
    if (exists) {
      const stat = fs.statSync(fullPath);
      check(`File is non-empty: ${relPath}`, stat.size > 0);
    }
  }

  // 2. Next.js & Security Header Configuration
  logSection("CHECK 2: Next.js Production Security Configuration");
  const nextConfigContent = fs.readFileSync(path.join(rootDir, "next.config.ts"), "utf8");
  check(
    "next.config.ts disables poweredByHeader",
    nextConfigContent.includes("poweredByHeader: false"),
  );
  check(
    "next.config.ts configures security headers",
    nextConfigContent.includes("buildSecurityHeaders") &&
      nextConfigContent.includes("headers()"),
  );

  // 3. Platform & Runtime Requirements
  logSection("CHECK 3: Platform & Runtime Configuration");
  const vercelProjectFile = path.join(rootDir, ".vercel/project.json");
  check(".vercel/project.json exists", fs.existsSync(vercelProjectFile));
  if (fs.existsSync(vercelProjectFile)) {
    const vercelConfig = JSON.parse(fs.readFileSync(vercelProjectFile, "utf8"));
    check(
      "Vercel project configured for Next.js framework",
      vercelConfig.settings?.framework === "nextjs",
    );
    check(
      "Vercel project specifies Node 24 runtime",
      vercelConfig.settings?.nodeVersion === "24.x",
    );
  }

  const nodeVersionMajor = parseInt(process.versions.node.split(".")[0] ?? "0", 10);
  check(
    `Running on supported Node runtime (>= 20, active: ${process.versions.node})`,
    nodeVersionMajor >= 20,
  );

  // 4. Environment Contract Audit
  logSection("CHECK 4: Environment Contract (.env.example)");
  const envExampleContent = fs.readFileSync(path.join(rootDir, ".env.example"), "utf8");
  const requiredEnvVars = [
    "DATABASE_URL",
    "AUTH_SECRET",
    "STORAGE_ENDPOINT",
    "STORAGE_ACCESS_KEY",
    "STORAGE_SECRET_KEY",
    "STORAGE_BUCKET",
    "NEXT_PUBLIC_SITE_URL",
  ];

  for (const envVar of requiredEnvVars) {
    check(
      `.env.example documents ${envVar}`,
      new RegExp(`^#?\\s*${envVar}\\s*=`, "m").test(envExampleContent),
    );
  }

  // Ensure no active credentials in .env.example
  const suspiciousSecretPatterns = [
    /postgresql:\/\/[a-zA-Z0-9_\-\.]+:[a-zA-Z0-9_\-\.]+@/i,
    /:\/\/.*:.*@.*neon\.tech/i,
    /AKIA[0-9A-Z]{16}/,
  ];
  for (const pattern of suspiciousSecretPatterns) {
    check(
      `.env.example free from hardcoded credentials (${pattern})`,
      !pattern.test(envExampleContent),
    );
  }

  // 5. Gitignore Safety Check
  logSection("CHECK 5: .gitignore Deployment Safety");
  const gitignoreContent = fs.readFileSync(path.join(rootDir, ".gitignore"), "utf8");
  check(".gitignore ignores .env*", gitignoreContent.includes(".env*"));
  check(".gitignore ignores .vercel", gitignoreContent.includes(".vercel"));
  check(".gitignore preserves .env.example", gitignoreContent.includes("!.env.example"));
  check(".gitignore ignores node_modules", gitignoreContent.includes("/node_modules"));
  check(".gitignore ignores .next build output", gitignoreContent.includes("/.next/"));

  // 6. Public Route Coverage Check
  logSection("CHECK 6: Public Route Directory Tree");
  const expectedPublicRoutes = [
    "src/app/page.tsx",
    "src/app/work/page.tsx",
    "src/app/work/[slug]/page.tsx",
    "src/app/research/page.tsx",
    "src/app/research/[slug]/page.tsx",
    "src/app/writing/page.tsx",
    "src/app/writing/[slug]/page.tsx",
    "src/app/now/page.tsx",
    "src/app/about/page.tsx",
    "src/app/contact/page.tsx",
    "src/app/admin/login/page.tsx",
    "src/app/admin/(protected)/page.tsx",
  ];

  for (const routePath of expectedPublicRoutes) {
    check(
      `Route file exists: ${routePath}`,
      fs.existsSync(path.join(rootDir, routePath)),
    );
  }

  // 7. OG Default Image Verification
  logSection("CHECK 7: Default OpenGraph Image Asset");
  const ogPath = path.join(rootDir, "public/og-default.png");
  check("OG default image exists in public/", fs.existsSync(ogPath));
  const ogStats = fs.statSync(ogPath);
  check("OG default image is non-empty (> 100KB)", ogStats.size > 100 * 1024);

  logSection("PHASE 10.1 PREFLIGHT RESULT");
  console.log(">>> ALL LOCAL PRE-DEPLOYMENT INVARIANTS VERIFIED <<<");
  console.log(">>> REPOSITORY READY FOR RELEASE FREEZE <<<");
}

runPreflight().catch((err) => {
  console.error("\nFATAL ERROR IN PREFLIGHT AUDIT:", err);
  process.exit(1);
});
