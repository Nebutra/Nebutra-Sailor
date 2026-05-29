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

  const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
  expect(response?.ok() ?? false, `${url} should return a successful document response`).toBe(true);
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
  await page.locator(readySelector).first().waitFor({ state: "visible", timeout: 30_000 });
  await page.waitForLoadState("load", { timeout: 15_000 }).catch(() => undefined);
  await Promise.race([
    page.evaluate(async () => {
      await document.fonts?.ready;
    }),
    page.waitForTimeout(2_000),
  ]).catch(() => undefined);
  await page.waitForTimeout(100);
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
    const viewportHeight = window.innerHeight;
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
        if (rect.bottom < -2 || rect.top > viewportHeight + 2) return false;
        if (node.closest("pre, code, figure, .shiki, [data-rehype-pretty-code-figure]")) {
          return false;
        }

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

export async function expectStableVisualSurface(
  locator: Locator,
  minimum = { width: 240, height: 120 },
) {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();

  expect(box?.width ?? 0).toBeGreaterThan(minimum.width);
  expect(box?.height ?? 0).toBeGreaterThan(minimum.height);
}

export async function expectRenderableSurface(
  locator: Locator,
  options: {
    minimum?: { width: number; height: number };
    minimumTextCharacters?: number;
    minimumVisibleDescendants?: number;
  } = {},
) {
  const minimum = options.minimum ?? { width: 240, height: 120 };
  await expectStableVisualSurface(locator, minimum);

  const result = await locator.evaluate((root, config) => {
    const rootElement = root as HTMLElement;
    const rootRect = rootElement.getBoundingClientRect();
    const rootStyle = window.getComputedStyle(rootElement);
    const rootAllowsScroll =
      rootStyle.overflowX === "auto" ||
      rootStyle.overflowX === "scroll" ||
      rootStyle.overflowY === "auto" ||
      rootStyle.overflowY === "scroll";
    const visibleText = (rootElement.innerText ?? rootElement.textContent ?? "")
      .replace(/\s+/g, " ")
      .trim();
    const visibleDescendants = Array.from(
      rootElement.querySelectorAll<HTMLElement | SVGElement>(
        "a, button, canvas, code, img, input, pre, svg, textarea, [role], [aria-label]",
      ),
    ).filter((element) => {
      if (element.getAttribute("role") === "presentation") return false;
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        rect.bottom >= rootRect.top &&
        rect.right >= rootRect.left &&
        rect.top <= rootRect.bottom &&
        rect.left <= rootRect.right
      );
    });

    const clippedDescendants = visibleDescendants
      .filter((element) => {
        if (rootAllowsScroll) return false;
        if (element.getAttribute("aria-hidden") === "true") return false;
        for (
          let parent = element.parentElement;
          parent && parent !== rootElement;
          parent = parent.parentElement
        ) {
          const parentStyle = window.getComputedStyle(parent);
          if (
            parentStyle.overflowX === "auto" ||
            parentStyle.overflowX === "scroll" ||
            parentStyle.overflowY === "auto" ||
            parentStyle.overflowY === "scroll"
          ) {
            return false;
          }
        }

        const rect = element.getBoundingClientRect();
        const intersectionWidth = Math.max(
          0,
          Math.min(rect.right, rootRect.right) - Math.max(rect.left, rootRect.left),
        );
        const intersectionHeight = Math.max(
          0,
          Math.min(rect.bottom, rootRect.bottom) - Math.max(rect.top, rootRect.top),
        );
        const intersectionArea = intersectionWidth * intersectionHeight;
        const elementArea = rect.width * rect.height;

        return elementArea > 0 && intersectionArea / elementArea < 0.65;
      })
      .slice(0, 6)
      .map((element) => ({
        tag: element.tagName.toLowerCase(),
        role: element.getAttribute("role"),
        label: element.getAttribute("aria-label"),
        text: element.textContent?.trim().replace(/\s+/g, " ").slice(0, 80) ?? "",
        rect: element.getBoundingClientRect().toJSON(),
      }));

    return {
      clippedDescendants,
      textCharacters: visibleText.length,
      visibleDescendantCount: visibleDescendants.length,
      minimumTextCharacters: config.minimumTextCharacters ?? 0,
      minimumVisibleDescendants: config.minimumVisibleDescendants ?? 1,
    };
  }, options);

  expect(result.clippedDescendants, JSON.stringify(result.clippedDescendants, null, 2)).toEqual([]);
  expect(result.textCharacters).toBeGreaterThanOrEqual(result.minimumTextCharacters);
  expect(result.visibleDescendantCount).toBeGreaterThanOrEqual(result.minimumVisibleDescendants);
}

export async function expectVisibleTextDensity(locator: Locator, minimumCharacters = 80) {
  await expect(locator).toBeVisible();
  const visibleText = await locator.evaluate((node) =>
    ((node as HTMLElement).innerText ?? node.textContent ?? "").replace(/\s+/g, " ").trim(),
  );

  expect(visibleText.length).toBeGreaterThanOrEqual(minimumCharacters);
}

export async function expectNoNativeFocusOutline(page: Page, rootSelector = "body") {
  const offenders = await page.evaluate((selector) => {
    const root = document.querySelector<HTMLElement>(selector);
    const active = document.activeElement;
    const nodes = Array.from(document.querySelectorAll<HTMLElement>("*:focus")).filter(
      (element) => !root || root.contains(element) || element === active,
    );

    return nodes
      .filter((element) => {
        const style = window.getComputedStyle(element);
        const outlineWidth = Number.parseFloat(style.outlineWidth || "0");
        const hasOutline = outlineWidth > 0 && style.outlineStyle !== "none";
        const hasTokenRing = style.boxShadow !== "none";
        const radius = Number.parseFloat(style.borderTopLeftRadius || "0");

        return style.outlineStyle === "auto" || (hasOutline && !hasTokenRing && radius < 2);
      })
      .map((element) => {
        const style = window.getComputedStyle(element);
        return {
          tag: element.tagName.toLowerCase(),
          className: element.className.toString().slice(0, 120),
          text: element.textContent?.trim().replace(/\s+/g, " ").slice(0, 80) ?? "",
          outlineStyle: style.outlineStyle,
          outlineWidth: style.outlineWidth,
          borderRadius: style.borderTopLeftRadius,
          boxShadow: style.boxShadow,
        };
      });
  }, rootSelector);

  expect(offenders, JSON.stringify(offenders, null, 2)).toEqual([]);
}

export async function expectVisibleOverlaySurface(
  page: Page,
  expectedText: RegExp,
  minimum = { width: 96, height: 24, textCharacters: 12 },
) {
  const surfaces = await page.evaluate(
    ({ source, flags, minimumHeight, minimumText, minimumWidth }) => {
      const matcher = new RegExp(source, flags);
      const primaryCandidates = Array.from(
        document.querySelectorAll<HTMLElement>(
          [
            "[role='dialog']",
            "[role='menu']",
            "[role='menuitem']",
            "[role='menuitemcheckbox']",
            "[role='menuitemradio']",
            "[role='listbox']",
            "[role='tooltip']",
            "[data-side]",
            "[data-radix-popper-content-wrapper] > *",
          ].join(","),
        ),
      );
      const fallbackCandidates = Array.from(document.body.querySelectorAll<HTMLElement>("*"));
      const candidates = Array.from(new Set([...primaryCandidates, ...fallbackCandidates]));

      return candidates
        .filter((element) => {
          const style = window.getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          const visibleText = (element.innerText ?? element.textContent ?? "").replace(/\s+/g, " ");
          return (
            rect.width > 0 &&
            rect.height > 0 &&
            rect.width >= minimumWidth &&
            rect.height >= minimumHeight &&
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            matcher.test(visibleText) &&
            visibleText.trim().length >= minimumText
          );
        })
        .sort((first, second) => {
          const rolePriority = (element: HTMLElement) => {
            const role = element.getAttribute("role");
            if (role === "dialog" || role === "menu" || role === "listbox" || role === "tooltip") {
              return 0;
            }
            if (element.hasAttribute("data-side")) return 1;
            if (role?.startsWith("menuitem")) return 2;
            return 3;
          };
          const priorityDelta = rolePriority(first) - rolePriority(second);
          if (priorityDelta !== 0) return priorityDelta;

          const firstRect = first.getBoundingClientRect();
          const secondRect = second.getBoundingClientRect();
          return secondRect.width * secondRect.height - firstRect.width * firstRect.height;
        })
        .slice(0, 4)
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            tag: element.tagName.toLowerCase(),
            role: element.getAttribute("role"),
            text: (element.innerText ?? element.textContent ?? "")
              .replace(/\s+/g, " ")
              .trim()
              .slice(0, 120),
            rect: rect.toJSON(),
            clippedByViewport:
              rect.left < -2 ||
              rect.top < -2 ||
              rect.right > window.innerWidth + 2 ||
              rect.bottom > window.innerHeight + 2,
          };
        });
    },
    {
      source: expectedText.source,
      flags: expectedText.flags,
      minimumHeight: minimum.height,
      minimumText: minimum.textCharacters,
      minimumWidth: minimum.width,
    },
  );

  expect(
    surfaces.length,
    `${expectedText} should resolve to a visible overlay surface`,
  ).toBeGreaterThan(0);
  expect(surfaces[0].rect.width).toBeGreaterThan(minimum.width);
  expect(surfaces[0].rect.height).toBeGreaterThan(minimum.height);
  expect(surfaces[0].clippedByViewport, JSON.stringify(surfaces[0], null, 2)).toBe(false);
}

export async function attachViewportScreenshot(page: Page, testInfo: TestInfo, name: string) {
  const image = await page.screenshot({ fullPage: false });
  await testInfo.attach(`${name}-${testInfo.project.name}.png`, {
    body: image,
    contentType: "image/png",
  });
}
