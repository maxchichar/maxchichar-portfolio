/**
 * Phase 10 Level 10.4: Live Production Verifier
 *
 * Verifies non-destructive public invariants against the live Vercel production deployment:
 * https://chibuezemaxwell.vercel.app
 *
 * Checks:
 * 1. Live route status codes & redirects
 * 2. Canonical URLs and og:url consistency
 * 3. Query string stripping on canonical URLs
 * 4. Robots.txt structure & sitemap directive
 * 5. Sitemap.xml content & canonical origin
 * 6. OG asset accessibility & MIME type
 * 7. Security headers full matrix across routes
 * 8. Suppression of X-Powered-By
 * 9. Server-side admin authorization protection
 * 10. Safe 404 handling without sensitive disclosure
 */

const TARGET_URL = (
  process.env.TARGET_URL || "https://chibuezemaxwell.vercel.app"
).replace(/\/+$/, "");

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
    throw new Error(`Production verification failed: ${name}`);
  }
}

async function fetchRoute(path: string, options: RequestInit = {}) {
  const url = `${TARGET_URL}${path}`;
  const res = await fetch(url, { redirect: "manual", ...options });
  const text = await res.text();
  return {
    url,
    status: res.status,
    statusText: res.statusText,
    headers: res.headers,
    text,
  };
}

async function main() {
  console.log("==================================================");
  console.log(`=== PHASE 10.4: LIVE PRODUCTION VERIFIER        ===`);
  console.log(`=== Target: ${TARGET_URL}`);
  console.log("==================================================");

  // 1. Core Public Routes
  logSection("1. Core Public Routes Smoke Check");
  const publicRoutes = [
    { path: "/", expectedStatus: 200 },
    { path: "/work", expectedStatus: 200 },
    { path: "/research", expectedStatus: 200 },
    { path: "/writing", expectedStatus: 200 },
    { path: "/about", expectedStatus: 200 },
    { path: "/now", expectedStatus: 200 },
    { path: "/contact", expectedStatus: 200 },
  ];

  for (const r of publicRoutes) {
    const res = await fetchRoute(r.path);
    check(
      `Route ${r.path} returns ${r.expectedStatus}`,
      res.status === r.expectedStatus,
      `got ${res.status}`,
    );
  }

  // 2. Published Dynamic Route
  logSection("2. Published Dynamic Route");
  const workRes = await fetchRoute("/work/phase4-test-1789545410714");
  check(
    "Published project route returns 200",
    workRes.status === 200,
    `got ${workRes.status}`,
  );
  check(
    "Published project HTML renders title",
    workRes.text.includes("Published Phase 4 Project"),
    "Title not found in rendered HTML",
  );

  // 2b. Genuine Production Content (/about and /now)
  logSection("2b. Genuine Production Content (/about and /now)");
  const aboutRes = await fetchRoute("/about");
  check("About page returns 200", aboutRes.status === 200, `got ${aboutRes.status}`);
  check(
    "About page renders Chibueze Maxwell identity",
    aboutRes.text.includes("Chibueze Maxwell"),
  );
  check(
    "About page renders Super Intelligence positioning",
    aboutRes.text.includes("Super Intelligence") ||
      aboutRes.text.includes("Super Intelligence (SI)"),
  );
  check(
    "About page contains no instructional placeholder text",
    !aboutRes.text.includes("Add a short introduction") &&
      !aboutRes.text.includes("Add a longer biography"),
  );
  check(
    "About page does not contain obsolete AI-Native personal title",
    !aboutRes.text.includes("AI-Native Engineer & Entrepreneur"),
  );

  const nowRes = await fetchRoute("/now");
  check("Now page returns 200", nowRes.status === 200, `got ${nowRes.status}`);
  check(
    "Now page renders genuine platform focus",
    nowRes.text.includes("MAXCHICHAR") || nowRes.text.includes("Super Intelligence"),
  );
  check(
    "Now page contains no instructional placeholder text",
    !nowRes.text.includes("Add what you're currently building") &&
      !nowRes.text.includes("Add your current thesis"),
  );

  // 3. Admin Authentication & Protection
  logSection("3. Admin Authentication & Protection Boundary");
  const loginRes = await fetchRoute("/admin/login");
  check(
    "Admin login page returns 200",
    loginRes.status === 200,
    `got ${loginRes.status}`,
  );
  check(
    "Admin login page renders sign-in form",
    loginRes.text.includes("Sign in") && loginRes.text.includes('type="password"'),
  );

  const adminProtectRoutes = [
    "/admin",
    "/admin/projects",
    "/admin/research",
    "/admin/articles",
    "/admin/pages",
    "/admin/media",
    "/admin/settings",
  ];

  for (const p of adminProtectRoutes) {
    const res = await fetchRoute(p);
    check(
      `Protected route ${p} redirects to /admin/login`,
      res.status === 307 || res.status === 302,
      `got ${res.status}`,
    );
    const loc = res.headers.get("location") || "";
    check(
      `Redirect target for ${p} points to /admin/login`,
      loc.includes("/admin/login"),
      `location was: ${loc}`,
    );
  }

  // 4. Auth.js API Health
  logSection("4. Auth.js API Health");
  const authProvidersRes = await fetchRoute("/api/auth/providers");
  check(
    "Auth providers endpoint returns 200",
    authProvidersRes.status === 200,
    `got ${authProvidersRes.status}`,
  );
  check(
    "Auth providers JSON includes credentials provider",
    authProvidersRes.text.includes('"credentials"'),
  );

  // 5. Canonical & Open Graph URL Consistency
  logSection("5. Canonical & Open Graph URL Consistency & Brand Positioning");
  const rootRes = await fetchRoute("/");
  check(
    "Homepage canonical tag matches target origin",
    rootRes.text.includes(`<link rel="canonical" href="${TARGET_URL}"/>`) ||
      rootRes.text.includes(`<link rel="canonical" href="${TARGET_URL}"`),
  );
  check(
    "Homepage og:url matches target origin",
    rootRes.text.includes(`<meta property="og:url" content="${TARGET_URL}"/>`) ||
      rootRes.text.includes(`<meta property="og:url" content="${TARGET_URL}"`),
  );
  check(
    "Homepage renders new Super Intelligence personal branding",
    rootRes.text.includes("Super Intelligence Engineer & Entrepreneur"),
    "New brand title not found on homepage",
  );
  check(
    "Homepage does not render obsolete AI-Native personal branding",
    !rootRes.text.includes("AI-Native Engineer & Entrepreneur"),
    "Obsolete AI-Native personal brand found on homepage",
  );

  // Query string attack on canonical
  const queryRes = await fetchRoute("/work?utm_source=phase10&ref=test");
  check(
    "Canonical tag on /work with query string strips parameters",
    queryRes.text.includes(`<link rel="canonical" href="${TARGET_URL}/work"`),
  );

  // 6. Robots.txt
  logSection("6. Robots.txt Configuration");
  const robotsRes = await fetchRoute("/robots.txt");
  check("robots.txt returns 200", robotsRes.status === 200);
  check(
    "robots.txt specifies text content-type",
    robotsRes.headers.get("content-type")?.includes("text") === true,
  );
  check("robots.txt allows root crawler access", robotsRes.text.includes("Allow: /"));
  check("robots.txt disallows admin paths", robotsRes.text.includes("Disallow: /admin"));
  check("robots.txt disallows api paths", robotsRes.text.includes("Disallow: /api"));
  check(
    "robots.txt points to canonical sitemap",
    robotsRes.text.includes(`Sitemap: ${TARGET_URL}/sitemap.xml`),
  );

  // 7. Dynamic Sitemap
  logSection("7. Dynamic Sitemap Audit");
  const sitemapRes = await fetchRoute("/sitemap.xml");
  check("sitemap.xml returns 200", sitemapRes.status === 200);
  check(
    "sitemap.xml specifies xml content-type",
    sitemapRes.headers.get("content-type")?.includes("xml") === true,
  );
  check(
    "sitemap.xml uses canonical target URL",
    sitemapRes.text.includes(`<loc>${TARGET_URL}</loc>`) ||
      sitemapRes.text.includes(`<loc>${TARGET_URL}/</loc>`),
  );
  check("sitemap.xml excludes admin routes", !sitemapRes.text.includes("/admin"));
  check("sitemap.xml excludes api routes", !sitemapRes.text.includes("/api"));
  check(
    "sitemap.xml includes /about route",
    sitemapRes.text.includes(`<loc>${TARGET_URL}/about</loc>`),
    "About route not found in sitemap",
  );
  check(
    "sitemap.xml includes /now route",
    sitemapRes.text.includes(`<loc>${TARGET_URL}/now</loc>`),
    "Now route not found in sitemap",
  );

  // 8. Open Graph Image Asset
  logSection("8. Open Graph Image Asset");
  const ogRes = await fetchRoute("/og-default.png");
  check("og-default.png returns 200", ogRes.status === 200);
  check(
    "og-default.png is image/png",
    ogRes.headers.get("content-type")?.includes("image/png") === true,
  );

  // 9. Security Headers Full Matrix
  logSection("9. Security Headers Matrix");
  const securityHeaderRoutes = [
    "/",
    "/work",
    "/admin/login",
    "/api/auth/providers",
    "/definitely-does-not-exist-phase10",
  ];

  const requiredHeaders = [
    "content-security-policy",
    "x-content-type-options",
    "x-frame-options",
    "referrer-policy",
    "permissions-policy",
    "strict-transport-security",
    "cross-origin-opener-policy",
    "cross-origin-resource-policy",
  ];

  for (const r of securityHeaderRoutes) {
    const res = await fetchRoute(r);
    for (const h of requiredHeaders) {
      check(
        `Route ${r} includes ${h}`,
        Boolean(res.headers.get(h)),
        `missing header ${h}`,
      );
    }
    check(
      `Route ${r} suppresses x-powered-by`,
      res.headers.get("x-powered-by") === null,
      `leaked x-powered-by: ${res.headers.get("x-powered-by")}`,
    );
  }

  // 10. 404 & Error Handling
  logSection("10. 404 & Error Handling");
  const notFoundRes = await fetchRoute("/definitely-does-not-exist-phase10");
  check("Unknown route returns 404", notFoundRes.status === 404);
  check(
    "404 route does not leak database error strings",
    !notFoundRes.text.includes("errorMissingColumn") &&
      !notFoundRes.text.includes("ECONNREFUSED") &&
      !notFoundRes.text.includes("neonConfig"),
  );
  check(
    "404 route does not leak internal stack traces",
    !notFoundRes.text.includes("node_modules") &&
      !notFoundRes.text.includes("at Object.<anonymous>"),
  );

  logSection("PHASE 10.4 LIVE VERIFICATION SUMMARY");
  console.log(">>> ALL LIVE PRODUCTION CRITICAL INVARIANTS PASS <<<");
}

main().catch((err) => {
  console.error("\nFATAL ERROR IN LIVE PRODUCTION VERIFICATION:", err.message);
  process.exit(1);
});
