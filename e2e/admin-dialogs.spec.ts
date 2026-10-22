import { test, expect } from "@playwright/test";
import { build } from "esbuild";
import { resolve } from "node:path";

test.beforeEach(async ({ page }) => {
  page.on("dialog", () => {
    throw new Error("Unexpected browser prompt");
  });
  const bundle = await build({
    entryPoints: [resolve("e2e/fixtures/admin-dialogs.tsx")],
    bundle: true,
    write: false,
    platform: "browser",
    define: { "process.env.NODE_ENV": '"production"' },
  });
  await page.setContent('<div id="root"></div>');
  await page.addScriptTag({ content: bundle.outputFiles![0]!.text });
});

test("deletion requires confirmation, traps focus, supports cancel/Escape and submits once", async ({
  page,
}) => {
  const trigger = page.getByRole("button", { name: "Delete message", exact: true });
  await trigger.click();
  const dialog = page.getByRole("alertdialog", { name: "Delete message?" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("button", { name: "Delete message" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(page.getByLabel("Delete calls")).toHaveText("0");
  await trigger.click();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByLabel("Delete calls")).toHaveText("0");
  await trigger.click();
  await dialog.getByRole("button", { name: "Delete message" }).click();
  await expect(page.getByRole("button", { name: "Working…" })).toBeDisabled();
  await page.evaluate(() => window.dispatchEvent(new Event("finish-deletion")));
  await expect(
    page.getByRole("status", { exact: true }).filter({ hasText: "Message deleted." }),
  ).toBeVisible();
  await expect(trigger).toBeEnabled();
  await expect(page.getByLabel("Delete calls")).toHaveText("1");
});

test("failed actions leave an error and allow retry", async ({ page }) => {
  await page.getByLabel("Simulate failure").check();
  await page.getByRole("button", { name: "Delete message", exact: true }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete message" })
    .click();
  await expect(page.getByRole("button", { name: "Working…" })).toBeDisabled();
  await page.evaluate(() => window.dispatchEvent(new Event("finish-deletion")));
  await expect(
    page.getByText("Unable to delete this message. Please try again."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Delete message", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
});

test("unsaved publishing waits for confirmation and preserves submitter", async ({
  page,
}) => {
  await page.getByRole("textbox", { name: "Title", exact: true }).fill("Unsaved edits");
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  const dialog = page.getByRole("alertdialog", { name: "Publish without saving?" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Keep editing" }).click();
  await expect(page.getByLabel("Publish calls")).toHaveText("0");
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await dialog.getByRole("button", { name: "Publish saved draft" }).click();
  await expect(page.getByLabel("Publish calls")).toHaveText("1");
  await expect(page.getByRole("textbox", { name: "Title", exact: true })).toHaveValue(
    "Unsaved edits",
  );
});

test("editor links use a dialog with inline validation and do not submit the draft", async ({
  page,
}) => {
  await page.locator('[contenteditable][aria-label="Body"]').fill("Link text");
  await page.getByRole("button", { name: "Link", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Edit link" });
  await expect(dialog.getByRole("textbox", { name: "Link URL" })).toBeFocused();
  await dialog.getByRole("textbox").fill("javascript:alert(1)");
  await dialog.getByRole("button", { name: "Save link" }).click();
  await expect(dialog.getByRole("alert")).toBeVisible();
  await dialog.getByRole("textbox").fill("https://example.com");
  await dialog.getByRole("button", { name: "Save link" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByLabel("Publish calls")).toHaveText("0");
});
