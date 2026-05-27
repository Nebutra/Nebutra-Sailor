import { expect, test } from "@playwright/test";
import {
  attachViewportScreenshot,
  expectNoHorizontalOverflow,
  expectStableVisualSurface,
  prepareVisualPage,
} from "./helpers/visual";

const LANDING_BASE_URL = process.env.VISUAL_LANDING_BASE_URL ?? "http://127.0.0.1:3200";

const showcaseRoutes = [
  "/en/features",
  "/zh/features",
  "/en/features/auth",
  "/en/features/billing",
  "/en/features/gateway",
  "/en/features/iam",
  "/en/features/integrations",
  "/en/features/ops",
  "/en/features/platform",
] as const;

test.describe("landing feature showcase visual acceptance", () => {
  for (const route of showcaseRoutes) {
    test(`${route} keeps showcase surfaces stable`, async ({ page }, testInfo) => {
      await prepareVisualPage(page, `${LANDING_BASE_URL}${route}`, testInfo);

      await expect(page.locator("main").first()).toBeVisible();
      await expectNoHorizontalOverflow(page);

      const showcase = page
        .locator("[data-visual-surface='feature-showcase'], #showcase, main")
        .first();
      await expectStableVisualSurface(showcase);
      await attachViewportScreenshot(page, testInfo, route.replaceAll("/", "-").slice(1));
    });
  }
});
