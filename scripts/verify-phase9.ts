import assert from "node:assert";
import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import { neon } from "@neondatabase/serverless";
import { imageSize } from "image-size";

import nextConfig from "../next.config";
import {
  constructBaseMetadata,
  constructPageMetadata,
  DEFAULT_SITE_DESCRIPTION,
  DEFAULT_SITE_TITLE,
  normalizeCanonicalPath,
  resolveCanonicalUrl,
} from "../src/lib/metadata";
import { buildCspHeader, buildSecurityHeaders } from "../src/lib/security-headers";
import {
  buildJsonLdGraph,
  buildPersonJsonLd,
  buildWebSiteJsonLd,
  serializeJsonLd,
} from "../src/lib/structured-data";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const sql = neon(dbUrl);

function logSection(title: string) {
  console.log(`\n==================================================`);
  console.log(`=== ${title}`);
  console.log(`==================================================`);
}

function extractJsonLd(
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
      throw new Error(`Invalid JSON in <script type="application/ld+json">: ${err}`);
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

async function runStaticAudits() {
  logSection("AUDIT 1: Base Metadata Foundation (9.1)");
  const savedSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const savedServerUrl = process.env.SITE_URL;
  const savedVercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const savedVercelUrl = process.env.VERCEL_URL;
  delete process.env.NEXT_PUBLIC_SITE_URL;
  delete process.env.SITE_URL;
  delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
  delete process.env.VERCEL_URL;

  try {
    const base = constructBaseMetadata();
    assert.ok(base.metadataBase instanceof URL);
    assert.strictEqual(base.metadataBase.origin, "http://localhost:3000");
    assert.strictEqual(base.description, DEFAULT_SITE_DESCRIPTION);
    const alternates = base.alternates as Record<string, unknown>;
    const og = base.openGraph as Record<string, unknown>;
    const twitter = base.twitter as Record<string, unknown>;
    assert.strictEqual(alternates?.canonical, "/");
    assert.strictEqual(og?.url, "/");
    assert.strictEqual(og?.type, "website");
    assert.strictEqual(twitter?.card, "summary_large_image");
    console.log("PASS: Base metadata defaults and types verified");

    logSection("AUDIT 2: Title Template Formatting (9.1)");
    // Verify child pages pass only raw titles so template %s — CHIBUEZE MAXWELL doesn't duplicate
    const pageMeta = constructPageMetadata({ title: "Work", path: "/work" });
    assert.strictEqual(pageMeta.title, "Work");
    console.log("PASS: Page metadata passes clean title for template interpolation");

    logSection("AUDIT 3: Canonical Path Normalization & Attack Vectors (9.5)");
    assert.strictEqual(normalizeCanonicalPath("/"), "/");
    assert.strictEqual(normalizeCanonicalPath("/work/"), "/work");
    assert.strictEqual(
      normalizeCanonicalPath("//work///my-project//"),
      "/work/my-project",
    );
    assert.strictEqual(
      normalizeCanonicalPath("/work?utm_source=twitter&ref=hn"),
      "/work",
    );
    assert.strictEqual(
      normalizeCanonicalPath("/writing/agent-dynamics#section"),
      "/writing/agent-dynamics",
    );
    assert.strictEqual(
      resolveCanonicalUrl("/work?ref=test"),
      "http://localhost:3000/work",
    );
    console.log(
      "PASS: Canonical normalization strips query parameters, hashes, and double slashes",
    );
  } finally {
    if (savedSiteUrl !== undefined) process.env.NEXT_PUBLIC_SITE_URL = savedSiteUrl;
    if (savedServerUrl !== undefined) process.env.SITE_URL = savedServerUrl;
    if (savedVercelProd !== undefined)
      process.env.VERCEL_PROJECT_PRODUCTION_URL = savedVercelProd;
    if (savedVercelUrl !== undefined) process.env.VERCEL_URL = savedVercelUrl;
  }

  logSection("AUDIT 4: Default OG Image File & Dimensions (9.4)");
  assert.ok(fs.existsSync("public/og-default.png"), "public/og-default.png must exist");
  const imgBuf = fs.readFileSync("public/og-default.png");
  assert.ok(imgBuf.length > 10000, "Image must have non-trivial size");
  const dims = imageSize(imgBuf);
  assert.ok(dims.width && dims.height);
  const ratio = dims.width / dims.height;
  console.log(
    `Dimensions: ${dims.width}x${dims.height}, ratio: ${ratio.toFixed(3)}, size: ${imgBuf.length} bytes`,
  );
  assert.ok(
    ratio >= 1.8 && ratio <= 2.0,
    "OG image aspect ratio must be close to standard 1.91:1",
  );
  console.log("PASS: Default OG image verified");

  logSection("AUDIT 5: JSON-LD Structured Data & Injection Defense (9.6)");
  // Injection attack check
  const hostile = {
    title: "</script><script>alert('xss')</script>",
    description: "Malicious <tag> testing.",
  };
  const serialized = serializeJsonLd(hostile);
  assert.ok(
    !serialized.includes("</script>"),
    "Serialized JSON-LD must never contain raw </script>",
  );
  assert.ok(serialized.includes("\\u003c/script>"), "Must escape '<' as \\u003c");

  // Schema verification
  const siteLd = buildWebSiteJsonLd();
  assert.strictEqual(siteLd["@type"], "WebSite");
  const personLd = buildPersonJsonLd({ name: DEFAULT_SITE_TITLE });
  assert.ok(personLd);
  assert.strictEqual(personLd["@type"], "Person");
  assert.strictEqual(personLd.name, DEFAULT_SITE_TITLE);
  assert.strictEqual(personLd.jobTitle, "Super Intelligence Engineer & Entrepreneur");

  const graph = buildJsonLdGraph([siteLd, personLd]);
  assert.strictEqual(graph["@context"], "https://schema.org");
  assert.ok(Array.isArray(graph["@graph"]));
  console.log("PASS: JSON-LD schemas and injection defense verified");

  logSection("AUDIT 6: Security Headers Configuration (9.7)");
  assert.strictEqual(nextConfig.poweredByHeader, false, "poweredByHeader must be false");
  const prodCsp = buildCspHeader({ isDev: false });
  assert.ok(prodCsp.includes("default-src 'self'"));
  assert.ok(prodCsp.includes("object-src 'none'"));
  assert.ok(prodCsp.includes("base-uri 'self'"));
  assert.ok(prodCsp.includes("frame-ancestors 'none'"));
  assert.ok(prodCsp.includes("form-action 'self'"));
  assert.ok(
    !prodCsp.includes("'unsafe-eval'"),
    "Production CSP must not contain 'unsafe-eval'",
  );
  assert.ok(!prodCsp.includes(" * "), "Production CSP must not contain wildcard");

  const headers = buildSecurityHeaders({ isDev: false });
  assert.ok(
    headers.some((h) => h.key === "X-Content-Type-Options" && h.value === "nosniff"),
  );
  assert.ok(headers.some((h) => h.key === "X-Frame-Options" && h.value === "DENY"));
  assert.ok(
    headers.some(
      (h) => h.key === "Referrer-Policy" && h.value === "strict-origin-when-cross-origin",
    ),
  );
  assert.ok(
    headers.some(
      (h) =>
        h.key === "Strict-Transport-Security" && h.value.includes("max-age=31536000"),
    ),
  );
  console.log("PASS: Static security header definitions verified");
}

async function runRuntimeAudits() {
  logSection("AUDIT 7: Full Production Server Runtime Matrix");
  const port = "3005";
  const baseUrl = `http://localhost:${port}`;
  const uniqueId = Date.now();
  const workSlug = `p9-work-${uniqueId}`;
  const researchSlug = `p9-res-${uniqueId}`;
  const articleSlug = `p9-art-${uniqueId}`;

  // Find admin user
  const [adminUser] = await sql`SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1`;
  const adminId = adminUser ? (adminUser.id as string) : null;

  // Insert test cover media
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
    // 1. Published Project WITH cover media
    const [project] = await sql`
      INSERT INTO projects (slug, status, created_by)
      VALUES (${workSlug}, 'ACTIVE', ${adminId})
      RETURNING id
    `;
    if (!project) throw new Error("Failed to insert test project");
    await sql`
      INSERT INTO project_versions (project_id, version_number, status, title, short_description, cover_media_id, created_by_id)
      VALUES (${project.id}, 1, 'PUBLISHED', 'Phase 9 Project', 'Phase 9 case study with cover.', ${mediaId}, ${adminId})
    `;

    // 2. Published Research WITH cover media
    const [research] = await sql`
      INSERT INTO research (slug, status, created_by)
      VALUES (${researchSlug}, 'ACTIVE', ${adminId})
      RETURNING id
    `;
    if (!research) throw new Error("Failed to insert test research");
    await sql`
      INSERT INTO research_versions (research_id, version_number, status, title, type, abstract, cover_media_id, created_by_id)
      VALUES (${research.id}, 1, 'PUBLISHED', 'Phase 9 Research Paper', 'Investigation', 'Phase 9 research abstract.', ${mediaId}, ${adminId})
    `;

    // 3. Published Article WITHOUT cover media (tests fallback to default OG image)
    const [article] = await sql`
      INSERT INTO articles (slug, status, created_by)
      VALUES (${articleSlug}, 'ACTIVE', ${adminId})
      RETURNING id
    `;
    if (!article) throw new Error("Failed to insert test article");
    await sql`
      INSERT INTO article_versions (article_id, version_number, status, title, excerpt, content, cover_media_id, created_by_id)
      VALUES (${article.id}, 1, 'PUBLISHED', 'Phase 9 Article No Cover', 'Phase 9 excerpt testing default OG image fallback.', '{"type":"doc","content":[]}'::jsonb, NULL, ${adminId})
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
      const existingAboutPub = await sql`
        SELECT id FROM page_versions WHERE page_id = ${aboutPage.id} AND status = 'PUBLISHED' LIMIT 1
      `;
      if (!existingAboutPub || existingAboutPub.length === 0) {
        await sql`
          INSERT INTO page_versions (page_id, version_number, status, content, created_by_id)
          VALUES (${aboutPage.id}, 9996, 'PUBLISHED', ${aboutContent}::jsonb, ${adminId})
        `;
      }
    }

    const nowContent = JSON.stringify({
      slug: "now",
      currentlyBuilding: "Portfolio OS Level 9.8.",
      researching: "Full phase verification.",
      learning: "Adversarial auditing.",
      interests: "Systems engineering.",
      thesis: "Intelligent software.",
      recentChanges: "Phase 9 final gate verification.",
    });

    const [nowPage] = await sql`
      INSERT INTO pages (slug) VALUES ('now')
      ON CONFLICT (slug) DO UPDATE SET slug = 'now'
      RETURNING id
    `;
    if (nowPage) {
      const existingNowPub = await sql`
        SELECT id FROM page_versions WHERE page_id = ${nowPage.id} AND status = 'PUBLISHED' LIMIT 1
      `;
      if (!existingNowPub || existingNowPub.length === 0) {
        await sql`
          INSERT INTO page_versions (page_id, version_number, status, content, created_by_id)
          VALUES (${nowPage.id}, 9996, 'PUBLISHED', ${nowContent}::jsonb, ${adminId})
        `;
      }
    }

    console.log(`Starting Next.js production server on port ${port}...`);
    const serverEnv: NodeJS.ProcessEnv = {
      ...process.env,
      NODE_ENV: "production",
      PORT: port,
    };
    delete serverEnv.NEXT_PUBLIC_SITE_URL;
    delete serverEnv.SITE_URL;
    delete serverEnv.VERCEL_PROJECT_PRODUCTION_URL;
    delete serverEnv.VERCEL_URL;

    serverProc = spawn(
      "node",
      ["./node_modules/next/dist/bin/next", "start", "-p", port],
      {
        env: serverEnv,
        stdio: "pipe",
      },
    );

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
    assert.ok(ready, "Server failed to become ready in time");
    console.log("Server ready. Testing routes...");

    // 1. Static routes check
    const staticRoutes = [
      { path: "/", expectedTitle: "CHIBUEZE MAXWELL", hasJsonLd: true },
      {
        path: "/work",
        expectedTitle: "Selected Work — CHIBUEZE MAXWELL",
        hasJsonLd: false,
      },
      {
        path: "/research",
        expectedTitle: "Research — CHIBUEZE MAXWELL",
        hasJsonLd: false,
      },
      { path: "/writing", expectedTitle: "Writing — CHIBUEZE MAXWELL", hasJsonLd: false },
      { path: "/about", expectedTitle: "About — CHIBUEZE MAXWELL", hasJsonLd: false },
      { path: "/now", expectedTitle: "Now — CHIBUEZE MAXWELL", hasJsonLd: false },
      { path: "/contact", expectedTitle: "Contact — CHIBUEZE MAXWELL", hasJsonLd: false },
      { path: "/admin/login", expectedTitle: "CHIBUEZE MAXWELL", hasJsonLd: false },
    ];

    let canonicalOrigin = baseUrl;

    for (const r of staticRoutes) {
      const res = await fetch(`${baseUrl}${r.path}`);
      assert.strictEqual(res.status, 200, `Expected 200 for ${r.path}`);
      const html = await res.text();

      // Verify title formatting
      assert.ok(
        html.includes(`<title>${r.expectedTitle}</title>`),
        `Title mismatch on ${r.path}`,
      );

      // Verify security headers
      assert.strictEqual(res.headers.get("x-content-type-options"), "nosniff");
      assert.strictEqual(res.headers.get("x-frame-options"), "DENY");
      assert.strictEqual(
        res.headers.get("referrer-policy"),
        "strict-origin-when-cross-origin",
      );
      assert.strictEqual(
        res.headers.get("strict-transport-security"),
        "max-age=31536000; includeSubDomains",
      );
      assert.strictEqual(res.headers.get("x-powered-by"), null);
      assert.ok(
        res.headers.get("content-security-policy")?.includes("default-src 'self'"),
      );

      // Verify canonical == og:url
      const canonicalMatch = /<link[^>]*rel="canonical"[^>]*href="([^"]+)"/i.exec(html);
      const ogUrlMatch = /<meta[^>]*property="og:url"[^>]*content="([^"]+)"/i.exec(html);
      assert.ok(
        canonicalMatch && canonicalMatch[1],
        `Missing canonical link on ${r.path}`,
      );
      assert.ok(ogUrlMatch && ogUrlMatch[1], `Missing og:url on ${r.path}`);
      assert.strictEqual(
        canonicalMatch[1],
        ogUrlMatch[1],
        `Canonical must match og:url on ${r.path}`,
      );

      if (r.path === "/") {
        try {
          canonicalOrigin = new URL(canonicalMatch[1]).origin;
        } catch {
          canonicalOrigin = baseUrl;
        }
      }

      // Verify JSON-LD
      const jsonLd = extractJsonLd(html);
      if (r.hasJsonLd) {
        assert.strictEqual(jsonLd.length, 1);
        verifyNoPrivateFields(jsonLd[0]?.data, r.path);
      } else {
        assert.strictEqual(
          jsonLd.length,
          0,
          `Expected no JSON-LD on static overview ${r.path}`,
        );
      }
    }
    console.log(
      "PASS: All 8 static routes verified for metadata, canonicals, security headers, and JSON-LD",
    );

    // 2. Query parameter canonical attack on static route
    const dirtyUrl = `${baseUrl}/work?utm_source=twitter&ref=ad&tracking=123`;
    const dirtyRes = await fetch(dirtyUrl);
    const dirtyHtml = await dirtyRes.text();
    const dirtyCanonical = /<link[^>]*rel="canonical"[^>]*href="([^"]+)"/i.exec(
      dirtyHtml,
    )?.[1];
    const dirtyOg = /<meta[^>]*property="og:url"[^>]*content="([^"]+)"/i.exec(
      dirtyHtml,
    )?.[1];
    assert.strictEqual(
      dirtyCanonical,
      `${canonicalOrigin}/work`,
      "Canonical must strip query parameters",
    );
    assert.strictEqual(
      dirtyOg,
      `${canonicalOrigin}/work`,
      "og:url must strip query parameters",
    );
    console.log("PASS: Canonical attack on query parameters resisted");

    // 3. Dynamic routes check
    const dynamicRoutes = [
      {
        path: `/work/${workSlug}`,
        expectedType: "CreativeWork",
        hasCover: true,
      },
      {
        path: `/research/${researchSlug}`,
        expectedType: "ScholarlyArticle",
        hasCover: true,
      },
      {
        path: `/writing/${articleSlug}`,
        expectedType: "Article",
        hasCover: false, // tests fallback
      },
    ];

    for (const d of dynamicRoutes) {
      const res = await fetch(`${baseUrl}${d.path}`);
      assert.strictEqual(res.status, 200, `Expected 200 for dynamic route ${d.path}`);
      const html = await res.text();

      // Canonical and og:url match
      const canonical = /<link[^>]*rel="canonical"[^>]*href="([^"]+)"/i.exec(html)?.[1];
      const ogUrl = /<meta[^>]*property="og:url"[^>]*content="([^"]+)"/i.exec(html)?.[1];
      const expectedUrl = `${canonicalOrigin}${d.path}`;
      assert.strictEqual(canonical, expectedUrl);
      assert.strictEqual(ogUrl, expectedUrl);

      // OG image check
      const ogImage = /<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i.exec(
        html,
      )?.[1];
      assert.ok(ogImage);
      if (d.hasCover) {
        assert.ok(
          ogImage.includes("cover-") || ogImage.includes("storage.example.com"),
          "Must use cover image",
        );
      } else {
        assert.ok(
          ogImage.includes("/og-default.png"),
          "Must fallback to /og-default.png when cover is absent",
        );
      }

      // JSON-LD check
      const jsonLdBlocks = extractJsonLd(html);
      assert.strictEqual(jsonLdBlocks.length, 1);
      const [block] = jsonLdBlocks;
      assert.ok(block);
      assert.strictEqual(block.data["@context"], "https://schema.org");
      const graphItems = block.data["@graph"] as Array<Record<string, unknown>>;
      assert.ok(Array.isArray(graphItems));
      const mainEntity = graphItems.find((e) => e["@type"] === d.expectedType);
      assert.ok(mainEntity, `Missing ${d.expectedType} in JSON-LD graph on ${d.path}`);
      assert.strictEqual(mainEntity.url, expectedUrl);

      // Breadcrumbs check
      const breadcrumb = graphItems.find((e) => e["@type"] === "BreadcrumbList");
      assert.ok(breadcrumb, `Missing BreadcrumbList on ${d.path}`);
      verifyNoPrivateFields(block.data, d.path);
    }
    console.log(
      "PASS: Dynamic route matrix verified (cover media & fallback conditions)",
    );

    // 4. Publication boundary attack: invalid slug, draft, or unlisted
    const notFoundRes = await fetch(`${baseUrl}/work/non-existent-fake-slug-404`);
    assert.strictEqual(notFoundRes.status, 404, "Invalid slug must return 404");
    const notFoundHtml = await notFoundRes.text();
    const notFoundJsonLd = extractJsonLd(notFoundHtml);
    assert.strictEqual(notFoundJsonLd.length, 0, "404 page must not leak JSON-LD");
    console.log("PASS: Publication boundary attack verified: 404 and zero data leakage");

    // 5. Robots.txt audit
    const robotsRes = await fetch(`${baseUrl}/robots.txt`);
    assert.strictEqual(robotsRes.status, 200);
    const robotsTxt = await robotsRes.text();
    assert.ok(robotsTxt.includes("User-Agent: *"));
    assert.ok(robotsTxt.includes("Allow: /"));
    assert.ok(robotsTxt.includes("Disallow: /admin/"));
    assert.ok(robotsTxt.includes("Disallow: /admin/*"));
    assert.ok(robotsTxt.includes("Disallow: /api/"));
    assert.ok(robotsTxt.includes("Disallow: /api/*"));
    assert.ok(
      robotsTxt.includes(`Sitemap: ${baseUrl}/sitemap.xml`) ||
        /Sitemap:\s+https?:\/\/[^\s\/]+.*\/sitemap\.xml/i.test(robotsTxt),
      "robots.txt must contain a valid Sitemap directive pointing to /sitemap.xml",
    );
    console.log("PASS: robots.txt crawler directives and disallow rules verified");

    // 6. Dynamic Sitemap audit
    const sitemapRes = await fetch(`${baseUrl}/sitemap.xml`);
    assert.strictEqual(sitemapRes.status, 200);
    assert.strictEqual(sitemapRes.headers.get("content-type")?.includes("xml"), true);
    const sitemapXml = await sitemapRes.text();
    assert.ok(sitemapXml.includes("<urlset"));
    const sitemapBase = sitemapXml.includes(`<loc>${canonicalOrigin}`)
      ? canonicalOrigin
      : baseUrl;
    assert.ok(
      sitemapXml.includes(`<loc>${sitemapBase}</loc>`) ||
        sitemapXml.includes(`<loc>${sitemapBase}/</loc>`),
      "Sitemap must contain homepage URL",
    );
    assert.ok(sitemapXml.includes(`<loc>${sitemapBase}/work</loc>`));
    assert.ok(sitemapXml.includes(`<loc>${sitemapBase}/research</loc>`));
    assert.ok(sitemapXml.includes(`<loc>${sitemapBase}/writing</loc>`));
    assert.ok(sitemapXml.includes(`<loc>${sitemapBase}/about</loc>`));
    assert.ok(sitemapXml.includes(`<loc>${sitemapBase}/now</loc>`));
    assert.ok(sitemapXml.includes(`<loc>${sitemapBase}/contact</loc>`));
    assert.ok(sitemapXml.includes(`<loc>${sitemapBase}/work/${workSlug}</loc>`));
    assert.ok(sitemapXml.includes(`<loc>${sitemapBase}/research/${researchSlug}</loc>`));
    assert.ok(sitemapXml.includes(`<loc>${sitemapBase}/writing/${articleSlug}</loc>`));
    assert.ok(!sitemapXml.includes("/admin"), "Sitemap must never include /admin");
    assert.ok(!sitemapXml.includes("/api"), "Sitemap must never include /api");
    console.log("PASS: sitemap.xml structure and route inclusion verified");

    // 7. Default OG Image accessibility
    const ogImgRes = await fetch(`${baseUrl}/og-default.png`);
    assert.strictEqual(ogImgRes.status, 200);
    assert.ok(ogImgRes.headers.get("content-type")?.includes("image/png"));
    console.log("PASS: /og-default.png returns HTTP 200 with image/png");

    // 8. Safe API Route security headers
    const apiRes = await fetch(`${baseUrl}/api/auth/providers`);
    assert.strictEqual(apiRes.status, 200);
    assert.strictEqual(apiRes.headers.get("x-content-type-options"), "nosniff");
    assert.strictEqual(apiRes.headers.get("x-frame-options"), "DENY");
    assert.strictEqual(apiRes.headers.get("x-powered-by"), null);
    console.log("PASS: API endpoint security headers verified");
  } finally {
    if (serverProc) {
      serverProc.kill("SIGKILL");
    }

    console.log("\nCleaning up temporary Phase 9 test records...");
    await sql`DELETE FROM page_versions WHERE version_number = 9996`;
    await sql`DELETE FROM project_versions WHERE title = 'Phase 9 Project'`;
    await sql`DELETE FROM projects WHERE slug = ${workSlug}`;
    await sql`DELETE FROM research_versions WHERE title = 'Phase 9 Research Paper'`;
    await sql`DELETE FROM research WHERE slug = ${researchSlug}`;
    await sql`DELETE FROM article_versions WHERE title = 'Phase 9 Article No Cover'`;
    await sql`DELETE FROM articles WHERE slug = ${articleSlug}`;
    await sql`DELETE FROM media WHERE id = ${mediaId}`;
    console.log("Cleanup complete.");
  }
}

async function main() {
  console.log("==================================================");
  console.log("=== PHASE 9 FINAL VERIFICATION GATE (LEVEL 9.8)");
  console.log("==================================================");

  await runStaticAudits();
  await runRuntimeAudits();

  logSection("PHASE 9 VERIFICATION GATE: ALL TESTS PASSED");
  console.log(">>> PHASE 9 COMPLETE — CLEARED FOR PHASE 10 <<<");
}

main().catch((err) => {
  console.error("\nFATAL ERROR DURING PHASE 9 VERIFICATION:", err);
  process.exit(1);
});
