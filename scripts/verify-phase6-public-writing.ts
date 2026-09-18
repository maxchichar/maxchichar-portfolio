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
  console.log("### Phase 6 Public Writing Pages Verification");
  console.log("==================================================");

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("BLOCKED — DATABASE_URL is not set.");
    process.exit(2);
  }

  const pool = new Pool({ connectionString });
  const db = drizzle(pool, { schema });

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

  const port = "3101";
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

  let ready = false;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`${baseUrl}/writing`);
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

  let testArticleId: string | null = null;
  let mediaId: string | null = null;
  let tagId: string | null = null;
  const slug = `phase6-test-${Date.now()}`;
  const publishedTitle = `Published Phase 6 Article ${slug}`;
  const storageKey = `test-uploads/phase6-cover-${slug}.jpg`;

  try {
    // 1. Create a DRAFT-only article
    console.log("\n--- TEST 1: Draft Isolation ---");
    const [article] = await db
      .insert(schema.articles)
      .values({ slug, createdBy: adminUser.id, status: "ACTIVE" })
      .returning();
    if (!article) throw new Error("Failed to insert test article");
    testArticleId = article.id;

    const [v1Draft] = await db
      .insert(schema.articleVersions)
      .values({
        articleId: article.id,
        versionNumber: 1,
        status: "DRAFT",
        title: "Draft Only Secret Title",
        excerpt: "This excerpt should never be seen on public routes",
        content: plainTextToTiptapDoc("Draft content that must never leak."),
        createdByType: "HUMAN",
        createdById: adminUser.id,
        generationMode: "HUMAN_CREATED",
      })
      .returning();
    if (!v1Draft) throw new Error("Failed to insert v1Draft");

    const listRes = await fetch(`${baseUrl}/writing`);
    const listHtml = await listRes.text();
    if (listHtml.includes("Draft Only Secret Title")) {
      throw new Error("SECURITY FAILURE: Draft article title exposed on /writing!");
    }
    console.log("PASS /writing does not expose un-published draft articles.");

    const draftSlugRes = await fetch(`${baseUrl}/writing/${slug}`);
    console.log(`/writing/${slug} for DRAFT article status: ${draftSlugRes.status}`);
    if (draftSlugRes.status !== 404) {
      throw new Error(`Expected 404 for draft-only article, got ${draftSlugRes.status}`);
    }
    console.log("PASS /writing/[slug] returns HTTP 404 for draft-only article.");

    // 2. Publish, with cover media + tag, and test public detail rendering
    console.log("\n--- TEST 2: Published Article Rendering ---");
    const [mediaRow] = await db
      .insert(schema.media)
      .values({
        filename: "phase6-cover.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 12345,
        width: 1200,
        height: 630,
        storageKey,
        storageUrl: `https://example-r2-test/${storageKey}`,
        status: "READY",
        createdBy: adminUser.id,
      })
      .returning();
    if (!mediaRow) throw new Error("Failed to insert test media");
    mediaId = mediaRow.id;

    const longContent = [
      "This is the first paragraph of the Tiptap content, used to verify rendering.",
      "This is a second paragraph, on its own line, to verify paragraph splitting works.",
    ].join("\n\n");

    const [v1Published] = await db
      .update(schema.articleVersions)
      .set({
        status: "PUBLISHED",
        publishedAt: new Date(),
        title: publishedTitle,
        excerpt: "Public article excerpt for Phase 6 verification",
        category: "Engineering",
        content: plainTextToTiptapDoc(longContent),
        readingTime: 3,
        coverMediaId: mediaId,
      })
      .where(eq(schema.articleVersions.id, v1Draft.id))
      .returning();
    if (!v1Published) throw new Error("Failed to publish v1Published");

    const [tag] = await db
      .insert(schema.tags)
      .values({ name: "systems-writing", slug: "systems-writing" })
      .onConflictDoNothing()
      .returning();
    if (tag) {
      tagId = tag.id;
      await db.insert(schema.articleTags).values({ articleId: article.id, tagId: tag.id });
    }

    const listPublishedRes = await fetch(`${baseUrl}/writing`);
    const listPublishedHtml = await listPublishedRes.text();
    if (!listPublishedHtml.includes(publishedTitle)) {
      throw new Error("Published article missing from /writing listing!");
    }
    console.log("PASS /writing listing includes published active article.");

    const detailRes = await fetch(`${baseUrl}/writing/${slug}`);
    console.log(`/writing/${slug} status: ${detailRes.status}`);
    if (detailRes.status !== 200) {
      throw new Error(`Expected 200 for published article, got ${detailRes.status}`);
    }

    const detailHtml = await detailRes.text();
    if (!detailHtml.includes(publishedTitle)) {
      throw new Error("Article title missing from detail HTML");
    }
    if (!detailHtml.includes("first paragraph of the Tiptap content")) {
      throw new Error("Tiptap content (paragraph 1) missing from detail HTML");
    }
    if (!detailHtml.includes("second paragraph, on its own line")) {
      throw new Error("Tiptap content (paragraph 2) missing from detail HTML");
    }
    if (!detailHtml.includes("3 min read")) {
      throw new Error("Reading time missing from detail HTML");
    }
    if (!detailHtml.includes(storageKey)) {
      throw new Error("Cover media image missing from detail HTML");
    }
    if (!detailHtml.includes("systems-writing")) {
      throw new Error("Tag missing from detail HTML");
    }
    console.log(
      "PASS /writing/[slug] renders content, reading time, cover media, and tags.",
    );

    // 3. Immutability & Draft Isolation
    console.log("\n--- TEST 3: Immutability & Draft Isolation ---");
    await db.insert(schema.articleVersions).values({
      articleId: article.id,
      versionNumber: 2,
      status: "DRAFT",
      basedOnVersionId: v1Published.id,
      title: "UNPUBLISHED DRAFT V2 TITLE",
      excerpt: "Unpublished draft excerpt",
      content: v1Published.content,
      readingTime: v1Published.readingTime,
      createdByType: "HUMAN",
      createdById: adminUser.id,
      generationMode: "HUMAN_EDITED",
    });

    const detailV2Check = await fetch(`${baseUrl}/writing/${slug}`);
    const detailV2Html = await detailV2Check.text();
    if (detailV2Html.includes("UNPUBLISHED DRAFT V2 TITLE")) {
      throw new Error(
        "SECURITY FAILURE: Draft v2 title leaked onto public /writing/[slug] page!",
      );
    }
    if (!detailV2Html.includes(publishedTitle)) {
      throw new Error("Public page failed to preserve published version 1 title!");
    }
    console.log(
      "PASS public route preserves immutable published version while draft v2 exists.",
    );

    // 4. Archive Protection
    console.log("\n--- TEST 4: Archived Article Protection ---");
    await db
      .update(schema.articles)
      .set({ status: "ARCHIVED" })
      .where(eq(schema.articles.id, article.id));

    const listArchivedRes = await fetch(`${baseUrl}/writing`);
    const listArchivedHtml = await listArchivedRes.text();
    if (listArchivedHtml.includes(publishedTitle)) {
      throw new Error("Archived article exposed on /writing listing!");
    }
    console.log("PASS /writing listing excludes archived article.");

    const archivedSlugRes = await fetch(`${baseUrl}/writing/${slug}`);
    console.log(`/writing/${slug} for ARCHIVED article status: ${archivedSlugRes.status}`);
    if (archivedSlugRes.status !== 404) {
      throw new Error(`Expected 404 for archived article, got ${archivedSlugRes.status}`);
    }
    console.log("PASS /writing/[slug] returns 404 for archived article.");

    // 5. Existing /work and /research behavior remains intact
    console.log("\n--- TEST 5: /work and /research Regression ---");
    const workRes = await fetch(`${baseUrl}/work`);
    if (workRes.status !== 200) {
      throw new Error(`Expected 200 for /work, got ${workRes.status}`);
    }
    console.log("PASS /work is unaffected by the public Writing feature.");

    const researchRes = await fetch(`${baseUrl}/research`);
    if (researchRes.status !== 200) {
      throw new Error(`Expected 200 for /research, got ${researchRes.status}`);
    }
    console.log("PASS /research is unaffected by the public Writing feature.");

    // Cleanup
    console.log("\n--- Cleanup ---");
    if (testArticleId) {
      await db
        .delete(schema.articleTags)
        .where(eq(schema.articleTags.articleId, testArticleId));
      await db
        .delete(schema.articleVersions)
        .where(eq(schema.articleVersions.articleId, testArticleId));
      await db.delete(schema.articles).where(eq(schema.articles.id, testArticleId));
      if (mediaId) {
        await db.delete(schema.media).where(eq(schema.media.id, mediaId));
      }
      console.log(`Cleaned up test article ${testArticleId}`);
    }
    void tagId; // tag row itself is shared/reusable infra — left in place, matching verify-phase5's approach to the tags table
    console.log("PASS Phase 6 verification complete.");
  } finally {
    await cleanup();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Phase 6 verification error:", err);
  process.exit(1);
});
