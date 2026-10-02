import assert from "node:assert";
import { spawn, type ChildProcess } from "node:child_process";
import { neon } from "@neondatabase/serverless";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const sql = neon(dbUrl);

function verifyHeaders(
  route: string,
  resHeaders: Headers,
  status: number,
  expectedStorageOrigin?: string | null,
) {
  const csp = resHeaders.get("content-security-policy");
  const contentTypeOptions = resHeaders.get("x-content-type-options");
  const frameOptions = resHeaders.get("x-frame-options");
  const referrerPolicy = resHeaders.get("referrer-policy");
  const permissionsPolicy = resHeaders.get("permissions-policy");
  const hsts = resHeaders.get("strict-transport-security");
  const poweredBy = resHeaders.get("x-powered-by");

  console.log(`\n--- Headers for [${route}] (HTTP ${status}) ---`);
  console.log(
    `Content-Security-Policy:    ${csp ? csp.slice(0, 60) + "..." : "MISSING"}`,
  );
  console.log(`X-Content-Type-Options:     ${contentTypeOptions}`);
  console.log(`X-Frame-Options:            ${frameOptions}`);
  console.log(`Referrer-Policy:            ${referrerPolicy}`);
  console.log(
    `Permissions-Policy:         ${permissionsPolicy ? permissionsPolicy.slice(0, 40) + "..." : "MISSING"}`,
  );
  console.log(`Strict-Transport-Security:  ${hsts}`);
  console.log(`X-Powered-By:               ${poweredBy ?? "(absent - correct)"}`);

  // 1. Content-Security-Policy
  assert.ok(csp, `Missing Content-Security-Policy on ${route}`);
  assert.ok(
    csp.includes("default-src 'self'"),
    `CSP missing default-src 'self' on ${route}`,
  );
  assert.ok(
    csp.includes("object-src 'none'"),
    `CSP missing object-src 'none' on ${route}`,
  );
  assert.ok(csp.includes("base-uri 'self'"), `CSP missing base-uri 'self' on ${route}`);
  assert.ok(
    csp.includes("frame-ancestors 'none'"),
    `CSP missing frame-ancestors 'none' on ${route}`,
  );
  assert.ok(
    csp.includes("form-action 'self'"),
    `CSP missing form-action 'self' on ${route}`,
  );
  assert.ok(
    !csp.includes("'unsafe-eval'"),
    `Production CSP must NOT contain 'unsafe-eval' on ${route}`,
  );
  assert.ok(!csp.includes(" * "), `CSP must not contain wildcard source on ${route}`);

  if (expectedStorageOrigin) {
    assert.ok(
      csp.includes(expectedStorageOrigin),
      `CSP should allow configured storage origin ${expectedStorageOrigin} on ${route}`,
    );
  }

  // 2. X-Content-Type-Options
  assert.strictEqual(
    contentTypeOptions,
    "nosniff",
    `Expected X-Content-Type-Options: nosniff on ${route}`,
  );

  // 3. X-Frame-Options
  assert.strictEqual(frameOptions, "DENY", `Expected X-Frame-Options: DENY on ${route}`);

  // 4. Referrer-Policy
  assert.strictEqual(
    referrerPolicy,
    "strict-origin-when-cross-origin",
    `Expected Referrer-Policy: strict-origin-when-cross-origin on ${route}`,
  );

  // 5. Permissions-Policy
  assert.ok(permissionsPolicy, `Missing Permissions-Policy on ${route}`);
  assert.ok(permissionsPolicy.includes("camera=()"));
  assert.ok(permissionsPolicy.includes("microphone=()"));
  assert.ok(permissionsPolicy.includes("geolocation=()"));

  // 6. Strict-Transport-Security
  assert.ok(hsts, `Missing Strict-Transport-Security on production route ${route}`);
  assert.strictEqual(
    hsts,
    "max-age=31536000; includeSubDomains",
    `Unexpected HSTS value on ${route}`,
  );

  // 7. Information disclosure: X-Powered-By
  assert.strictEqual(
    poweredBy,
    null,
    `X-Powered-By must be completely absent on ${route}, found: "${poweredBy}"`,
  );
}

function verifyHtmlRegressions(route: string, html: string, isDetailRoute = false) {
  // Navigation & structure
  if (!route.includes("/api/")) {
    assert.ok(
      html.includes("<html") && html.includes("<body"),
      `Page ${route} must have valid HTML structure`,
    );

    // CSS styling links exist
    const hasCss = /<link[^>]*rel="stylesheet"/i.test(html) || /<style/i.test(html);
    assert.ok(hasCss, `Page ${route} must have stylesheet links or styles`);

    // Title exists
    assert.ok(/<title>/i.test(html), `Page ${route} must have a <title> tag`);

    // Canonical link exists
    assert.ok(
      /<link[^>]*rel="canonical"/i.test(html),
      `Page ${route} must have a canonical link`,
    );

    // Open Graph exists
    assert.ok(
      /<meta[^>]*property="og:title"/i.test(html),
      `Page ${route} must have og:title`,
    );
  }

  // JSON-LD structured data on detail routes and homepage
  if (route === "/" || isDetailRoute) {
    const jsonLdMatch =
      /<script\s+[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i.exec(html);
    assert.ok(
      jsonLdMatch && typeof jsonLdMatch[1] === "string",
      `Expected JSON-LD script on ${route}`,
    );
    const rawJson = jsonLdMatch[1];
    assert.doesNotThrow(() => {
      JSON.parse(rawJson);
    }, `JSON-LD on ${route} must be parseable JSON`);
  }
}

async function main() {
  const port = "3004";
  const baseUrl = `http://localhost:${port}`;
  const uniqueId = Date.now();
  const workSlug = `sec-work-${uniqueId}`;
  const researchSlug = `sec-res-${uniqueId}`;
  const articleSlug = `sec-art-${uniqueId}`;

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
      VALUES (${project.id}, 1, 'PUBLISHED', 'Security Headers Project', 'A case study for security testing.', ${mediaId}, ${adminId})
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
      VALUES (${research.id}, 1, 'PUBLISHED', 'Security Research Paper', 'Investigation', 'Abstract on HTTP security headers.', ${adminId})
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
      VALUES (${article.id}, 1, 'PUBLISHED', 'Security Writing', 'Article on defensive headers.', '{"type":"doc","content":[]}'::jsonb, ${adminId})
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
        VALUES (${aboutPage.id}, 9997, 'PUBLISHED', ${aboutContent}::jsonb, ${adminId})
      `;
    }

    const nowContent = JSON.stringify({
      slug: "now",
      currentlyBuilding: "Portfolio OS Level 9.7.",
      researching: "Security headers and CSP.",
      learning: "Defensive web architecture.",
      interests: "Systems engineering.",
      thesis: "Intelligent software.",
      recentChanges: "Configured defensive HTTP response headers.",
    });

    const [nowPage] = await sql`
      INSERT INTO pages (slug) VALUES ('now')
      ON CONFLICT (slug) DO UPDATE SET slug = 'now'
      RETURNING id
    `;
    if (nowPage) {
      await sql`
        INSERT INTO page_versions (page_id, version_number, status, content, created_by_id)
        VALUES (${nowPage.id}, 9997, 'PUBLISHED', ${nowContent}::jsonb, ${adminId})
      `;
    }

    const storageOrigin = (() => {
      const ep = process.env.STORAGE_ENDPOINT;
      if (!ep) return null;
      try {
        return new URL(ep.startsWith("http") ? ep : `https://${ep}`).origin;
      } catch {
        return null;
      }
    })();

    console.log(`Starting Next.js production server on port ${port}...`);
    serverProc = spawn(
      "node",
      ["./node_modules/next/dist/bin/next", "start", "-p", port],
      {
        env: { ...process.env, NODE_ENV: "production", PORT: port },
        stdio: "pipe",
      },
    );

    // Wait for server to become responsive
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
    console.log("Server is ready. Executing runtime security header verifications...\n");

    const routesToTest = [
      { path: "/", label: "Homepage /", isDetail: false },
      { path: "/work", label: "Work Listing", isDetail: false },
      { path: "/research", label: "Research Listing", isDetail: false },
      { path: "/writing", label: "Writing Listing", isDetail: false },
      { path: "/about", label: "About Page", isDetail: false },
      { path: "/now", label: "Now Page", isDetail: false },
      { path: "/contact", label: "Contact Page", isDetail: false },
      { path: "/admin/login", label: "Admin Login", isDetail: false },
      { path: `/work/${workSlug}`, label: "Dynamic Work Detail", isDetail: true },
      {
        path: `/research/${researchSlug}`,
        label: "Dynamic Research Detail",
        isDetail: true,
      },
      {
        path: `/writing/${articleSlug}`,
        label: "Dynamic Writing Detail",
        isDetail: true,
      },
      { path: "/api/auth/providers", label: "Auth API Providers", isDetail: false },
    ];

    for (const { path, label, isDetail } of routesToTest) {
      const url = `${baseUrl}${path}`;
      const res = await fetch(url);
      assert.strictEqual(
        res.status,
        200,
        `Expected 200 OK for ${label} at ${url}, got ${res.status}`,
      );
      verifyHeaders(label, res.headers, res.status, storageOrigin);

      const html = await res.text();
      verifyHtmlRegressions(path, html, isDetail);
    }

    // Test 404 route for security headers
    console.log("\nTesting 404 route for security headers...");
    const notFoundRes = await fetch(`${baseUrl}/non-existent-random-route-404`);
    assert.strictEqual(notFoundRes.status, 404, "Invalid route must return 404");
    verifyHeaders("404 Route", notFoundRes.headers, notFoundRes.status, storageOrigin);

    console.log("\n>>> ALL RUNTIME DEFENSIVE SECURITY HEADER CHECKS PASSED! <<<");
  } finally {
    if (serverProc) {
      serverProc.kill("SIGKILL");
    }

    console.log("\nCleaning up temporary test database records...");
    await sql`DELETE FROM page_versions WHERE version_number = 9997`;
    await sql`DELETE FROM project_versions WHERE title = 'Security Headers Project'`;
    await sql`DELETE FROM projects WHERE slug = ${workSlug}`;
    await sql`DELETE FROM research_versions WHERE title = 'Security Research Paper'`;
    await sql`DELETE FROM research WHERE slug = ${researchSlug}`;
    await sql`DELETE FROM article_versions WHERE title = 'Security Writing'`;
    await sql`DELETE FROM articles WHERE slug = ${articleSlug}`;
    await sql`DELETE FROM media WHERE id = ${mediaId}`;
    console.log("Cleanup complete.");
  }
}

main().catch((err) => {
  console.error("Runtime verification failed:", err);
  process.exit(1);
});
