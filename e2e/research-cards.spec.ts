import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import postcss from "postcss";
import tailwindcss from "@tailwindcss/postcss";
import { researchCardsHtml } from "./fixtures/research-cards";

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
  for (const home of [false, true]) {
    test(`research ${home ? "homepage" : "listing"} cards in ${theme}`, async ({
      page,
    }) => {
      await page.route("https://research.test/cover.svg", (route) =>
        route.fulfill({
          contentType: "image/svg+xml",
          body: '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000"><rect width="1600" height="1000" fill="#271b43"/><circle cx="800" cy="500" r="300" fill="#8b5cf6"/></svg>',
        }),
      );
      await page.setContent(
        `<html data-theme="${theme}"><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>${fonts}${css}</style></head><body>${researchCardsHtml(home)}</body></html>`,
      );
      await page.evaluate(() => document.fonts.ready);
      const links = page.getByRole("link");
      await expect(links).toHaveCount(2);
      await expect(links.first()).toHaveAttribute(
        "href",
        "/research/architecture-of-stagnation",
      );
      await expect(links.first()).toContainText("The Architecture of Stagnation");
      await expect(
        links.first().getByText("Systems & society", { exact: true }).last(),
      ).toBeVisible();
      const image = links.nth(1).locator("img");
      await image.scrollIntoViewIfNeeded();
      await expect(image).toBeVisible();
      await expect(image).toHaveAttribute("alt", "");
      await expect(image).toHaveAttribute("loading", "lazy");
      await expect
        .poll(() => image.evaluate((el) => (el as HTMLImageElement).naturalWidth))
        .toBeGreaterThan(0);
      await links.first().focus();
      await expect(links.first()).toBeFocused();
      expect(
        await links.first().evaluate((el) => getComputedStyle(el).outlineStyle),
      ).toBe("solid");
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      ).toBe(true);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await links.nth(1).hover();
      expect(
        await image.evaluate((el) => parseFloat(getComputedStyle(el).transitionDuration)),
      ).toBeLessThan(0.001);
      await page.screenshot({
        path: `/tmp/research-cards-${theme}-${home ? "home" : "listing"}-${test.info().project.name}.png`,
        fullPage: true,
      });
    });
  }
}
