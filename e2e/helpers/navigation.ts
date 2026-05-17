import type { Page } from "@playwright/test";

const ROUTE_PREWARM_TIMEOUT_MS = 30_000;
const NAVIGATION_RETRIES = 3;
const NAVIGATION_TIMEOUT_MS = 8_000;
const TRANSIENT_NAVIGATION_ERRORS = [
  "page.request.get: Timeout",
  "page.goto: Timeout",
  "Timeout",
  "net::ERR_ABORTED",
  "ERR_NETWORK_IO_SUSPENDED",
  "maybe frame was detached",
  "frame was detached",
];

function isTransientNavigationError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return TRANSIENT_NAVIGATION_ERRORS.some((marker) => message.includes(marker));
}

async function prewarmMarketingRoute(page: Page, path: string) {
  try {
    await page.request.get(path, {
      failOnStatusCode: false,
      timeout: ROUTE_PREWARM_TIMEOUT_MS,
    });
  } catch (error) {
    if (!isTransientNavigationError(error)) {
      throw error;
    }
  }
}

export async function gotoMarketingPage(page: Page, path = "/") {
  let lastError: unknown;

  await prewarmMarketingRoute(page, path);

  for (let attempt = 1; attempt <= NAVIGATION_RETRIES; attempt += 1) {
    try {
      await page.goto(path, {
        timeout: NAVIGATION_TIMEOUT_MS,
        waitUntil: "domcontentloaded",
      });
      return;
    } catch (error) {
      lastError = error;

      if (!isTransientNavigationError(error) || attempt === NAVIGATION_RETRIES) {
        throw error;
      }

      await page.waitForTimeout(500 * attempt);
    }
  }

  throw lastError;
}
