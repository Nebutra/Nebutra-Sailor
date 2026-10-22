/** Real-data acceptance for wide, zoomed-out and restored chart history. Never sends AI requests. */
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";

const origin = process.env.KCQ_SMOKE_ORIGIN ?? "https://kcq.nebutra.com";
const { commit: chartRevision } = JSON.parse(await readFile("apps/kcq/chart-source.json", "utf8"));
const output = resolve(
  process.env.KCQ_MARKET_OUTPUT ?? ".nebutra/kcq-candidates/market-acceptance",
);
const browser = await chromium.launch({
  ...(process.env.KCQ_UI_BROWSER === "chromium" ? {} : { channel: "chrome" }),
  headless: true,
});
const reports = [];
await mkdir(output, { recursive: true });

try {
  for (const [id, width, zoomSteps] of [
    ["wide-initial", 5000, 0],
    ["zoom-and-restore", 3006, 5],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height: 1500 },
      locale: "zh-CN",
      colorScheme: "dark",
    });
    const page = await context.newPage();
    page.setDefaultTimeout(60_000);
    const bars = [];
    const pending = new Set();
    const errors = [];
    const requests = [];
    let maxBarsPerRequest;
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (request) => {
      requests.push(request.url());
      if (request.url().endsWith("/bars")) pending.add(request);
    });
    page.on("requestfailed", (request) => {
      if (pending.delete(request))
        errors.push(request.failure()?.errorText ?? "bars request failed");
    });
    page.on("response", async (response) => {
      if (response.url().includes("/sources/gotdx/probe")) {
        const body = await response.json().catch(() => null);
        maxBarsPerRequest = body?.data?.capabilities?.bars?.maxBarsPerRequest;
      }
      if (!response.url().endsWith("/bars")) return;
      try {
        const query = response.request().postDataJSON();
        const body = await response.json();
        bars.push({
          status: response.status(),
          limit: query.limit,
          beforeTimestamp: query.beforeTimestamp,
          count: body.data?.items?.length,
          firstTimestamp: body.data?.items?.[0]?.timestamp,
          lastTimestamp: body.data?.items?.at(-1)?.timestamp,
          error: body.error,
        });
      } catch (error) {
        errors.push(error.message);
      } finally {
        pending.delete(response.request());
      }
    });

    /** Wait for request bodies as well as chart rendering; SSE is intentionally not network-idle. */
    async function waitForBars(after = 0) {
      const deadline = Date.now() + 60_000;
      while ((bars.length <= after || pending.size) && Date.now() < deadline) {
        await page.waitForTimeout(100);
      }
      assert.ok(bars.length > after, `${id}: no completed bars request`);
      assert.equal(pending.size, 0, `${id}: unfinished bars requests`);
      assert.ok(
        bars.every((bar) => bar.status === 200),
        JSON.stringify(bars),
      );
      await page.locator(".chart-empty").waitFor({ state: "hidden" });
    }

    try {
      await page.goto(`${origin}/app`, { waitUntil: "domcontentloaded" });
      await page.getByRole("button", { name: "A 股 · 贵州茅台", exact: true }).click();
      await waitForBars();
      await page.getByRole("button", { name: "账户与工作区菜单", exact: true }).click();
      await page.getByRole("menuitem", { name: "反馈与建议", exact: true }).click();
      const feedback = page.getByRole("dialog", { name: "反馈与建议", exact: true });
      await feedback
        .getByText("附上基础诊断（图表版本、主题、屏幕尺寸类别）", { exact: true })
        .click();
      assert.ok(
        (await feedback.locator("pre").innerText()).includes(chartRevision),
        "The deployed chart must match the tested source pin",
      );
      await page.keyboard.press("Escape");
      await feedback.waitFor({ state: "hidden" });
      if (zoomSteps) {
        await page.getByTestId("agent-panel-open").click();
        await page.getByTestId("agent-panel").waitFor();
        const previous = bars.length;
        for (let step = 0; step < zoomSteps; step++) {
          await page.getByRole("button", { name: "缩小", exact: true }).click();
        }
        await waitForBars(previous);
      }
      assert.ok(
        Number.isInteger(maxBarsPerRequest) && maxBarsPerRequest > 0,
        "Connector must declare its request bound",
      );
      assert.ok(
        bars.every((bar) => bar.limit >= 1 && bar.limit <= maxBarsPerRequest),
        JSON.stringify(bars),
      );
      assert.ok(
        bars.some((bar) => bar.beforeTimestamp !== undefined),
        `${id}: cursor pagination was not exercised`,
      );
      assert.ok(
        bars.reduce((total, bar) => total + bar.count, 0) > maxBarsPerRequest,
        `${id}: history must not be truncated to one page`,
      );
      const previous = bars.length;
      await page.reload({ waitUntil: "domcontentloaded" });
      await waitForBars(previous);
      assert.equal(
        await page.getByRole("button", { name: "A 股 · 贵州茅台", exact: true }).count(),
        0,
        "Saved selection must restore",
      );
      assert.ok(
        bars.every((bar) => bar.status === 200 && bar.limit <= maxBarsPerRequest),
        JSON.stringify(bars),
      );
      assert.deepEqual(errors, []);
      assert.ok(
        !requests.some((url) => /\/chat\/completions|\/responses$|\/capture\//.test(url)),
        "Unexpected paid AI or analytics request",
      );
      reports.push({ id, width, zoomSteps, chartRevision, maxBarsPerRequest, bars });
      console.log(JSON.stringify(reports.at(-1)));
    } finally {
      await page.screenshot({ path: resolve(output, `${id}.png`) });
      await writeFile(
        resolve(output, `${id}.json`),
        JSON.stringify({ bars, maxBarsPerRequest, errors }, null, 2),
      );
      await context.close();
    }
  }
} finally {
  await writeFile(resolve(output, "results.json"), JSON.stringify({ origin, reports }, null, 2));
  await browser.close();
}
