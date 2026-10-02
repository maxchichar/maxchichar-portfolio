import assert from "node:assert";
import { neon } from "@neondatabase/serverless";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const sql = neon(dbUrl);

function extractMeta(html: string): Record<string, string> {
  const meta: Record<string, string> = {};
  const metaRegex = /<meta\s+([^>]+)>/gi;
  let match: RegExpExecArray | null;
  while ((match = metaRegex.exec(html)) !== null) {
    const tag = match[1];
    if (!tag) continue;
    const propMatch = /property="([^"]+)"/i.exec(tag);
    const nameMatch = /name="([^"]+)"/i.exec(tag);
    const contentMatch = /content="([^"]*)"/i.exec(tag);
    const key = propMatch?.[1] ?? nameMatch?.[1];
    const content = contentMatch?.[1];
    if (key && content !== undefined) {
      meta[key] = content;
    }
  }
  return meta;
}

async function verifyPage(url: string, label: string) {
  const res = await fetch(url);
  assert.strictEqual(res.status, 200, `Expected 200 OK for ${url}, got ${res.status}`);
  const html = await res.text();
  const meta = extractMeta(html);

  console.log(`\n=== [${label}] ${url} ===`);
  console.log("og:title:       ", meta["og:title"]);
  console.log("og:description: ", meta["og:description"]);
  console.log("og:url:         ", meta["og:url"]);
  console.log("og:image:       ", meta["og:image"]);
  console.log("og:type:        ", meta["og:type"]);
  console.log("twitter:card:   ", meta["twitter:card"]);
  console.log("twitter:title:  ", meta["twitter:title"]);
  console.log("twitter:desc:   ", meta["twitter:description"]);
  console.log("twitter:image:  ", meta["twitter:image"]);

  assert.ok(meta["og:title"], `Missing og:title on ${label}`);
  assert.ok(meta["og:description"], `Missing og:description on ${label}`);
  assert.ok(meta["og:url"], `Missing og:url on ${label}`);
  assert.ok(meta["og:image"], `Missing og:image on ${label}`);
  assert.ok(meta["og:type"], `Missing og:type on ${label}`);
  assert.ok(meta["twitter:card"], `Missing twitter:card on ${label}`);
  assert.ok(meta["twitter:title"], `Missing twitter:title on ${label}`);
  assert.ok(meta["twitter:description"], `Missing twitter:description on ${label}`);
  assert.ok(meta["twitter:image"], `Missing twitter:image on ${label}`);

  return meta;
}

async function main() {
  const baseUrl = "http://localhost:3001";
  const uniqueId = Date.now();
  const workSlug = `og-work-test-${uniqueId}`;
  const researchSlug = `og-res-test-${uniqueId}`;
  const articleSlug = `og-art-test-${uniqueId}`;

  // Find admin user for creator ID
  const [adminUser] = await sql`SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1`;
  const adminId = adminUser ? (adminUser.id as string) : null;

  // Insert a test READY media record for cover
  const mediaStorageKey = `test-covers/cover-${uniqueId}.png`;
  const [media] = await sql`
    INSERT INTO media (filename, mime_type, size_bytes, storage_key, storage_url, status)
    VALUES ('cover.png', 'image/png', 1024, ${mediaStorageKey}, ${"https://storage.example.com/" + mediaStorageKey}, 'READY')
    RETURNING id, storage_url
  `;
  if (!media) throw new Error("Failed to insert test media");
  const mediaId = media.id as string;

  try {
    // 1. Insert Published Project with cover
    const [project] = await sql`
      INSERT INTO projects (slug, status, created_by)
      VALUES (${workSlug}, 'ACTIVE', ${adminId})
      RETURNING id
    `;
    if (!project) throw new Error("Failed to insert test project");
    await sql`
      INSERT INTO project_versions (project_id, version_number, status, title, short_description, cover_media_id, created_by_id)
      VALUES (${project.id}, 1, 'PUBLISHED', 'Neural Engine V2', 'A high-throughput neural inference system.', ${mediaId}, ${adminId})
    `;

    // 2. Insert Published Research without cover (testing fallback)
    const [research] = await sql`
      INSERT INTO research (slug, status, created_by)
      VALUES (${researchSlug}, 'ACTIVE', ${adminId})
      RETURNING id
    `;
    if (!research) throw new Error("Failed to insert test research");
    await sql`
      INSERT INTO research_versions (research_id, version_number, status, title, type, abstract, created_by_id)
      VALUES (${research.id}, 1, 'PUBLISHED', 'Latent Space Optimization', 'Investigation', 'Empirical study on transformer attention dynamics.', ${adminId})
    `;

    // 3. Insert Published Article without cover (testing fallback)
    const [article] = await sql`
      INSERT INTO articles (slug, status, created_by)
      VALUES (${articleSlug}, 'ACTIVE', ${adminId})
      RETURNING id
    `;
    if (!article) throw new Error("Failed to insert test article");
    await sql`
      INSERT INTO article_versions (article_id, version_number, status, title, excerpt, content, created_by_id)
      VALUES (${article.id}, 1, 'PUBLISHED', 'On Agentic Architecture', 'Reflections on designing reliable LLM agent pipelines.', '{"type":"doc","content":[]}'::jsonb, ${adminId})
    `;

    // Verify Static Public Pages
    const rootMeta = await verifyPage(`${baseUrl}/`, "Root /");
    assert.strictEqual(rootMeta["og:type"], "website");
    assert.strictEqual(rootMeta["twitter:card"], "summary_large_image");
    assert.strictEqual(rootMeta["og:image"], `${baseUrl}/og-default.png`);

    const workListMeta = await verifyPage(`${baseUrl}/work`, "Work Listing /work");
    assert.strictEqual(workListMeta["og:title"], "Selected Work");
    assert.strictEqual(workListMeta["og:image"], `${baseUrl}/og-default.png`);

    const resListMeta = await verifyPage(
      `${baseUrl}/research`,
      "Research Listing /research",
    );
    assert.strictEqual(resListMeta["og:title"], "Research");
    assert.strictEqual(resListMeta["og:image"], `${baseUrl}/og-default.png`);

    const artListMeta = await verifyPage(
      `${baseUrl}/writing`,
      "Writing Listing /writing",
    );
    assert.strictEqual(artListMeta["og:title"], "Writing");
    assert.strictEqual(artListMeta["og:image"], `${baseUrl}/og-default.png`);

    // Verify Work Detail Page with Cover
    const workDetailMeta = await verifyPage(
      `${baseUrl}/work/${workSlug}`,
      "Work Detail with Cover",
    );
    assert.strictEqual(workDetailMeta["og:title"], "Neural Engine V2");
    assert.strictEqual(
      workDetailMeta["og:description"],
      "A high-throughput neural inference system.",
    );
    assert.strictEqual(workDetailMeta["og:type"], "website");
    assert.strictEqual(workDetailMeta["twitter:card"], "summary_large_image");
    assert.ok(
      workDetailMeta["og:image"]?.includes(mediaStorageKey),
      `Expected cover image to contain ${mediaStorageKey}, got: ${workDetailMeta["og:image"]}`,
    );
    assert.strictEqual(workDetailMeta["twitter:image"], workDetailMeta["og:image"]);

    // Verify Research Detail Page (type: article, fallback image)
    const resDetailMeta = await verifyPage(
      `${baseUrl}/research/${researchSlug}`,
      "Research Detail",
    );
    assert.strictEqual(resDetailMeta["og:title"], "Latent Space Optimization");
    assert.strictEqual(
      resDetailMeta["og:description"],
      "Empirical study on transformer attention dynamics.",
    );
    assert.strictEqual(resDetailMeta["og:type"], "article");
    assert.strictEqual(resDetailMeta["twitter:card"], "summary_large_image");
    assert.strictEqual(resDetailMeta["og:image"], `${baseUrl}/og-default.png`);
    assert.strictEqual(resDetailMeta["twitter:image"], `${baseUrl}/og-default.png`);

    // Verify Writing Detail Page (type: article, fallback image)
    const artDetailMeta = await verifyPage(
      `${baseUrl}/writing/${articleSlug}`,
      "Writing Detail",
    );
    assert.strictEqual(artDetailMeta["og:title"], "On Agentic Architecture");
    assert.strictEqual(
      artDetailMeta["og:description"],
      "Reflections on designing reliable LLM agent pipelines.",
    );
    assert.strictEqual(artDetailMeta["og:type"], "article");
    assert.strictEqual(artDetailMeta["twitter:card"], "summary_large_image");
    assert.strictEqual(artDetailMeta["og:image"], `${baseUrl}/og-default.png`);
    assert.strictEqual(artDetailMeta["twitter:image"], `${baseUrl}/og-default.png`);

    console.log("\n>>> ALL RUNTIME METADATA VERIFICATIONS PASSED! <<<");
  } finally {
    // Clean up test data
    console.log("\nCleaning up test database records...");
    await sql`DELETE FROM project_versions WHERE title = 'Neural Engine V2'`;
    await sql`DELETE FROM projects WHERE slug = ${workSlug}`;
    await sql`DELETE FROM research_versions WHERE title = 'Latent Space Optimization'`;
    await sql`DELETE FROM research WHERE slug = ${researchSlug}`;
    await sql`DELETE FROM article_versions WHERE title = 'On Agentic Architecture'`;
    await sql`DELETE FROM articles WHERE slug = ${articleSlug}`;
    await sql`DELETE FROM media WHERE id = ${mediaId}`;
    console.log("Cleanup complete.");
  }
}

main().catch((err) => {
  console.error("Runtime verification failed:", err);
  process.exit(1);
});
