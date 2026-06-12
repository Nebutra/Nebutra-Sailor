import type { Page } from "@playwright/test";

const NAVIGATION_RETRIES = 3;
const NAVIGATION_TIMEOUT_MS = 30_000;
const TRANSIENT_NAVIGATION_ERRORS = [
  "page.goto: Timeout",
  "Timeout",
  "ECONNRESET",
  "net::ERR_ABORTED",
  "ERR_NETWORK_IO_SUSPENDED",
  "maybe frame was detached",
  "frame was detached",
];

function isTransientNavigationError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return TRANSIENT_NAVIGATION_ERRORS.some((marker) => message.includes(marker));
}

export async function gotoMarketingPage(page: Page, path = "/") {
  let lastError: unknown;

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
