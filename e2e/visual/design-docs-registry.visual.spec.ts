import { expect, test } from "@playwright/test";
import {
  attachViewportScreenshot,
  expectNoHorizontalOverflow,
  expectStableVisualSurface,
  prepareVisualPage,
} from "./helpers/visual";

const DESIGN_DOCS_BASE_URL = process.env.VISUAL_DESIGN_DOCS_BASE_URL ?? "http://127.0.0.1:3203";

const componentPages = [
  "/en/docs/components/command-menu",
  "/en/docs/components/dialog",
  "/en/docs/components/dropdown-menu",
  "/en/docs/components/menu",
  "/en/docs/components/popover",
  "/en/docs/components/tooltip",
] as const;

test.describe("design-docs visual acceptance", () => {
  test("registry surfaces stay scannable", async ({ page }, testInfo) => {
    await prepareVisualPage(page, `${DESIGN_DOCS_BASE_URL}/en/registry`, testInfo);
    await expect(page.getByRole("heading", { name: /Registry/i })).toBeVisible();
    await expectStableVisualSurface(page.locator("main").first());
    await expectNoHorizontalOverflow(page);
    await attachViewportScreenshot(page, testInfo, "design-docs-registry");
  });

  for (const route of componentPages) {
    test(`${route} renders without layout overflow`, async ({ page }, testInfo) => {
      await prepareVisualPage(page, `${DESIGN_DOCS_BASE_URL}${route}`, testInfo, "#nd-page");
      await expect(page.locator("#nd-page h1").first()).toBeVisible();
      await expectStableVisualSurface(page.locator("#nd-page").first());
      await expectNoHorizontalOverflow(page, "#nd-page");
      await attachViewportScreenshot(page, testInfo, route.replaceAll("/", "-").slice(1));
    });
  }
});
