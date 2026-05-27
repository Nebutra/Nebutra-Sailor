import { expect, type Locator, type Page, type TestInfo } from "@playwright/test";

export function projectTheme(testInfo: TestInfo): "dark" | "light" {
  return testInfo.project.name.includes("dark") ? "dark" : "light";
}

export async function prepareVisualPage(
  page: Page,
  url: string,
  testInfo: TestInfo,
  readySelector = "main",
) {
  const theme = projectTheme(testInfo);

  await page.emulateMedia({ colorScheme: theme });
  await page.addInitScript((nextTheme) => {
    window.localStorage.setItem("theme", nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    document.documentElement.dataset.theme = nextTheme;
  }, theme);

  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-delay: 0s !important;
        animation-duration: 0s !important;
        scroll-behavior: auto !important;
        transition-delay: 0s !important;
        transition-duration: 0s !important;
      }
      [data-radix-popper-content-wrapper],
      [data-floating-ui-portal] {
        transition: none !important;
      }
    `,
  });

  await page.evaluate((nextTheme) => {
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    document.documentElement.dataset.theme = nextTheme;
  }, theme);
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
  await page.locator(readySelector).first().waitFor({ state: "visible", timeout: 30_000 });
  await page.evaluate(() => document.fonts?.ready);
}

export async function expectNoHorizontalOverflow(page: Page, rootSelector = "main") {
  const offenders = await page.evaluate((selector) => {
    const root = document.querySelector<HTMLElement>(selector);
    if (!root) {
      return [
        {
          tag: "missing-root",
          className: selector,
          text: "",
          rect: null,
        },
      ];
    }

    const viewportWidth = window.innerWidth;
    const rootRect = root.getBoundingClientRect();
    const leftBound = Math.max(0, Math.floor(rootRect.left) - 2);
    const rightBound = Math.min(viewportWidth, Math.ceil(rootRect.right) + 2);
    const nodes = Array.from(root.querySelectorAll<HTMLElement>("*"));
    const ignoredTags = new Set(["CODE", "PRE", "SVG", "TABLE"]);

    return nodes
      .filter((node) => {
        const rect = node.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return false;
        if (ignoredTags.has(node.tagName)) return false;

        const style = getComputedStyle(node);
        if (style.position === "fixed" || style.position === "sticky") return false;
        if (
          style.overflowX === "auto" ||
          style.overflowX === "scroll" ||
          style.overflowX === "clip"
        ) {
          return false;
        }

        return rect.left < leftBound || rect.right > rightBound;
      })
      .slice(0, 8)
      .map((node) => ({
        tag: node.tagName.toLowerCase(),
        className: node.className.toString().slice(0, 120),
        text: node.textContent?.trim().replace(/\s+/g, " ").slice(0, 80) ?? "",
        rect: node.getBoundingClientRect().toJSON(),
      }));
  }, rootSelector);

  expect(offenders, JSON.stringify(offenders, null, 2)).toEqual([]);
}

export async function expectStableVisualSurface(locator: Locator) {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();

  expect(box?.width ?? 0).toBeGreaterThan(240);
  expect(box?.height ?? 0).toBeGreaterThan(120);
}

export async function attachViewportScreenshot(page: Page, testInfo: TestInfo, name: string) {
  const image = await page.screenshot({ fullPage: false });
  await testInfo.attach(`${name}-${testInfo.project.name}.png`, {
    body: image,
    contentType: "image/png",
  });
}
