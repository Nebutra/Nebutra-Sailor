import { expect, type Page, test } from "@playwright/test";
import {
  attachViewportScreenshot,
  expectNoHorizontalOverflow,
  expectNoNativeFocusOutline,
  expectRenderableSurface,
  expectStableVisualSurface,
  expectVisibleOverlaySurface,
  expectVisibleTextDensity,
  prepareVisualPage,
} from "./helpers/visual";

const DESIGN_DOCS_BASE_URL = process.env.VISUAL_DESIGN_DOCS_BASE_URL ?? "http://localhost:3203";

const overlayPages = [
  {
    route: "/en/docs/components/command-menu",
    triggerName: "Open Command Menu",
    expectedText: /Deploy Project/i,
  },
  {
    route: "/en/docs/components/dialog",
    triggerName: "Open Dialog",
    expectedText: /This is an example dialog/i,
  },
  {
    route: "/en/docs/components/dropdown-menu",
    triggerName: "Open Menu",
    expectedText: /My Account/i,
  },
  {
    route: "/en/docs/components/menu",
    triggerName: "Account",
    expectedText: /Keyboard shortcuts/i,
  },
  {
    route: "/en/docs/components/menubar",
    triggerName: "File",
    expectedText: /New Tab/i,
  },
  {
    route: "/en/docs/components/hover-card",
    triggerName: "@johndoe",
    open: "hover",
    expectedText: /Building great products/i,
  },
  {
    route: "/en/docs/components/popover",
    triggerName: "Open Popover",
    expectedText: /Dimensions/i,
  },
  {
    route: "/en/docs/components/tooltip",
    triggerName: "Hover me",
    open: "focus",
    expectedText: /Available to admins/i,
  },
] as const;

async function countVisibleText(page: Page, text: RegExp) {
  const matches = page.getByText(text);
  const count = await matches.count();
  let visible = 0;

  for (let index = 0; index < count; index += 1) {
    if (
      await matches
        .nth(index)
        .isVisible()
        .catch(() => false)
    ) {
      visible += 1;
    }
  }

  return visible;
}

function isTouchProject(projectName: string) {
  return projectName.includes("tablet") || projectName.includes("mobile");
}

test.describe("design-docs visual acceptance", () => {
  test("registry surfaces stay scannable", async ({ page }, testInfo) => {
    await prepareVisualPage(page, `${DESIGN_DOCS_BASE_URL}/en/registry`, testInfo);
    const main = page.locator("main").first();
    const registryCards = main.locator("article");

    await expect(page.getByRole("heading", { name: /Registry/i })).toBeVisible();
    await expectRenderableSurface(main, {
      minimum: { width: 280, height: 480 },
      minimumTextCharacters: 600,
      minimumVisibleDescendants: 12,
    });
    await expect(registryCards.first()).toBeVisible();
    await expectRenderableSurface(registryCards.first(), {
      minimum: { width: 240, height: 160 },
      minimumTextCharacters: 120,
      minimumVisibleDescendants: 3,
    });
    await expectNoHorizontalOverflow(page);
    await attachViewportScreenshot(page, testInfo, "design-docs-registry");
  });

  test("registry detail source preview is populated", async ({ page }, testInfo) => {
    await prepareVisualPage(page, `${DESIGN_DOCS_BASE_URL}/en/registry/button`, testInfo);
    const main = page.locator("main").first();
    const sourcePreview = main.locator("pre").first();

    await expect(page.getByRole("heading", { name: /^Button$/i })).toBeVisible();
    await expectRenderableSurface(main, {
      minimum: { width: 280, height: 520 },
      minimumTextCharacters: 1_200,
      minimumVisibleDescendants: 6,
    });
    await expectRenderableSurface(sourcePreview, {
      minimum: { width: 260, height: 240 },
      minimumTextCharacters: 700,
      minimumVisibleDescendants: 1,
    });
    await expectNoHorizontalOverflow(page);
    await attachViewportScreenshot(page, testInfo, "design-docs-registry-button-detail");
  });

  for (const entry of overlayPages) {
    test(`${entry.route} exposes a stable open overlay state`, async ({ page }, testInfo) => {
      test.skip(
        "open" in entry && entry.open === "hover" && isTouchProject(testInfo.project.name),
        "Hover-only overlays are asserted on desktop projects; touch projects do not expose a stable hover state.",
      );

      const routeName = entry.route.replaceAll("/", "-").slice(1);
      const pageHeading = page.locator("#nd-page h1").first();
      await prepareVisualPage(
        page,
        `${DESIGN_DOCS_BASE_URL}${entry.route}`,
        testInfo,
        "#nd-page h1",
      );
      await expect(pageHeading).toBeVisible();

      const preview = page
        .locator("#nd-page .not-prose")
        .filter({
          has: page
            .getByRole("button", { name: entry.triggerName })
            .or(page.getByRole("link", { name: entry.triggerName }))
            .or(page.getByText(entry.triggerName, { exact: true })),
        })
        .first();
      await expectStableVisualSurface(preview);
      await expectVisibleTextDensity(page.locator("#nd-page").first(), 400);

      const trigger = preview
        .getByRole("button", { name: entry.triggerName })
        .or(preview.getByRole("link", { name: entry.triggerName }))
        .or(preview.getByText(entry.triggerName, { exact: true }))
        .first();
      await expect(trigger).toBeVisible();

      const visibleTextBeforeOpen = await countVisibleText(page, entry.expectedText);
      if ("open" in entry && entry.open === "hover") {
        await trigger.hover();
      } else if ("open" in entry && entry.open === "focus") {
        await trigger.focus();
      } else {
        await trigger.click();
      }

      await expect
        .poll(() => countVisibleText(page, entry.expectedText), {
          message: `${entry.route} should reveal new visible overlay text after interaction`,
          timeout: 10_000,
        })
        .toBeGreaterThan(visibleTextBeforeOpen);

      await expectVisibleOverlaySurface(page, entry.expectedText);
      await expectNoNativeFocusOutline(page);
      await expectStableVisualSurface(page.locator("#nd-page").first());
      await expectNoHorizontalOverflow(page, "#nd-page");
      await attachViewportScreenshot(page, testInfo, routeName);
    });
  }
});
