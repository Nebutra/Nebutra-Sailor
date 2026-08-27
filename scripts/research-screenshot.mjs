#!/usr/bin/env node
/**
 * Full-page screenshot capture for competitor teardowns.
 *
 * Required by the research gate in
 * docs/plans/2026-07-23-nebutra-router-forge-design.md §6.7.10 — a competitor
 * brief without captured layout is not a brief.
 *
 *   node scripts/research-screenshot.mjs <url> <out.png> [--viewport 1440x900]
 *                                                        [--wait 2500]
 *                                                        [--mobile]
 *                                                        [--clip-full false]
 *
 * Exits non-zero on failure so a caller cannot mistake a missing capture for a
 * successful one. Consent/cookie walls are dismissed on a best-effort basis;
 * when one survives, that is reported rather than silently screenshotted.
 */
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { chromium, devices } from "playwright";

const CONSENT_PATTERNS = [
  /^(accept|accept all|allow all|agree|i agree|got it|ok)$/i,
  /^(同意|接受|允许全部|知道了)$/,
];

function parseArgs(argv) {
  const [url, out, ...rest] = argv;
  if (!url || !out) {
    process.stderr.write(
      "usage: research-screenshot.mjs <url> <out.png> [--viewport WxH] [--wait ms] [--mobile]\n",
    );
    process.exit(2);
  }
  const flags = {};
  for (let i = 0; i < rest.length; i += 1) {
    const key = rest[i];
    if (!key.startsWith("--")) continue;
    const name = key.slice(2);
    const next = rest[i + 1];
    if (next && !next.startsWith("--")) {
      flags[name] = next;
      i += 1;
    } else {
      flags[name] = "true";
    }
  }
  return { url, out, flags };
}

async function dismissConsent(page) {
  for (const pattern of CONSENT_PATTERNS) {
    const button = page.getByRole("button", { name: pattern }).first();
    try {
      if (await button.isVisible({ timeout: 600 })) {
        await button.click({ timeout: 1500 });
        await page.waitForTimeout(400);
        return true;
      }
    } catch {
      // no consent button under this pattern — keep trying the next one
    }
  }
  return false;
}

async function main() {
  const { url, out, flags } = parseArgs(process.argv.slice(2));
  const outPath = resolve(out);
  await mkdir(dirname(outPath), { recursive: true });

  const [width, height] = (flags.viewport ?? "1440x900").split("x").map(Number);
  const waitMs = Number(flags.wait ?? 2500);
  const fullPage = flags["clip-full"] !== "false";

  const browser = await chromium.launch();
  const context = await browser.newContext(
    flags.mobile === "true"
      ? devices["iPhone 13"]
      : { viewport: { width, height }, deviceScaleFactor: 2 },
  );
  const page = await context.newPage();

  try {
    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
    const status = response?.status() ?? 0;
    if (status >= 400) {
      throw new Error(`HTTP ${status} for ${url}`);
    }
    await page.waitForTimeout(waitMs);
    const dismissed = await dismissConsent(page);
    // Let lazy sections render before a full-page capture.
    if (fullPage) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(800);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(400);
    }
    await page.screenshot({ path: outPath, fullPage });
    const title = await page.title();
    process.stdout.write(
      `${JSON.stringify({ ok: true, url, out: outPath, status, title, consentDismissed: dismissed })}\n`,
    );
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  process.stdout.write(
    `${JSON.stringify({ ok: false, error: String(error?.message ?? error) })}\n`,
  );
  process.exit(1);
});
