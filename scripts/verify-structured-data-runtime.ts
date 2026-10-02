import assert from "node:assert";
import { spawn, type ChildProcess } from "node:child_process";
import { neon } from "@neondatabase/serverless";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const sql = neon(dbUrl);

function extractJsonLdBlocks(
  html: string,
): Array<{ raw: string; data: Record<string, unknown> }> {
  const regex = /<script\s+[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  const blocks: Array<{ raw: string; data: Record<string, unknown> }> = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    const raw = match[1];
    if (typeof raw !== "string") continue;
    try {
      const data = JSON.parse(raw);
      blocks.push({ raw, data });
    } catch (err) {
      throw new Error(
        `Invalid JSON in <script type="application/ld+json">: ${err}\nRaw content:\n${raw}`,
      );
    }
  }
  return blocks;
}

function verifyNoPrivateFields(obj: unknown, path = ""): void {
  if (!obj || typeof obj !== "object") return;

  const forbiddenKeys = [
    "projectId",
    "researchId",
    "articleId",
    "pageId",
    "createdById",
    "createdByType",
    "generationId",
    "generationMode",
    "searchVector",
    "basedOnVersionId",
    "versionNumber",
    "password",
    "secret",
    "token",
    "storageKey",
  ];

  if (Array.isArray(obj)) {
    obj.forEach((item, index) => verifyNoPrivateFields(item, `${path}[${index}]`));
    return;
  }

  for (const [key, value] of Object.entries(obj)) {
    assert.ok(
      !forbiddenKeys.includes(key),
      `Found forbidden private field "${key}" at path "${path}.${key}" in JSON-LD`,
    );

    // If key is "id" and not "@id", check if it's a database UUID
    if (key === "id" && typeof value === "string") {
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
      assert.ok(
        !isUuid,
        `Found private database UUID in field "id" at path "${path}.id"`,
      );
    }

    verifyNoPrivateFields(value, `${path}.${key}`);
  }
}

function getGraphEntities(data: Record<string, unknown>): Array<Record<string, unknown>> {
  if (Array.isArray(data["@graph"])) {
    return data["@graph"] as Array<Record<string, unknown>>;
  }
  return [data];
}

async function verifyRoute(
  baseUrl: string,
  path: string,
  label: string,
  options: {
    expectedTypes?: string[];
    mustHaveJsonLd?: boolean;
    expectedCanonicalUrl?: string;
  } = {},
) {
  const fullUrl = `${baseUrl}${path}`;
  const res = await fetch(fullUrl);
  assert.strictEqual(
    res.status,
    200,
    `Expected 200 OK for ${fullUrl}, got ${res.status}`,
  );

  const html = await res.text();
  const blocks = extractJsonLdBlocks(html);

  console.log(`\n=== [${label}] ${fullUrl} ===`);
  console.log(`Found ${blocks.length} JSON-LD block(s)`);

  if (options.mustHaveJsonLd) {
    assert.strictEqual(
      blocks.length,
      1,
      `Expected exactly 1 JSON-LD block on ${label} to prevent layout/page duplication, found ${blocks.length}`,
    );

    const [block] = blocks;
    assert.ok(block, `Missing block on ${label}`);
    assert.strictEqual(
      block.data["@context"],
      "https://schema.org",
      `Expected @context "https://schema.org" on ${label}`,
    );

    // Verify safe script serialization against HTML injection
    assert.ok(
      !block.raw.includes("</script>"),
      `Unescaped </script> found inside JSON-LD on ${label}`,
    );

    // Verify private data is absent
    verifyNoPrivateFields(block.data, label);

    const entities = getGraphEntities(block.data);
    const types = entities.map((e) => e["@type"]);
    console.log(`Entities in graph:`, types);

    if (options.expectedTypes) {
      for (const expectedType of options.expectedTypes) {
        assert.ok(
          types.includes(expectedType),
          `Expected @type "${expectedType}" in JSON-LD on ${label}, found [${types.join(", ")}]`,
        );
      }
    }

    if (options.expectedCanonicalUrl) {
      // Find main entity (not BreadcrumbList)
      const mainEntity = entities.find((e) => e["@type"] !== "BreadcrumbList");
      assert.ok(mainEntity, `Missing main entity on ${label}`);
      assert.strictEqual(
        mainEntity.url,
        options.expectedCanonicalUrl,
        `Main entity URL (${mainEntity.url}) does not match expected canonical URL (${options.expectedCanonicalUrl}) on ${label}`,
      );
      assert.ok(
        typeof mainEntity.url === "string" && !mainEntity.url.includes("?"),
        `Canonical URL on main entity must not have query parameters: ${mainEntity.url}`,
      );
    }
  } else {
    // If static page with no required structured data, ensure any blocks present are valid
    for (const block of blocks) {
      assert.strictEqual(
        block.data["@context"],
        "https://schema.org",
        `Expected @context "https://schema.org" on ${label}`,
      );
      verifyNoPrivateFields(block.data, label);
    }
  }
}

async function main() {
  const port = "3003";
  const baseUrl = `http://localhost:${port}`;
  const uniqueId = Date.now();
  const workSlug = `ld-work-${uniqueId}`;
  const researchSlug = `ld-res-${uniqueId}`;
  const articleSlug = `ld-art-${uniqueId}`;

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

  let serverProc: ChildProcess | null = null;

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
      VALUES (${project.id}, 1, 'PUBLISHED', 'Structured Data Project', 'A case study for structured data.', ${mediaId}, ${adminId})
    `;

    // 2. Insert Published Research
    const [research] = await sql`
      INSERT INTO research (slug, status, created_by)
      VALUES (${researchSlug}, 'ACTIVE', ${adminId})
      RETURNING id
    `;
    if (!research) throw new Error("Failed to insert test research");
    await sql`
      INSERT INTO research_versions (research_id, version_number, status, title, type, abstract, created_by_id)
      VALUES (${research.id}, 1, 'PUBLISHED', 'Structured Data Research Paper', 'Investigation', 'Abstract on machine-readable web data.', ${adminId})
    `;

    // 3. Insert Published Article
    const [article] = await sql`
      INSERT INTO articles (slug, status, created_by)
      VALUES (${articleSlug}, 'ACTIVE', ${adminId})
      RETURNING id
    `;
    if (!article) throw new Error("Failed to insert test article");
    await sql`
      INSERT INTO article_versions (article_id, version_number, status, title, excerpt, content, created_by_id)
      VALUES (${article.id}, 1, 'PUBLISHED', 'Structured Data Writing', 'Article on JSON-LD architecture.', '{"type":"doc","content":[]}'::jsonb, ${adminId})
    `;

    // 4. Ensure published pages exist for About and Now
    const aboutContent = JSON.stringify({
      slug: "about",
      intro: "Super Intelligence Engineer & Entrepreneur.",
      bio: "Building intelligent systems.",
      whatIBuild: "Intelligent architectures.",
      howIThink: "First principles.",
      interests: "Applied AI and systems.",
      capabilities: "Full-stack and AI engineering.",
      direction: "Autonomous systems.",
    });

    const [aboutPage] = await sql`
      INSERT INTO pages (slug) VALUES ('about')
      ON CONFLICT (slug) DO UPDATE SET slug = 'about'
      RETURNING id
    `;
    if (aboutPage) {
      await sql`
        INSERT INTO page_versions (page_id, version_number, status, content, created_by_id)
        VALUES (${aboutPage.id}, 9998, 'PUBLISHED', ${aboutContent}::jsonb, ${adminId})
      `;
    }

    const nowContent = JSON.stringify({
      slug: "now",
      currentlyBuilding: "Portfolio OS Level 9.6.",
      researching: "Structured data representations.",
      learning: "Distributed inference.",
      interests: "Systems engineering.",
      thesis: "Intelligent software.",
      recentChanges: "Implemented JSON-LD structured data.",
    });

    const [nowPage] = await sql`
      INSERT INTO pages (slug) VALUES ('now')
      ON CONFLICT (slug) DO UPDATE SET slug = 'now'
      RETURNING id
    `;
    if (nowPage) {
      await sql`
        INSERT INTO page_versions (page_id, version_number, status, content, created_by_id)
        VALUES (${nowPage.id}, 9998, 'PUBLISHED', ${nowContent}::jsonb, ${adminId})
      `;
    }

    console.log(`Starting Next.js server on port ${port}...`);
    serverProc = spawn(
      "node",
      ["./node_modules/next/dist/bin/next", "start", "-p", port],
      {
        env: { ...process.env, PORT: port },
        stdio: "pipe",
      },
    );

    // Wait for server to be responsive
    let ready = false;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 300));
      try {
        const res = await fetch(`${baseUrl}/`);
        if (res.status === 200) {
          ready = true;
          break;
        }
      } catch {}
    }
    assert.ok(ready, "Next.js server failed to become ready in time");
    console.log(
      "Server is ready. Executing runtime JSON-LD structured data verifications...",
    );

    // Test static routes
    await verifyRoute(baseUrl, "/", "Homepage /", {
      mustHaveJsonLd: true,
      expectedTypes: ["WebSite", "Person"],
      expectedCanonicalUrl: `${baseUrl}/`,
    });

    await verifyRoute(baseUrl, "/work", "Work Listing");
    await verifyRoute(baseUrl, "/research", "Research Listing");
    await verifyRoute(baseUrl, "/writing", "Writing Listing");
    await verifyRoute(baseUrl, "/about", "About Page");
    await verifyRoute(baseUrl, "/now", "Now Page");
    await verifyRoute(baseUrl, "/contact", "Contact Page");

    // Test dynamic published routes
    await verifyRoute(baseUrl, `/work/${workSlug}`, "Dynamic Work Detail", {
      mustHaveJsonLd: true,
      expectedTypes: ["CreativeWork", "BreadcrumbList"],
      expectedCanonicalUrl: `${baseUrl}/work/${workSlug}`,
    });

    await verifyRoute(baseUrl, `/research/${researchSlug}`, "Dynamic Research Detail", {
      mustHaveJsonLd: true,
      expectedTypes: ["ScholarlyArticle", "BreadcrumbList"],
      expectedCanonicalUrl: `${baseUrl}/research/${researchSlug}`,
    });

    await verifyRoute(baseUrl, `/writing/${articleSlug}`, "Dynamic Writing Detail", {
      mustHaveJsonLd: true,
      expectedTypes: ["Article", "BreadcrumbList"],
      expectedCanonicalUrl: `${baseUrl}/writing/${articleSlug}`,
    });

    // Verify 404 failure closure on non-existent dynamic slug:
    // Must return 404 and NOT expose any structured data for the invalid item.
    const notFoundRes = await fetch(`${baseUrl}/work/non-existent-random-slug-9999`);
    assert.strictEqual(notFoundRes.status, 404, "Invalid slug must return 404");
    const notFoundHtml = await notFoundRes.text();
    const notFoundBlocks = extractJsonLdBlocks(notFoundHtml);
    assert.strictEqual(
      notFoundBlocks.length,
      0,
      "404 route must NOT expose structured data for invalid/unpublished records",
    );

    console.log("\n>>> ALL RUNTIME JSON-LD STRUCTURED DATA VERIFICATIONS PASSED! <<<");
  } finally {
    if (serverProc) {
      serverProc.kill("SIGKILL");
    }

    console.log("\nCleaning up temporary test database records...");
    await sql`DELETE FROM page_versions WHERE version_number = 9998`;
    await sql`DELETE FROM project_versions WHERE title = 'Structured Data Project'`;
    await sql`DELETE FROM projects WHERE slug = ${workSlug}`;
    await sql`DELETE FROM research_versions WHERE title = 'Structured Data Research Paper'`;
    await sql`DELETE FROM research WHERE slug = ${researchSlug}`;
    await sql`DELETE FROM article_versions WHERE title = 'Structured Data Writing'`;
    await sql`DELETE FROM articles WHERE slug = ${articleSlug}`;
    await sql`DELETE FROM media WHERE id = ${mediaId}`;
    console.log("Cleanup complete.");
  }
}

main().catch((err) => {
  console.error("Runtime verification failed:", err);
  process.exit(1);
});
