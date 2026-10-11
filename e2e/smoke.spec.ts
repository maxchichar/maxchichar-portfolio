import { expect, test, type Page } from "@playwright/test";

/**
 * Smoke tests: every key public page loads, renders its heading and throws
 * no errors in the browser; the machine-readable endpoints respond; the
 * main interactions work. Read-only (never submits forms), so they're safe
 * to run against production.
 */

const PAGES = ["/", "/work", "/research", "/writing", "/now", "/about", "/contact"];

// Noise that isn't the site's fault (Vercel's preview toolbar, browser
// extensions in the runner image).
const IGNORED = [/vercel\.live/i, /vercel-live/i, /chrome-extension:/i];

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = `${msg.text()} ${msg.location().url ?? ""}`;
    if (!IGNORED.some((re) => re.test(text))) errors.push(`console: ${text}`);
  });
  return errors;
}

for (const path of PAGES) {
  test(`${path} loads without errors`, async ({ page }) => {
    const errors = collectErrors(page);
    const response = await page.goto(path, { waitUntil: "load" });
    expect(response?.status(), `HTTP status for ${path}`).toBeLessThan(400);
    await expect(page.locator("h1").first()).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Let.s talk|Contact/i }).first(),
    ).toBeAttached();
    // Give hydration and late scripts a moment to report problems.
    await page.waitForTimeout(1500);
    expect(errors, `browser errors on ${path}`).toEqual([]);
  });
}

for (const [list, prefix] of [
  ["/work", "/work/"],
  ["/writing", "/writing/"],
] as const) {
  test(`opens the first item from ${list}`, async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto(list);
    const first = page.locator(`main a[href^="${prefix}"]`).first();
    test.skip((await first.count()) === 0, `nothing published under ${list} yet`);
    const href = await first.getAttribute("href");
    const response = await page.goto(href!);
    expect(response?.status()).toBeLessThan(400);
    await expect(page.locator("h1").first()).toBeVisible();
    await page.waitForTimeout(1000);
    expect(errors).toEqual([]);
  });
}

test("unknown pages return a real 404", async ({ page }) => {
  const response = await page.goto("/this-page-does-not-exist-smoke");
  expect(response?.status()).toBe(404);
  await expect(page.locator("h1").first()).toBeVisible();
});

test("feed, search index, sitemap, robots and share image respond", async ({
  request,
}) => {
  const feed = await request.get("/feed.xml");
  expect(feed.ok()).toBeTruthy();
  expect(feed.headers()["content-type"]).toContain("application/rss+xml");
  expect(await feed.text()).toContain("<rss");

  const search = await request.get("/api/search");
  expect(search.ok()).toBeTruthy();
  expect(Array.isArray((await search.json()).items)).toBeTruthy();

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBeTruthy();
  expect(await sitemap.text()).toContain("<urlset");

  const robots = await request.get("/robots.txt");
  expect(await robots.text()).toContain("Sitemap:");

  const og = await request.get("/opengraph-image");
  expect(og.ok()).toBeTruthy();
  expect(og.headers()["content-type"]).toContain("image/png");
});

test("⌘K search opens, finds pages and closes", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "keyboard shortcut is a desktop feature");
  await page.goto("/");
  await page.waitForTimeout(1000);
  await page.keyboard.press("Control+k");
  const dialog = page.getByRole("dialog", { name: "Search the site" });
  await expect(dialog).toBeVisible();
  await page.keyboard.type("contact");
  await expect(dialog.getByRole("option", { name: /Contact/ }).first()).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("mobile menu opens and navigates", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "mobile-only");
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  await page
    .getByRole("navigation", { name: "Mobile" })
    .getByRole("link", { name: /About/ })
    .click();
  await expect(page).toHaveURL(/\/about$/);
});
