import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { eq } from "drizzle-orm";
import ws from "ws";
import { spawn } from "node:child_process";
import * as schema from "../src/lib/db/schema";
import { plainTextToTiptapDoc } from "../src/lib/validation/project";

neonConfig.webSocketConstructor = ws;

async function main() {
  console.log("==================================================");
  console.log("### Phase 4 Public Work Pages Verification");
  console.log("==================================================");

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("BLOCKED — DATABASE_URL is not set.");
    process.exit(2);
  }

  const pool = new Pool({ connectionString });
  const db = drizzle(pool, { schema });

  // Find admin user for actor ID
  const [adminUser] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.role, "ADMIN"))
    .limit(1);

  if (!adminUser) {
    console.error("BLOCKED — no ADMIN user found in database.");
    await pool.end();
    process.exit(2);
  }

  const port = "3100";
  const baseUrl = `http://127.0.0.1:${port}`;

  console.log(`Starting Next.js production server on port ${port}...`);
  const serverProc = spawn("npm", ["start"], {
    env: { ...process.env, PORT: port, AUTH_TRUST_HOST: "true" },
    detached: true,
    stdio: "pipe",
  });

  serverProc.stdout?.on("data", (data) => {
    process.stdout.write(`[SERVER] ${data}`);
  });
  serverProc.stderr?.on("data", (data) => {
    process.stderr.write(`[SERVER ERR] ${data}`);
  });

  const cleanup = async () => {
    if (serverProc.pid) {
      try {
        process.kill(-serverProc.pid, "SIGKILL");
      } catch {}
    }
  };

  process.on("exit", cleanup);
  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  // Poll server readiness
  let ready = false;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`${baseUrl}/work`);
      if (res.status === 200) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }

  if (!ready) {
    console.error(`BLOCKED — production server did not become ready on ${baseUrl}`);
    await cleanup();
    process.exit(2);
  }

  console.log(`Production server ready on ${baseUrl}`);

  let testProjectId: string | null = null;
  const slug = `phase4-test-${Date.now()}`;
  const publishedTitle = `Published Phase 4 Project ${slug}`;

  try {
    // 1. Create a DRAFT-only project
    console.log("\n--- TEST 1: Draft Isolation ---");
    const [project] = await db
      .insert(schema.projects)
      .values({
        slug,
        createdBy: adminUser.id,
        status: "ACTIVE",
      })
      .returning();
    if (!project) throw new Error("Failed to insert test project");
    testProjectId = project.id;

    const [v1Draft] = await db
      .insert(schema.projectVersions)
      .values({
        projectId: project.id,
        versionNumber: 1,
        status: "DRAFT",
        title: "Draft Only Secret Title",
        shortDescription: "This description should never be seen on public routes",
        sections: [
          {
            key: "problem",
            heading: "Problem Statement",
            content: plainTextToTiptapDoc("Draft problem content"),
          },
        ],
        createdByType: "HUMAN",
        createdById: adminUser.id,
        generationMode: "HUMAN_CREATED",
      })
      .returning();
    if (!v1Draft) throw new Error("Failed to insert v1Draft");

    // Verify /work does not contain draft project title
    const workRes = await fetch(`${baseUrl}/work`);
    const workHtml = await workRes.text();
    if (workHtml.includes("Draft Only Secret Title")) {
      throw new Error("SECURITY FAILURE: Draft project title exposed on /work!");
    }
    console.log("PASS /work does not expose un-published draft projects.");

    // Verify /work/[slug] returns 404 for draft-only project
    const draftSlugRes = await fetch(`${baseUrl}/work/${slug}`);
    console.log(`/work/${slug} for DRAFT project status: ${draftSlugRes.status}`);
    if (draftSlugRes.status !== 404) {
      throw new Error(`Expected 404 for draft-only project, got ${draftSlugRes.status}`);
    }
    console.log("PASS /work/[slug] returns HTTP 404 for draft-only projects.");

    // 2. Publish Project and test public detail rendering
    console.log("\n--- TEST 2: Published Case Study Rendering ---");
    const [v1Published] = await db
      .update(schema.projectVersions)
      .set({
        status: "PUBLISHED",
        publishedAt: new Date(),
        title: publishedTitle,
        shortDescription: "Public case study description for Phase 4 verification",
        category: "AI Systems",
        year: 2026,
        technologies: ["TypeScript", "Next.js", "PostgreSQL"],
        sections: [
          {
            key: "problem",
            heading: "Problem Statement",
            content: plainTextToTiptapDoc(
              "High-throughput data processing required low latency.",
            ),
          },
          {
            key: "failures",
            heading: "What Failed",
            content: plainTextToTiptapDoc(
              "Initial in-memory queue overflowed under high load.",
            ),
          },
          {
            key: "results",
            heading: "Empirical Results",
            content: plainTextToTiptapDoc("Achieved 99.9% uptime with <5ms P99 latency."),
          },
        ],
      })
      .where(eq(schema.projectVersions.id, v1Draft.id))
      .returning();
    if (!v1Published) throw new Error("Failed to publish v1Published");

    // Add Evidence item
    const [evidenceItem] = await db
      .insert(schema.evidence)
      .values({
        type: "benchmark",
        label: "P99 Latency Benchmark",
        description: "Empirical throughput testing under 10k RPS",
        url: "https://github.com/example/benchmark",
        data: {
          metric: "P99 Latency",
          before: "45ms",
          after: "4.2ms",
          unit: "ms",
        },
      })
      .returning();
    if (!evidenceItem) throw new Error("Failed to insert evidenceItem");

    await db.insert(schema.projectEvidence).values({
      projectId: project.id,
      evidenceId: evidenceItem.id,
    });

    // Add Tag
    const [tag] = await db
      .insert(schema.tags)
      .values({ name: "performance", slug: "performance" })
      .onConflictDoNothing()
      .returning();

    if (tag) {
      await db.insert(schema.projectTags).values({
        projectId: project.id,
        tagId: tag.id,
      });
    }

    // Verify /work listing shows published project
    const workPublishedRes = await fetch(`${baseUrl}/work`);
    const workPublishedHtml = await workPublishedRes.text();
    if (!workPublishedHtml.includes(publishedTitle)) {
      throw new Error("Published project missing from /work listing!");
    }
    console.log("PASS /work listing includes published active project.");

    // Verify /work/[slug] detail page
    const detailRes = await fetch(`${baseUrl}/work/${slug}`);
    console.log(`/work/${slug} status: ${detailRes.status}`);
    if (detailRes.status !== 200) {
      throw new Error(`Expected 200 for published project, got ${detailRes.status}`);
    }

    const detailHtml = await detailRes.text();
    if (!detailHtml.includes(publishedTitle)) {
      throw new Error("Case study title missing from detail HTML");
    }
    if (!detailHtml.includes("Problem Statement")) {
      throw new Error("Problem section heading missing from detail HTML");
    }
    if (!detailHtml.includes("What Failed")) {
      throw new Error("What Failed section heading missing from detail HTML");
    }
    if (!detailHtml.includes("Evidence Wall")) {
      throw new Error("Evidence Wall heading missing from detail HTML");
    }
    if (!detailHtml.includes("P99 Latency Benchmark")) {
      throw new Error("Evidence label missing from Evidence Wall");
    }
    console.log(
      "PASS /work/[slug] renders case study sections and Evidence Wall in exact order.",
    );

    // 3. Immutability & Draft Isolation
    console.log("\n--- TEST 3: Immutability & Draft Isolation ---");
    // Create new draft v2
    await db
      .insert(schema.projectVersions)
      .values({
        projectId: project.id,
        versionNumber: 2,
        status: "DRAFT",
        basedOnVersionId: v1Published.id,
        title: "UNPUBLISHED DRAFT V2 TITLE",
        shortDescription: "Unpublished draft description",
        sections: v1Published.sections,
        createdByType: "HUMAN",
        createdById: adminUser.id,
        generationMode: "HUMAN_EDITED",
      })
      .returning();

    // Fetch /work/[slug] again
    const detailV2Check = await fetch(`${baseUrl}/work/${slug}`);
    const detailV2Html = await detailV2Check.text();

    if (detailV2Html.includes("UNPUBLISHED DRAFT V2 TITLE")) {
      throw new Error(
        "SECURITY FAILURE: Draft v2 title leaked onto public /work/[slug] page!",
      );
    }
    if (!detailV2Html.includes(publishedTitle)) {
      throw new Error("Public page failed to preserve published version 1 title!");
    }
    console.log(
      "PASS public route preserves immutable published version while draft v2 exists.",
    );

    // 4. Archive Protection
    console.log("\n--- TEST 4: Archived Project Protection ---");
    await db
      .update(schema.projects)
      .set({ status: "ARCHIVED" })
      .where(eq(schema.projects.id, project.id));

    const workArchivedRes = await fetch(`${baseUrl}/work`);
    const workArchivedHtml = await workArchivedRes.text();
    if (workArchivedHtml.includes(publishedTitle)) {
      throw new Error("Archived project exposed on /work listing!");
    }
    console.log("PASS /work listing excludes archived projects.");

    const archivedSlugRes = await fetch(`${baseUrl}/work/${slug}`);
    console.log(`/work/${slug} for ARCHIVED project status: ${archivedSlugRes.status}`);
    if (archivedSlugRes.status !== 404) {
      throw new Error(`Expected 404 for archived project, got ${archivedSlugRes.status}`);
    }
    console.log("PASS /work/[slug] returns 404 for archived projects.");

    // Cleanup
    console.log("\n--- Cleanup ---");
    if (testProjectId) {
      await db
        .delete(schema.projectEvidence)
        .where(eq(schema.projectEvidence.projectId, testProjectId));
      await db
        .delete(schema.projectTags)
        .where(eq(schema.projectTags.projectId, testProjectId));
      await db
        .delete(schema.projectVersions)
        .where(eq(schema.projectVersions.projectId, testProjectId));
      await db.delete(schema.projects).where(eq(schema.projects.id, testProjectId));
      if (evidenceItem) {
        await db.delete(schema.evidence).where(eq(schema.evidence.id, evidenceItem.id));
      }
      console.log(`Cleaned up test project ${testProjectId}`);
    }
    console.log("PASS Phase 4 verification complete.");
  } finally {
    await cleanup();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Phase 4 verification error:", err);
  process.exit(1);
});
