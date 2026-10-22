import { test, expect } from "@playwright/test";
import { build } from "esbuild";
import { resolve } from "node:path";

test("research evidence uses conditional fields and preserves input on server validation errors", async ({
  page,
}) => {
  const bundle = await build({
    entryPoints: [resolve("e2e/fixtures/research-evidence.tsx")],
    bundle: true,
    write: false,
    platform: "browser",
    define: { "process.env.NODE_ENV": '"production"' },
    plugins: [
      {
        name: "simulate-persistence",
        setup(builder) {
          builder.onLoad({ filter: /research\/actions\.ts$/ }, () => ({
            contents: `import {parseResearchEvidenceForm, evidenceFieldErrors} from "@/lib/validation/evidence";
          export async function addEvidenceForm(form) {
            const parsed = parseResearchEvidenceForm(form);
            if (!parsed.success) return {fieldErrors: evidenceFieldErrors(parsed.error.issues)};
            window.savedEvidence = JSON.parse(JSON.stringify(parsed.data));
            return {};
          }`,
            loader: "ts",
            resolveDir: resolve("src"),
          }));
        },
      },
    ],
  });
  await page.setContent('<div id="root"></div>');
  await page.addScriptTag({ content: bundle.outputFiles![0]!.text });
  await expect(page.getByLabel("Type", { exact: true })).toHaveValue("paper");
  await expect(page.getByLabel("Metric", { exact: false })).toHaveCount(0);
  await page.getByLabel("Label *", { exact: true }).fill("Study");
  await page.getByLabel("URL (optional)", { exact: true }).fill("invalid");
  await page.getByRole("button", { name: "Add evidence" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByLabel("Label *", { exact: true })).toHaveValue("Study");
  await expect(page.getByLabel("URL (optional)", { exact: true })).toHaveValue("invalid");
  await page
    .getByLabel("URL (optional)", { exact: true })
    .fill("https://example.org/study");
  await page
    .getByLabel("Description (optional)", { exact: true })
    .fill("Published paper");
  await page.getByRole("button", { name: "Add evidence" }).click();
  await expect(page.getByRole("status")).toHaveText("Evidence added.");
  const saved = await page.evaluate(
    () => (window as unknown as { savedEvidence: Record<string, unknown> }).savedEvidence,
  );
  expect(saved).toMatchObject({
    type: "paper",
    label: "Study",
    description: "Published paper",
    url: "https://example.org/study",
    data: {},
  });
  await page.getByLabel("Type", { exact: true }).selectOption("measurement");
  await expect(page.getByLabel("Observed value *", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Before *", { exact: true })).toHaveCount(0);
  await page.getByLabel("Type", { exact: true }).selectOption("before_after");
  await expect(page.getByLabel("Before *", { exact: true })).toBeVisible();
  await expect(page.getByLabel("After *", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Observed value *", { exact: true })).toHaveCount(0);
});
