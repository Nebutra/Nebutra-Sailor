import { expect, test } from "@playwright/test";
import {
  attachViewportScreenshot,
  expectNoHorizontalOverflow,
  expectRenderableSurface,
  expectStableVisualSurface,
  expectVisibleTextDensity,
  prepareVisualPage,
} from "./helpers/visual";

const LANDING_BASE_URL = process.env.VISUAL_LANDING_BASE_URL ?? "http://127.0.0.1:3200";
const CAPABILITY_FOLDER_COUNT = 7;

const showcaseRoutes = [
  { route: "/en/features", kind: "capability-map" },
  { route: "/zh/features", kind: "capability-map" },
  { route: "/en/features/auth", kind: "detail-showcase" },
  { route: "/en/features/billing", kind: "detail-showcase" },
  { route: "/en/features/gateway", kind: "detail-showcase" },
  { route: "/en/features/iam", kind: "detail-showcase" },
  { route: "/en/features/integrations", kind: "detail-showcase" },
  { route: "/en/features/ops", kind: "detail-showcase" },
  { route: "/en/features/platform", kind: "detail-showcase" },
] as const;

test.describe("landing feature showcase visual acceptance", () => {
  for (const entry of showcaseRoutes) {
    test(`${entry.route} keeps showcase surfaces stable`, async ({ page }, testInfo) => {
      await prepareVisualPage(page, `${LANDING_BASE_URL}${entry.route}`, testInfo);

      await expect(page.locator("main").first()).toBeVisible();
      await expect(page.locator("main h1").first()).toBeVisible();
      await expectNoHorizontalOverflow(page);

      if (entry.kind === "capability-map") {
        const capabilityMap = page.locator("#capability-map").first();
        const capabilityCards = capabilityMap.locator("article");

        await expectRenderableSurface(capabilityMap, {
          minimum: { width: 280, height: 500 },
          minimumTextCharacters: 1_200,
          minimumVisibleDescendants: 28,
        });
        await expect(capabilityCards).toHaveCount(CAPABILITY_FOLDER_COUNT);
        await expect(capabilityMap.getByRole("link", { name: /feature page/i })).toHaveCount(
          CAPABILITY_FOLDER_COUNT,
        );
        await expectVisibleTextDensity(capabilityMap, 1_200);

        for (let index = 0; index < CAPABILITY_FOLDER_COUNT; index += 1) {
          await expectRenderableSurface(capabilityCards.nth(index), {
            minimum: { width: 260, height: 360 },
            minimumTextCharacters: 180,
            minimumVisibleDescendants: 4,
          });
        }
      } else {
        const showcase = page.locator("#showcase").first();
        const showcaseSurface = showcase.locator(".landing-showcase-surface").first();

        await expectStableVisualSurface(showcase, { width: 280, height: 360 });
        await expectRenderableSurface(showcaseSurface, {
          minimum: { width: 260, height: 320 },
          minimumTextCharacters: 100,
          minimumVisibleDescendants: 5,
        });
        await expectVisibleTextDensity(showcase, 120);

        const usage = page.locator("#usage").first();
        await expectRenderableSurface(usage, {
          minimum: { width: 280, height: 300 },
          minimumTextCharacters: 220,
          minimumVisibleDescendants: 3,
        });
      }

      await attachViewportScreenshot(page, testInfo, entry.route.replaceAll("/", "-").slice(1));
    });
  }
});
