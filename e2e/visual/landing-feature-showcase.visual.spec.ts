import { expect, test } from "@playwright/test";
import {
  attachViewportScreenshot,
  expectNoHorizontalOverflow,
  expectRenderableSurface,
  expectVisibleTextDensity,
  prepareVisualPage,
} from "./helpers/visual";

const LANDING_BASE_URL = process.env.VISUAL_LANDING_BASE_URL ?? "http://127.0.0.1:3200";
/** Domains on /features: the seven capability folders plus ops. */
const DOMAIN_COUNT = 8;

type Section = "topology" | "usage" | "packages" | "showcase";

/**
 * Each page renders only the sections it has real content for (see
 * features-honesty.test.ts), so each route names the ones it must show.
 */
const detailRoutes: { route: string; sections: Section[] }[] = [
  { route: "/en/features/auth", sections: ["showcase"] },
  { route: "/en/features/billing", sections: ["showcase", "usage"] },
  { route: "/en/features/gateway", sections: ["topology"] },
  { route: "/en/features/iam", sections: ["topology", "usage", "packages"] },
  { route: "/en/features/integrations", sections: ["topology", "usage", "packages"] },
  { route: "/en/features/ops", sections: ["packages"] },
  { route: "/en/features/platform", sections: ["topology", "usage", "packages"] },
];

test.describe("landing feature showcase visual acceptance", () => {
  for (const route of ["/en/features", "/zh/features"]) {
    test(`${route} lists every domain`, async ({ page }, testInfo) => {
      await prepareVisualPage(page, `${LANDING_BASE_URL}${route}`, testInfo);

      await expect(page.locator("main h1").first()).toBeVisible();
      await expectNoHorizontalOverflow(page);

      const domains = page.locator('main section[id^="capability-"]');
      await expect(domains).toHaveCount(DOMAIN_COUNT);
      for (let index = 0; index < DOMAIN_COUNT; index += 1) {
        await expectRenderableSurface(domains.nth(index), {
          minimum: { width: 260, height: 240 },
          minimumTextCharacters: 120,
          minimumVisibleDescendants: 4,
        });
      }

      await attachViewportScreenshot(page, testInfo, route.replaceAll("/", "-").slice(1));
    });
  }

  for (const entry of detailRoutes) {
    test(`${entry.route} shows its real sections`, async ({ page }, testInfo) => {
      await prepareVisualPage(page, `${LANDING_BASE_URL}${entry.route}`, testInfo);

      await expect(page.locator("main h1").first()).toBeVisible();
      await expectNoHorizontalOverflow(page);

      for (const id of entry.sections) {
        const section = page.locator(`#${id}`).first();
        await expectRenderableSurface(section, {
          minimum: { width: 260, height: 200 },
          minimumTextCharacters: 60,
          minimumVisibleDescendants: 3,
        });
        await expectVisibleTextDensity(section, 60);
      }

      await attachViewportScreenshot(page, testInfo, entry.route.replaceAll("/", "-").slice(1));
    });
  }
});
