/**
 * Capture the /home workstation shots from the real product UI: the canonical chart workstation at
 * the pinned chart commit (its preview app), on live GOTDX bars, in light and dark. It adds BOLL and
 * MACD, draws one trend line, and writes the shots used by src/public/home/home-workstation.vue.
 * Run by hand; the WebP files are committed.
 *
 *   # terminal 1, in the pinned chart checkout:
 *   cd "$KCQ_SOURCE_DIR/packages/vue" && node node_modules/vite/bin/vite.js --config preview/vite.config.ts --port 5199
 *   # terminal 2, from the repository root:
 *   node apps/kcq/scripts/capture-workstation.mjs [preview-url] [market-origin]
 *
 * The preview's connector requests are routed to the public read-only `/market/tdx` route; sources
 * that route does not serve answer "unavailable", as they would for a visitor.
 */
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import sharp from "sharp";

const preview = process.argv[2] ?? "http://localhost:5199/";
const market = process.argv[3] ?? "https://kcq.nebutra.com/market/tdx";
const out = fileURLToPath(new URL("../src/public/home/workstation/", import.meta.url));
const scratch = mkdtempSync(join(tmpdir(), "kcq-workstation-"));
/** The preview's own debug header is not product chrome: the shot starts below it. */
const CLIP = { x: 0, y: 48, width: 1440, height: 852 };

async function capture(theme) {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    colorScheme: theme,
  });
  const page = await context.newPage();
  await page.addInitScript(
    (mode) => localStorage.setItem("kline-chart-settings", JSON.stringify({ theme: mode })),
    theme,
  );
  await page.route(/127\.0\.0\.1:\d+\/api\/v1\/market-data\/.*/, async (route) => {
    const url = new URL(route.request().url());
    const sourceId = /"sourceId":"([a-z0-9]+)"/.exec(route.request().postData() ?? "")?.[1];
    const otherProbe = /\/sources\/(?!gotdx)[a-z0-9]+\/probe/.test(url.pathname);
    if (otherProbe || (sourceId && sourceId !== "gotdx"))
      return route.fulfill({ status: 503, body: "" });
    const response = await route.fetch({
      url: market + url.pathname + url.search,
      timeout: 60_000,
    });
    await route.fulfill({
      response,
      headers: { ...response.headers(), "access-control-allow-origin": "*" },
    });
  });
  await page.goto(preview, { waitUntil: "networkidle" });
  await page.getByText("选择商品", { exact: true }).first().click();
  await page.keyboard.type("600519");
  await page.getByText("贵州茅台").first().waitFor({ timeout: 90_000 });
  const bars = page.waitForResponse((r) => r.url().includes("/market-data/bars") && r.ok(), {
    timeout: 90_000,
  });
  await page.getByText("贵州茅台").first().click();
  await bars;
  await page.waitForTimeout(2500);
  await page.locator('[aria-label="指标"]').first().click();
  for (const name of ["MACD", "BOLL"]) {
    await page.getByPlaceholder("搜索指标名称...").fill(name);
    await page.getByText(name, { exact: true }).first().click();
  }
  await page.getByText("确认", { exact: true }).click();
  await page.waitForTimeout(2000);
  // A trend line from the July low: the drawing tool, used the way a person would.
  await page.locator('[aria-label="线段"]').first().click();
  await page.mouse.click(342, 628);
  await page.mouse.click(917, 506);
  await page.locator('[aria-label="光标"]').first().click();
  await page.mouse.move(1250, 300);
  await page.waitForTimeout(800);
  const png = join(scratch, `${theme}.png`);
  await page.screenshot({ path: png, clip: CLIP });
  await browser.close();
  for (const width of [1200, 2400]) {
    await sharp(png)
      .resize({ width })
      .webp({ quality: width > 1500 ? 74 : 80, effort: 6 })
      .toFile(join(out, `workstation-${theme}-${width}.webp`));
  }
}

for (const theme of ["dark", "light"]) await capture(theme);
console.log(`wrote workstation shots to ${out}`);
