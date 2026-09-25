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
  console.log("### Phase 5 Public Research Pages Verification");
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
      const res = await fetch(`${baseUrl}/research`);
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

  let testResearchId: string | null = null;
  const slug = `phase5-test-${Date.now()}`;
  const publishedTitle = `Published Phase 5 Research ${slug}`;

  try {
    // 1. Create a DRAFT-only research item
    console.log("\n--- TEST 1: Draft Isolation ---");
    const [research] = await db
      .insert(schema.research)
      .values({
        slug,
        createdBy: adminUser.id,
        status: "ACTIVE",
      })
      .returning();
    if (!research) throw new Error("Failed to insert test research item");
    testResearchId = research.id;

    const [v1Draft] = await db
      .insert(schema.researchVersions)
      .values({
        researchId: research.id,
        versionNumber: 1,
        status: "DRAFT",
        title: "Draft Only Secret Title",
        type: "Investigation",
        abstract: "This abstract should never be seen on public routes",
        sections: [
          {
            key: "research_question",
            heading: "Research Question",
            content: plainTextToTiptapDoc("Draft research question content"),
          },
        ],
        createdByType: "HUMAN",
        createdById: adminUser.id,
        generationMode: "HUMAN_CREATED",
      })
      .returning();
    if (!v1Draft) throw new Error("Failed to insert v1Draft");

    // Verify /research does not contain draft research title
    const listRes = await fetch(`${baseUrl}/research`);
    const listHtml = await listRes.text();
    if (listHtml.includes("Draft Only Secret Title")) {
      throw new Error("SECURITY FAILURE: Draft research title exposed on /research!");
    }
    console.log("PASS /research does not expose un-published draft research.");

    // Verify /research/[slug] returns 404 for draft-only research
    const draftSlugRes = await fetch(`${baseUrl}/research/${slug}`);
    console.log(`/research/${slug} for DRAFT research status: ${draftSlugRes.status}`);
    if (draftSlugRes.status !== 404) {
      throw new Error(`Expected 404 for draft-only research, got ${draftSlugRes.status}`);
    }
    console.log("PASS /research/[slug] returns HTTP 404 for draft-only research.");

    // 2. Publish and test public detail rendering
    console.log("\n--- TEST 2: Published Research Rendering ---");
    const [v1Published] = await db
      .update(schema.researchVersions)
      .set({
        status: "PUBLISHED",
        publishedAt: new Date(),
        title: publishedTitle,
        type: "Investigation",
        abstract: "Public research abstract for Phase 5 verification",
        category: "Systems",
        sections: [
          {
            key: "research_question",
            heading: "Research Question",
            content: plainTextToTiptapDoc(
              "Does structured evidence improve reader trust in research claims?",
            ),
          },
          {
            key: "evidence_narrative",
            heading: "Evidence",
            content: plainTextToTiptapDoc(
              "The evidence for this investigation was gathered from public benchmarks.",
            ),
          },
          {
            key: "findings",
            heading: "Findings",
            content: plainTextToTiptapDoc(
              "Structured, sourced evidence increased trust.",
            ),
          },
        ],
      })
      .where(eq(schema.researchVersions.id, v1Draft.id))
      .returning();
    if (!v1Published) throw new Error("Failed to publish v1Published");

    // Add structured Evidence (an "Exhibit")
    const [evidenceItem] = await db
      .insert(schema.evidence)
      .values({
        type: "dataset",
        label: "Benchmark Dataset",
        description: "Public dataset used for the investigation",
        url: "https://github.com/example/dataset",
        data: null,
      })
      .returning();
    if (!evidenceItem) throw new Error("Failed to insert evidenceItem");

    await db.insert(schema.researchEvidence).values({
      researchId: research.id,
      evidenceId: evidenceItem.id,
    });

    // Add Tag
    const [tag] = await db
      .insert(schema.tags)
      .values({ name: "research-methods", slug: "research-methods" })
      .onConflictDoNothing()
      .returning();

    if (tag) {
      await db.insert(schema.researchTags).values({
        researchId: research.id,
        tagId: tag.id,
      });
    }

    // Verify /research listing shows published research
    const listPublishedRes = await fetch(`${baseUrl}/research`);
    const listPublishedHtml = await listPublishedRes.text();
    if (!listPublishedHtml.includes(publishedTitle)) {
      throw new Error("Published research missing from /research listing!");
    }
    console.log("PASS /research listing includes published active research.");

    // Verify /research/[slug] detail page
    const detailRes = await fetch(`${baseUrl}/research/${slug}`);
    console.log(`/research/${slug} status: ${detailRes.status}`);
    if (detailRes.status !== 200) {
      throw new Error(`Expected 200 for published research, got ${detailRes.status}`);
    }

    const detailHtml = await detailRes.text();
    if (!detailHtml.includes(publishedTitle)) {
      throw new Error("Research title missing from detail HTML");
    }
    if (!detailHtml.includes("Research Question")) {
      throw new Error("Research Question section heading missing from detail HTML");
    }
    if (!detailHtml.includes("Exhibits")) {
      throw new Error('"Exhibits" heading missing from detail HTML');
    }
    if (detailHtml.includes("Evidence Wall")) {
      throw new Error(
        'Research detail page must label the Evidence Wall "Exhibits", not "Evidence Wall"',
      );
    }
    if (!detailHtml.includes("Benchmark Dataset")) {
      throw new Error("Evidence label missing from Exhibits wall");
    }
    console.log("PASS /research/[slug] renders research sections and Exhibits wall.");

    // 3. Immutability & Draft Isolation
    console.log("\n--- TEST 3: Immutability & Draft Isolation ---");
    await db
      .insert(schema.researchVersions)
      .values({
        researchId: research.id,
        versionNumber: 2,
        status: "DRAFT",
        basedOnVersionId: v1Published.id,
        title: "UNPUBLISHED DRAFT V2 TITLE",
        type: v1Published.type,
        abstract: "Unpublished draft abstract",
        sections: v1Published.sections,
        createdByType: "HUMAN",
        createdById: adminUser.id,
        generationMode: "HUMAN_EDITED",
      })
      .returning();

    const detailV2Check = await fetch(`${baseUrl}/research/${slug}`);
    const detailV2Html = await detailV2Check.text();

    if (detailV2Html.includes("UNPUBLISHED DRAFT V2 TITLE")) {
      throw new Error(
        "SECURITY FAILURE: Draft v2 title leaked onto public /research/[slug] page!",
      );
    }
    if (!detailV2Html.includes(publishedTitle)) {
      throw new Error("Public page failed to preserve published version 1 title!");
    }
    console.log(
      "PASS public route preserves immutable published version while draft v2 exists.",
    );

    // 4. Archive Protection
    console.log("\n--- TEST 4: Archived Research Protection ---");
    await db
      .update(schema.research)
      .set({ status: "ARCHIVED" })
      .where(eq(schema.research.id, research.id));

    const listArchivedRes = await fetch(`${baseUrl}/research`);
    const listArchivedHtml = await listArchivedRes.text();
    if (listArchivedHtml.includes(publishedTitle)) {
      throw new Error("Archived research exposed on /research listing!");
    }
    console.log("PASS /research listing excludes archived research.");

    const archivedSlugRes = await fetch(`${baseUrl}/research/${slug}`);
    console.log(
      `/research/${slug} for ARCHIVED research status: ${archivedSlugRes.status}`,
    );
    if (archivedSlugRes.status !== 404) {
      throw new Error(
        `Expected 404 for archived research, got ${archivedSlugRes.status}`,
      );
    }
    console.log("PASS /research/[slug] returns 404 for archived research.");

    // 5. Existing /work behavior remains intact
    console.log("\n--- TEST 5: /work Regression ---");
    const workRes = await fetch(`${baseUrl}/work`);
    if (workRes.status !== 200) {
      throw new Error(`Expected 200 for /work, got ${workRes.status}`);
    }
    console.log("PASS /work is unaffected by the public Research feature.");

    // Cleanup
    console.log("\n--- Cleanup ---");
    if (testResearchId) {
      await db
        .delete(schema.researchEvidence)
        .where(eq(schema.researchEvidence.researchId, testResearchId));
      await db
        .delete(schema.researchTags)
        .where(eq(schema.researchTags.researchId, testResearchId));
      await db
        .delete(schema.researchVersions)
        .where(eq(schema.researchVersions.researchId, testResearchId));
      await db.delete(schema.research).where(eq(schema.research.id, testResearchId));
      if (evidenceItem) {
        await db.delete(schema.evidence).where(eq(schema.evidence.id, evidenceItem.id));
      }
      console.log(`Cleaned up test research item ${testResearchId}`);
    }
    console.log("PASS Phase 5 verification complete.");
  } finally {
    await cleanup();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Phase 5 verification error:", err);
  process.exit(1);
});
