/** Real-browser UI acceptance for a built KCQ app, locally or after deployment.
 * Local auth/account fixtures never run against a remote origin. No AI requests
 * or public feedback submissions are made. Real market loading has its own smoke.
 */
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { resolve } from "node:path";
import { chromium } from "playwright";

const origin = process.env.KCQ_SMOKE_ORIGIN ?? "http://127.0.0.1:3131";
const local = new URL(origin).hostname === "127.0.0.1";
const output = resolve(process.env.KCQ_UI_OUTPUT ?? ".nebutra/kcq-candidates/ui-acceptance");
mkdirSync(output, { recursive: true });
const server =
  process.env.KCQ_UI_SERVE === "true" && local
    ? createServer(async (req, res) => {
        const path = new URL(req.url, origin).pathname;
        const file = ["/app", "/settings/profile"].includes(path)
          ? "/index.html"
          : /^\/(zh\/)?(home|benchmark|investors|404)$/.test(path)
            ? `${path}.html`
            : path;
        const root = resolve("apps/kcq/dist");
        const target = resolve(root, `.${decodeURIComponent(file)}`);
        if (!target.startsWith(`${root}/`)) {
          res.writeHead(404).end();
          return;
        }
        try {
          const body = await readFile(target);
          const extension = file.split(".").at(-1);
          const contentType =
            {
              html: "text/html",
              js: "text/javascript",
              css: "text/css",
              json: "application/json",
              svg: "image/svg+xml",
              woff2: "font/woff2",
              webp: "image/webp",
              png: "image/png",
            }[extension] ?? "application/octet-stream";
          res
            .writeHead(path.endsWith("/404") ? 404 : 200, { "content-type": contentType })
            .end(body);
        } catch {
          res.writeHead(404).end();
        }
      })
    : null;
if (server)
  await new Promise((accept, reject) => {
    server.once("error", reject);
    server.listen(Number(new URL(origin).port), "127.0.0.1", accept);
  });
const browser = await chromium.launch({
  channel: process.env.KCQ_UI_BROWSER ?? "chrome",
  headless: true,
});
const results = [];
const viewports = [
  { width: 1440, height: 900, colorScheme: "light" },
  { width: 390, height: 844, colorScheme: "dark" },
  { width: 844, height: 390, colorScheme: "light" },
  { width: 320, height: 640, colorScheme: "dark" },
];

async function bounds(locator) {
  await locator.waitFor();
  // Let shared entry transitions settle before measuring the final surface.
  await locator.page().waitForTimeout(250);
  const box = await locator.boundingBox();
  const viewport = locator.page().viewportSize();
  assert.ok(
    box &&
      box.x >= -1 &&
      box.y >= -1 &&
      box.x + box.width <= viewport.width + 1 &&
      box.y + box.height <= viewport.height + 1,
    `Surface outside viewport: ${JSON.stringify(box)}`,
  );
}

async function fixture(page, signedIn = false) {
  if (!local) return;
  const user = {
    id: "ui-acceptance",
    name: "长账户名称".repeat(12),
    email: `${"long-account".repeat(8)}@example.test`,
    image: null,
  };
  await page.route("https://auth.nebutra.com/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    const json = path.endsWith("/organization/list")
      ? []
      : path.endsWith("/update-user")
        ? { message: "验收用保存失败，请重试。" }
        : signedIn
          ? {
              user,
              session: { id: "ui-session", userId: user.id, expiresAt: "2099-01-01T00:00:00Z" },
            }
          : null;
    return route.fulfill({
      status: path.endsWith("/update-user") ? 500 : 200,
      json,
      headers: {
        "access-control-allow-origin": origin,
        "access-control-allow-credentials": "true",
      },
    });
  });
  await page.route(`${origin}/market/**`, (route) =>
    route.fulfill({
      json: {
        connections: [
          {
            id: "ui-source",
            provider: "twelvedata",
            label: "长行情连接名称".repeat(10),
            maskedKey: "••••1234",
            updatedAt: "2026-10-22",
          },
        ],
        canManage: true,
      },
    }),
  );
}

async function close(page, dialog) {
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden" });
}

async function palette(page) {
  return page.evaluate(() => {
    const probe = document.createElement("span");
    probe.style.color = "var(--klc-color-ui-accent)";
    probe.style.outlineColor = "var(--klc-color-ui-focus)";
    document.body.append(probe);
    const style = getComputedStyle(probe);
    const result = { accent: style.color, focus: style.outlineColor };
    probe.remove();
    return result;
  });
}

async function help(page, id) {
  const trigger = page.getByRole("button", { name: "如何开始研究", exact: true });
  await trigger.click();
  const guide = page.getByRole("dialog", { name: "开始研究", exact: true });
  await bounds(guide);
  assert.equal(await guide.getByRole("button", { name: "关闭", exact: true }).count(), 1);
  await close(page, guide);
  await page.waitForFunction(() => document.activeElement?.textContent === "如何开始研究");
  const account = page.getByRole("button", { name: "账户与工作区菜单", exact: true });
  await account.focus();
  await page.keyboard.press("Enter");
  await bounds(page.getByRole("menu"));
  await page.getByRole("menuitem", { name: "反馈与建议", exact: true }).click();
  const feedback = page.getByRole("dialog", { name: "反馈与建议", exact: true });
  const field = feedback.getByRole("textbox");
  await field.fill("输入区域应自动增长，并在达到上限后内部滚动。\n".repeat(90));
  await bounds(feedback);
  const metrics = await field.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      resize: style.resize,
      height: element.offsetHeight,
      scroll: element.scrollHeight > element.clientHeight,
      shadow: style.boxShadow,
      outline: style.outlineStyle,
    };
  });
  assert.equal(metrics.resize, "none");
  assert.ok(metrics.height <= 256 && metrics.scroll);
  assert.notEqual(metrics.shadow, "none", "Shared textarea must retain its focus ring");
  assert.equal(metrics.outline, "none", "Text controls must not acquire a second outline");
  const cta = feedback.getByRole("link", { name: "前往 GitHub 检查并提交" });
  assert.notEqual(
    await cta.evaluate((element) => getComputedStyle(element).backgroundImage),
    "none",
  );
  assert.equal(
    await cta.evaluate((element) =>
      getComputedStyle(element).getPropertyValue("--btn-default-bg").trim(),
    ),
    (await palette(page)).accent,
  );
  assert.ok(!new URL(await cta.getAttribute("href")).searchParams.get("body").includes("诊断"));
  await feedback.screenshot({ path: resolve(output, `${id}-feedback.png`) });
  await close(page, feedback);
  await page.waitForFunction(
    () => document.activeElement?.getAttribute("aria-label") === "账户与工作区菜单",
  );
}

async function workbench(page, id, colorScheme) {
  await page.goto(`${origin}/app`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "如何开始研究", exact: true }).waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "A 股 · 贵州茅台", exact: true })
      .evaluate((element) => element.offsetHeight),
    30,
  );
  await help(page, id);
  await page.getByRole("button", { name: "设置", exact: true }).click();
  const settings = page.getByRole("dialog", { name: "图表设置", exact: true });
  await bounds(settings);
  for (const name of [
    "主图设置",
    "快捷键",
    "数据源",
    "样式 / 颜色",
    "实验性 / 调试设置",
    "开源致谢",
  ]) {
    await settings.getByRole("tab", { name, exact: true }).click();
    await bounds(settings);
    assert.ok(await settings.innerText());
  }
  await settings.getByRole("tab", { name: "样式 / 颜色", exact: true }).click();
  const mode = colorScheme === "light" ? "白天" : "黑夜";
  // Explicit mode also exercises persistence, instead of depending on OS detection.
  const modeRadio = settings.getByRole("radio", { name: mode, exact: true });
  if (await modeRadio.count()) await modeRadio.check();
  await settings.getByRole("button", { name: /Exchange · 交易/ }).click();
  await settings.getByRole("button", { name: "确定", exact: true }).click();
  await settings.waitFor({ state: "hidden" });
  await help(page, `${id}-exchange`);
  await page.getByRole("button", { name: /默认布局/ }).click();
  await page.getByRole("menuitem", { name: "创建新布局", exact: true }).click();
  const naming = page
    .getByRole("dialog")
    .filter({ has: page.getByLabel("布局名称", { exact: true }) });
  await bounds(naming);
  const name = naming.getByLabel("布局名称", { exact: true });
  await name.focus();
  assert.notEqual(
    await name.evaluate((element) => getComputedStyle(element).boxShadow),
    "none",
    "Layout names must have a visible focus ring",
  );
  await close(page, naming);
  await page.getByRole("button", { name: "指标", exact: true }).click();
  const indicators = page.getByRole("dialog");
  await bounds(indicators);
  await close(page, indicators);
  await page.getByRole("button", { name: "选择商品", exact: true }).scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "选择商品", exact: true }).click();
  const symbols = page.getByRole("dialog");
  await bounds(symbols);
  const search = symbols.locator(".search-field input").first();
  await search.focus();
  assert.equal(
    await search.evaluate(
      (element) => getComputedStyle(element.closest(".search-field")).outlineStyle,
    ),
    "solid",
  );
  await close(page, symbols);
  await page.getByTestId("agent-panel-open").click();
  const panel = page.getByTestId("agent-panel");
  await bounds(panel);
  const composer = panel.locator("textarea");
  await composer.fill("只检查交互，不发送请求。");
  assert.equal(
    await composer.evaluate(
      (element) => getComputedStyle(element.closest(".composer__input")).outlineStyle,
    ),
    "solid",
  );
  assert.equal(await composer.evaluate((element) => getComputedStyle(element).resize), "none");
  await panel.getByRole("button", { name: "模型设置", exact: true }).click();
  const agentSettings = page.getByRole("dialog");
  await bounds(agentSettings);
  await agentSettings.screenshot({ path: resolve(output, `${id}-agent-settings.png`) });
  await close(page, agentSettings);
  await page.getByRole("button", { name: "关闭 Agent 面板", exact: true }).click();
  if ([1440, 390].includes(page.viewportSize().width)) {
    for (const preset of ["Pro · 专业", "Terminal · 终端", "Zen · 极简", "Quant · 研究"]) {
      await page.getByRole("button", { name: "设置", exact: true }).click();
      const dialog = page.getByRole("dialog", { name: "图表设置", exact: true });
      await dialog.getByRole("tab", { name: "样式 / 颜色", exact: true }).click();
      await dialog.getByRole("button", { name: new RegExp(preset) }).click();
      await dialog.getByRole("button", { name: "确定", exact: true }).click();
      await dialog.waitFor({ state: "hidden" });
      await help(page, `${id}-${preset.split(" ")[0]}`);
    }
  }
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
}

async function account(page) {
  await page.goto(`${origin}/settings/profile`, { waitUntil: "domcontentloaded" });
  const name = page.getByLabel("显示名称", { exact: true });
  await name.waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await name.fill(" ");
  assert.equal(await name.getAttribute("aria-invalid"), "true");
  await name.fill("UI 验收账户");
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await page.getByRole("alert").waitFor();
  await page.screenshot({ path: resolve(output, "mobile-profile-error.png") });
  await page.goto(`${origin}/app`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "账户与工作区菜单", exact: true }).click();
  await bounds(page.getByRole("menu"));
  await close(page, page.getByRole("menu"));
  await page.getByRole("button", { name: "设置", exact: true }).click();
  await page.getByRole("tab", { name: "数据源", exact: true }).click();
  await page.getByRole("button", { name: "行情数据源", exact: true }).focus();
  await page.keyboard.press("Enter");
  const sources = page.getByRole("dialog", { name: "行情数据源", exact: true });
  await bounds(sources);
  const add = sources.getByRole("button", { name: "连接行情源", exact: true });
  await add.click();
  await page.waitForFunction(() => document.activeElement?.id === "source-label");
  await sources.getByLabel("API Key", { exact: true }).press("Escape");
  await page.waitForFunction(() => document.activeElement?.textContent === "连接行情源");
  assert.equal(await sources.getByLabel("API Key", { exact: true }).count(), 0);
  await sources.screenshot({ path: resolve(output, "mobile-source-connections.png") });
}

async function publicPages(page, id) {
  for (const path of [
    "/home",
    "/zh/home",
    "/benchmark",
    "/zh/benchmark",
    "/investors",
    "/zh/investors",
    "/404",
    "/zh/404",
  ]) {
    const response = await page.goto(`${origin}${path}`, { waitUntil: "domcontentloaded" });
    assert.equal(response.status(), path.endsWith("/404") ? 404 : 200);
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
      `${path}: horizontal overflow`,
    );
    const group = page.locator(".theme-segmented");
    await group.scrollIntoViewIfNeeded();
    await group.getByRole("radio", { checked: true }).focus();
    await page.keyboard.press("Home");
    assert.equal(await group.getByRole("radio").first().getAttribute("aria-checked"), "true");
    await page.keyboard.press("End");
    assert.equal(await group.getByRole("radio").last().getAttribute("aria-checked"), "true");
    if (path.endsWith("investors")) {
      const language = page
        .locator(".locale-switch a")
        .filter({ hasText: path.startsWith("/zh") ? "EN" : "中文" });
      assert.equal(
        await language.getAttribute("href"),
        path.startsWith("/zh") ? "/investors" : "/zh/investors",
      );
    }
    await page.screenshot({ path: resolve(output, `${id}-${path.replaceAll("/", "_")}.png`) });
  }
}

try {
  for (const viewport of viewports) {
    const id = `${viewport.width}x${viewport.height}-${viewport.colorScheme}`;
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      locale: "zh-CN",
      colorScheme: viewport.colorScheme,
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (request) => {
      assert.ok(
        !/\/chat\/completions|\/responses$|\/capture\//.test(request.url()),
        "UI acceptance must never execute paid AI or analytics",
      );
    });
    await fixture(page);
    try {
      await workbench(page, id, viewport.colorScheme);
      await publicPages(page, id);
      assert.deepEqual(errors, []);
      results.push({ id, workbench: "passed", publicPages: 8, errors });
      console.log(JSON.stringify(results.at(-1)));
    } catch (error) {
      await page.screenshot({ path: resolve(output, `${id}-failed.png`) });
      console.error(await page.locator("body").innerText());
      throw error;
    } finally {
      await context.close();
    }
  }
  if (local) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      locale: "zh-CN",
      reducedMotion: "reduce",
      colorScheme: "dark",
    });
    const page = await context.newPage();
    await fixture(page, true);
    try {
      await account(page);
      results.push({ accountFixtures: "passed" });
    } catch (error) {
      await page.screenshot({ path: resolve(output, "account-failed.png") });
      console.error(await page.locator("body").innerText());
      throw error;
    } finally {
      await context.close();
    }
    const failureContext = await browser.newContext({
      viewport: { width: 320, height: 640 },
      locale: "zh-CN",
    });
    try {
      const page = await failureContext.newPage();
      await page.route("https://auth.nebutra.com/**", (route) =>
        route.fulfill({ status: 500, json: { message: "无法验证登录状态" } }),
      );
      await page.goto(`${origin}/app`);
      await page.getByRole("alert").waitFor();
      const retry = page.getByRole("button", { name: "重新加载", exact: true });
      assert.equal(await retry.evaluate((element) => element.offsetHeight), 30);
      await retry.focus();
      assert.equal(
        await retry.evaluate((element) => getComputedStyle(element).outlineStyle),
        "solid",
      );
      results.push({ bootstrapFailure: "passed" });
    } finally {
      await failureContext.close();
    }
  }
  writeFileSync(resolve(output, "results.json"), JSON.stringify({ origin, results }, null, 2));
} finally {
  await browser.close();
  if (server) await new Promise((accept) => server.close(accept));
}
