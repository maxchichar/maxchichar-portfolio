import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import postcss from "postcss";
import tailwindcss from "@tailwindcss/postcss";
import { researchReadingHtml } from "./fixtures/research-reading";

let css: string;
let fonts: string;
test.beforeAll(async () => {
  fonts = (
    await Promise.all(
      [
        ["Inter Tight Variable", "inter-tight"],
        ["Newsreader Variable", "newsreader"],
        ["JetBrains Mono Variable", "jetbrains-mono"],
      ].map(async ([family, name]) => {
        const data = await readFile(
          resolve(
            `node_modules/@fontsource-variable/${name}/files/${name}-latin-wght-normal.woff2`,
          ),
        );
        return `@font-face { font-family: "${family}"; font-style: normal; font-weight: 100 900; src: url(data:font/woff2;base64,${data.toString("base64")}) format("woff2"); }`;
      }),
    )
  ).join("\n");
  const path = resolve("src/app/globals.css");
  css = (
    await postcss([tailwindcss()]).process(await readFile(path, "utf8"), { from: path })
  ).css;
});

for (const theme of ["dark", "light"]) {
  test(`research typography and sources remain readable in ${theme} theme`, async ({
    page,
  }) => {
    await page.setContent(`<html data-theme="${theme}"><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>${fonts}${css}
      .reveal { opacity: 1; transform: none; }
      body { background: var(--bg); color: var(--text); }
    </style></head><body>${researchReadingHtml()}</body></html>`);
    await page.evaluate(() => document.fonts.ready);
    const question = page.locator("#research_question .rich-text");
    const background = page.locator("#background .rich-text");
    const questionStyle = await question.evaluate((element) => ({
      size: getComputedStyle(element).fontSize,
      height: getComputedStyle(element).lineHeight,
    }));
    expect(questionStyle).toEqual(
      await background.evaluate((element) => ({
        size: getComputedStyle(element).fontSize,
        height: getComputedStyle(element).lineHeight,
      })),
    );
    expect(questionStyle.size).toBe("19px");
    const sources = page.locator("#sources");
    await expect(sources.locator(".rich-text-sources > ol")).toHaveAttribute(
      "start",
      "4",
    );
    await expect(sources.locator(".rich-text-sources > ol > li")).toHaveCount(2);
    await expect(sources.locator("em")).toHaveText("Example reference A");
    await expect(sources.locator("ul li")).toHaveText(
      "Nested annotation remains nested.",
    );
    const link = sources.getByRole("link");
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
    await link.focus();
    expect(await link.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe(
      "solid",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await link.evaluate((element) => (element as HTMLElement).blur());
    await sources.screenshot({
      path: `/tmp/research-sources-${theme}-${test.info().project.name}.png`,
    });
  });
}

test("legacy paragraph citations remain intact and empty sources stay omitted", async ({
  page,
}) => {
  await page.setContent(
    `<style>${css}.reveal { opacity: 1; }</style>${researchReadingHtml("paragraphs")}`,
  );
  await expect(page.locator("#sources .rich-text-sources > p")).toHaveCount(2);
  await expect(page.locator("#sources")).toContainText("[A] Example paragraph citation.");
  await expect(page.locator("#sources")).toContainText("Unsafe link stays text");
  await expect(page.locator("#sources a")).toHaveCount(0);
  await page.setContent(researchReadingHtml("empty"));
  await expect(page.locator("#sources")).toHaveCount(0);
  await expect(page.locator('a[href="#sources"]')).toHaveCount(0);
});
