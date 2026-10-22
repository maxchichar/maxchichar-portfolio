import { test, expect } from "@playwright/test";
import { build } from "esbuild";
import { resolve } from "node:path";

// No credentials/database required: real editor components, simulated evidence
// responses and parent refreshes. Server action contracts are tested separately.
test("evidence preserves all draft sections on add, invalid add, removal and save", async ({
  page,
}) => {
  const bundle = await build({
    entryPoints: [resolve("e2e/fixtures/evidence-editor.tsx")],
    bundle: true,
    write: false,
    platform: "browser",
    define: { "process.env.NODE_ENV": '"production"' },
  });
  await page.setContent('<div id="root"></div>');
  await page.addScriptTag({ content: bundle.outputFiles![0]!.text });
  await page.getByRole("textbox", { name: "Title", exact: true }).fill("Unsaved title");
  for (const section of ["Background", "Findings"]) {
    await page
      .locator(`[contenteditable][aria-label="${section}"]`)
      .fill(`Unsaved ${section}`);
  }
  await page.getByRole("textbox", { name: "Evidence URL" }).fill("https://example.com");
  await page.getByRole("button", { name: "Add evidence" }).click();
  await expect(page.getByLabel("Evidence count")).toHaveText("1");
  await page.getByRole("textbox", { name: "Evidence URL" }).fill("invalid");
  await page.getByRole("button", { name: "Add evidence" }).click();
  await expect(page.getByRole("alert")).toHaveText("Invalid URL");
  await expect(page.getByRole("textbox", { name: "Evidence URL" })).toHaveValue(
    "invalid",
  );
  await page.getByRole("button", { name: "Remove evidence" }).click();
  await expect(page.getByLabel("Evidence count")).toHaveText("0");
  await expect(page.getByRole("textbox", { name: "Title", exact: true })).toHaveValue(
    "Unsaved title",
  );
  for (const section of ["Background", "Findings"]) {
    await expect(page.locator(`[contenteditable][aria-label="${section}"]`)).toHaveText(
      `Unsaved ${section}`,
    );
  }
  await page.getByRole("button", { name: "Save draft" }).click();
  const saved = JSON.parse(await page.getByLabel("Saved draft").innerText());
  expect(saved.title).toBe("Unsaved title");
  for (const section of ["Background", "Findings"]) {
    expect(JSON.parse(saved[section]).content[0].content[0].text).toBe(
      `Unsaved ${section}`,
    );
  }
});
