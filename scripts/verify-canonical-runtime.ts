import assert from "node:assert";
import { spawn, type ChildProcess } from "node:child_process";
import { neon } from "@neondatabase/serverless";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const sql = neon(dbUrl);

function extractHeadTags(html: string): {
  canonical: string | null;
  ogUrl: string | null;
} {
  const canonicalMatch = /<link\s+[^>]*rel="canonical"[^>]*href="([^"]+)"[^>]*\/?>/i.exec(
    html,
  );
  const ogUrlMatch =
    /<meta\s+[^>]*property="og:url"[^>]*content="([^"]+)"[^>]*\/?>/i.exec(html);

  return {
    canonical: canonicalMatch?.[1] ?? null,
    ogUrl: ogUrlMatch?.[1] ?? null,
  };
}

async function verifyRoute(
  baseUrl: string,
  path: string,
  expectedPath: string,
  label: string,
) {
  const fullUrl = `${baseUrl}${path}`;
  const res = await fetch(fullUrl);
  assert.strictEqual(
    res.status,
    200,
    `Expected 200 OK for ${fullUrl}, got ${res.status}`,
  );

  const html = await res.text();
  const { canonical, ogUrl } = extractHeadTags(html);

  console.log(`\n=== [${label}] ${fullUrl} ===`);
  console.log("canonical: ", canonical);
  console.log("og:url:    ", ogUrl);

  assert.ok(canonical, `Missing <link rel="canonical"> on ${label}`);
  assert.ok(ogUrl, `Missing <meta property="og:url"> on ${label}`);

  const expectedFullUrl = `${baseUrl}${expectedPath}`;
  assert.strictEqual(canonical, expectedFullUrl, `Canonical URL mismatch on ${label}`);
  assert.strictEqual(ogUrl, expectedFullUrl, `OG URL mismatch on ${label}`);
  assert.strictEqual(
    canonical,
    ogUrl,
    `Canonical and OG URL must match exactly on ${label}`,
  );
  assert.ok(
    !canonical.includes("?"),
    `Canonical must NOT contain query parameters on ${label}`,
  );
  assert.ok(!ogUrl.includes("?"), `OG URL must NOT contain query parameters on ${label}`);
}

async function main() {
  const port = "3002";
  const baseUrl = `http://localhost:${port}`;
  const uniqueId = Date.now();
  const workSlug = `can-work-${uniqueId}`;
  const researchSlug = `can-res-${uniqueId}`;
  const articleSlug = `can-art-${uniqueId}`;

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
      VALUES (${project.id}, 1, 'PUBLISHED', 'Canonical System V1', 'Verified canonical project.', ${mediaId}, ${adminId})
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
      VALUES (${research.id}, 1, 'PUBLISHED', 'Canonical Research Paper', 'Investigation', 'Abstract notes.', ${adminId})
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
      VALUES (${article.id}, 1, 'PUBLISHED', 'Canonical Article', 'Excerpt notes.', '{"type":"doc","content":[]}'::jsonb, ${adminId})
    `;

    // 4. Ensure published pages exist for About and Now
    const aboutContent = JSON.stringify({
      slug: "about",
      intro: "Super Intelligence Engineer & Entrepreneur.",
      bio: "Building systems.",
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
        VALUES (${aboutPage.id}, 9999, 'PUBLISHED', ${aboutContent}::jsonb, ${adminId})
      `;
    }

    const nowContent = JSON.stringify({
      slug: "now",
      currentlyBuilding: "Portfolio OS and AI agents.",
      researching: "Attention mechanisms.",
      learning: "Distributed inference.",
      interests: "Systems engineering.",
      thesis: "Intelligent software.",
      recentChanges: "Launched Level 9.5.",
    });

    const [nowPage] = await sql`
      INSERT INTO pages (slug) VALUES ('now')
      ON CONFLICT (slug) DO UPDATE SET slug = 'now'
      RETURNING id
    `;
    if (nowPage) {
      await sql`
        INSERT INTO page_versions (page_id, version_number, status, content, created_by_id)
        VALUES (${nowPage.id}, 9999, 'PUBLISHED', ${nowContent}::jsonb, ${adminId})
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
    console.log("Server is ready. Executing runtime canonical verifications...");

    // Test static routes
    await verifyRoute(baseUrl, "/", "", "Root Homepage /");
    await verifyRoute(baseUrl, "/work", "/work", "Work Listing");
    await verifyRoute(baseUrl, "/research", "/research", "Research Listing");
    await verifyRoute(baseUrl, "/writing", "/writing", "Writing Listing");
    await verifyRoute(baseUrl, "/about", "/about", "About Page");
    await verifyRoute(baseUrl, "/now", "/now", "Now Page");
    await verifyRoute(baseUrl, "/contact", "/contact", "Contact Page");

    // Test dynamic routes
    await verifyRoute(
      baseUrl,
      `/work/${workSlug}`,
      `/work/${workSlug}`,
      "Dynamic Work Detail",
    );
    await verifyRoute(
      baseUrl,
      `/research/${researchSlug}`,
      `/research/${researchSlug}`,
      "Dynamic Research Detail",
    );
    await verifyRoute(
      baseUrl,
      `/writing/${articleSlug}`,
      `/writing/${articleSlug}`,
      "Dynamic Writing Detail",
    );

    // Test query parameter stripping on both static and dynamic routes
    await verifyRoute(
      baseUrl,
      "/work?ref=twitter&utm_source=social_ad&sort=recent",
      "/work",
      "Work Listing with Query Params",
    );
    await verifyRoute(
      baseUrl,
      `/work/${workSlug}?utm_medium=email&tracking_id=123`,
      `/work/${workSlug}`,
      "Dynamic Work with Query Params",
    );
    await verifyRoute(
      baseUrl,
      `/writing/${articleSlug}?ref=hackernews#comments`,
      `/writing/${articleSlug}`,
      "Dynamic Writing with Query and Hash",
    );

    // Verify 404 failure closure on non-existent dynamic slug
    const notFoundRes = await fetch(`${baseUrl}/work/non-existent-random-slug-9999`);
    assert.strictEqual(notFoundRes.status, 404, "Invalid slug must return 404");

    console.log("\n>>> ALL RUNTIME CANONICAL AND ALTERNATES VERIFICATIONS PASSED! <<<");
  } finally {
    if (serverProc) {
      serverProc.kill("SIGKILL");
    }

    console.log("\nCleaning up temporary test database records...");
    await sql`DELETE FROM page_versions WHERE version_number = 9999`;
    await sql`DELETE FROM project_versions WHERE title = 'Canonical System V1'`;
    await sql`DELETE FROM projects WHERE slug = ${workSlug}`;
    await sql`DELETE FROM research_versions WHERE title = 'Canonical Research Paper'`;
    await sql`DELETE FROM research WHERE slug = ${researchSlug}`;
    await sql`DELETE FROM article_versions WHERE title = 'Canonical Article'`;
    await sql`DELETE FROM articles WHERE slug = ${articleSlug}`;
    await sql`DELETE FROM media WHERE id = ${mediaId}`;
    console.log("Cleanup complete.");
  }
}

main().catch((err) => {
  console.error("Runtime verification failed:", err);
  process.exit(1);
});
