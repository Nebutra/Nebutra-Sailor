import { expect, test } from "@playwright/test";
import {
  attachViewportScreenshot,
  expectNoHorizontalOverflow,
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
        await expectStableVisualSurface(capabilityMap, { width: 280, height: 500 });
        await expect(capabilityMap.locator("article")).toHaveCount(CAPABILITY_FOLDER_COUNT);
        await expect(capabilityMap.getByRole("link", { name: /feature page/i })).toHaveCount(
          CAPABILITY_FOLDER_COUNT,
        );
        await expectVisibleTextDensity(capabilityMap, 1_200);
      } else {
        const showcase = page.locator("#showcase").first();
        await expectStableVisualSurface(showcase, { width: 280, height: 360 });
        await expectVisibleTextDensity(showcase, 120);

        const usage = page.locator("#usage").first();
        await expectStableVisualSurface(usage, { width: 280, height: 300 });
        await expectVisibleTextDensity(usage, 220);
      }

      await attachViewportScreenshot(page, testInfo, entry.route.replaceAll("/", "-").slice(1));
    });
  }
});
