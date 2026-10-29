import { test, expect } from "@playwright/test";
import { build } from "esbuild";
import { resolve } from "node:path";

test.beforeEach(async ({ page }) => {
  const bundle = await build({
    entryPoints: [resolve("e2e/fixtures/page-editor.tsx")],
    bundle: true,
    write: false,
    platform: "browser",
    define: { "process.env.NODE_ENV": '"production"' },
  });
  await page.setContent('<div id="root"></div>');
  await page.addScriptTag({ content: bundle.outputFiles![0]!.text });
});

test("page text fields count characters and grow with their content", async ({
  page,
}) => {
  const field = page.getByLabel("Areas of interest");
  await expect(field).toHaveAccessibleDescription(/Start lines with/);
  await expect(page.getByText("6 / 50")).toBeVisible();

  const before = (await field.boundingBox())!.height;
  await field.fill("- Agents\n- Infra\n- Data\n- Interfaces\n- Systems");
  await field.dispatchEvent("input");
  await expect(page.getByText("46 / 50")).toBeVisible();
  const after = (await field.boundingBox())!.height;
  expect(after).toBeGreaterThan(before);

  // The schema's limit is enforced in the browser too.
  await field.fill("x".repeat(80));
  await expect(field).toHaveValue("x".repeat(50));
});
