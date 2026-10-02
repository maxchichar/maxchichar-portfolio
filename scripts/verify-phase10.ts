/**
 * Phase 10 — Master Non-Destructive Production Release Gate
 *
 * Orchestrates all non-destructive Phase 10 audits in sequence:
 * 1. Preflight Invariants (release freeze, .gitignore, .env.example, route tree)
 * 2. Production Configuration Contract (Neon, Auth.js, R2, site URL, public R2 CDN)
 * 3. Neon Database Schema Integrity (21 tables, 32 FKs, 137 constraints, indices)
 * 4. Live Production Verifier (public routes, SI branding, canonicals, sitemap, robots, security headers, admin boundaries)
 *
 * NOTE: The end-to-end R2 upload/confirm/delete test is intentionally NOT
 * included in this non-destructive master gate; run it independently via:
 *   npm run verify:phase10:r2-e2e
 */

import { execSync } from "node:child_process";

interface GateStep {
  name: string;
  command: string;
}

const STEPS: GateStep[] = [
  {
    name: "1. Pre-Deployment Preflight Invariants",
    command: "npx tsx scripts/verify-phase10-preflight.ts",
  },
  {
    name: "2. Production Environment & Contract Audit",
    command: "npx tsx --env-file=.env.local scripts/verify-phase10-vercel-config.ts",
  },
  {
    name: "3. Neon PostgreSQL Database Schema & Constraint Audit",
    command: "npx tsx --env-file=.env.local scripts/verify-neon-db.ts",
  },
  {
    name: "4. Live Production Runtime Acceptance & Security Audit",
    command: "npx tsx scripts/verify-phase10-production.ts",
  },
];

async function main() {
  console.log("==================================================");
  console.log("=== PHASE 10: MASTER PRODUCTION RELEASE GATE   ===");
  console.log("==================================================");

  for (const step of STEPS) {
    console.log(`\n>>> EXECUTING: ${step.name}`);
    try {
      execSync(step.command, {
        stdio: "inherit",
        env: process.env,
      });
      console.log(`>>> PASS: ${step.name}\n`);
    } catch {
      console.error(`\n>>> FATAL: ${step.name} FAILED! Release gate halted.`);
      process.exit(1);
    }
  }

  console.log("\n==================================================");
  console.log(">>> ALL MASTER PHASE 10 RELEASE AUDITS PASSED  <<<");
  console.log("==================================================");
  process.exit(0);
}

main().catch((err) => {
  console.error("Master release gate fatal error:", err);
  process.exit(1);
});
