#!/usr/bin/env node
/**
 * Lighthouse (mobile) for the public landing pages, on the machine's own Chrome, headless.
 *
 *   node scripts/lighthouse/landing-lighthouse.mjs [--runs 3] [--devtools] [--out dir] URL [URL...]
 *   node scripts/lighthouse/landing-lighthouse.mjs --cls [--runs 10] [--slow4g] [--font-delay ms] URL...
 *
 * Chrome is the installed Google Chrome (Playwright `channel: "chrome"` for --cls, CHROME_PATH
 * for Lighthouse), so the runner works where Playwright's bundled browser is not downloaded.
 * Lighthouse runs through `npx lighthouse@<pinned>`; nothing is added to the lockfile. Every
 * window is headless (`--headless=new`).
 *
 * Default mode prints, per URL, the median and range of the four category scores, LCP, CLS and
 * TTFB (server-response-time), and lists every failing best-practices / accessibility audit.
 * `--cls` skips Lighthouse and loads each URL in a mobile viewport with a layout-shift
 * PerformanceObserver, printing the total and the elements that moved (for CLS hunting).
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";

const LIGHTHOUSE = "lighthouse@12.8.2";
const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  if (i === -1) return false;
  args.splice(i, 1);
  return true;
};
const option = (name, fallback) => {
  const i = args.indexOf(name);
  if (i === -1) return fallback;
  const [, value] = args.splice(i, 2);
  return value;
};

const clsMode = flag("--cls");
const slow4g = flag("--slow4g");
// Applied (devtools) throttling instead of Lighthouse's simulation. Use it against localhost:
// the simulation models every request from the observed run, and a loopback origin whose answers
// take ~0 ms makes it charge the page's own script to its LCP.
const devtoolsThrottling = flag("--devtools");
// Holds every web font back this long: the worst case of a cold, slow font fetch, when the
// swap lands after the first paint (how /investors measured CLS 0.217 live).
const fontDelay = Number(option("--font-delay", "0"));
const runs = Number(option("--runs", clsMode ? "10" : "3"));
const outDir = option("--out", fs.mkdtempSync(path.join(os.tmpdir(), "landing-lh-")));
fs.mkdirSync(outDir, { recursive: true });
const urls = args;
if (urls.length === 0) {
  console.error("usage: landing-lighthouse.mjs [--cls] [--slow4g] [--runs N] [--out dir] URL...");
  process.exit(2);
}

// Live sites go through the shell's proxy when one is set; local servers never do.
const local = urls.every((u) => /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(u));
const proxyServer = local ? undefined : process.env.HTTPS_PROXY || process.env.https_proxy;
// The installed Google Chrome (Playwright's `channel: "chrome"`); Lighthouse launches the same
// binary itself, because a Playwright-owned browser closes the targets Lighthouse opens.
const chromePath =
  process.env.CHROME_PATH ||
  (process.platform === "darwin"
    ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    : "/usr/bin/google-chrome");
const browser = clsMode
  ? await chromium.launch({
      channel: "chrome",
      headless: true,
      ...(proxyServer ? { proxy: { server: proxyServer } } : {}),
    })
  : null;

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor((s.length - 1) / 2)] : Number.NaN;
};
const range = (xs) => `${Math.min(...xs)}–${Math.max(...xs)}`;

async function clsRun(url) {
  const context = await browser.newContext({
    viewport: { width: 412, height: 823 },
    deviceScaleFactor: 1.75,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  if (slow4g) {
    const cdp = await context.newCDPSession(page);
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 562.5,
      downloadThroughput: (1.4 * 1024 * 1024) / 8,
      uploadThroughput: (675 * 1024) / 8,
    });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  }
  if (fontDelay > 0) {
    await page.route(/\.woff2(\?|$)/, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, fontDelay));
      await route.continue();
    });
  }
  await page.addInitScript(() => {
    window.__shifts = [];
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.hadRecentInput) continue;
        window.__shifts.push({
          value: entry.value,
          at: Math.round(entry.startTime),
          sources: (entry.sources ?? []).map((s) => {
            const n = s.node;
            const el = n && n.nodeType === 1 ? n : n?.parentElement;
            const id = el
              ? `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}${
                  el.className && typeof el.className === "string"
                    ? `.${el.className.trim().split(/\s+/).slice(0, 3).join(".")}`
                    : ""
                }`
              : "(text)";
            return `${id} ${JSON.stringify(s.previousRect)}→${JSON.stringify(s.currentRect)}`;
          }),
        });
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
  await page.goto(url, { waitUntil: "load", timeout: 120_000 });
  await page.waitForTimeout((slow4g ? 6000 : 3000) + fontDelay);
  const shifts = await page.evaluate(() => window.__shifts);
  await context.close();
  return shifts;
}

function lighthouseRun(url, i, attempt = 1) {
  const out = path.join(
    outDir,
    `${new URL(url).host}${new URL(url).pathname.replace(/\W+/g, "_")}-${i}.json`,
  );
  const result = spawnSync(
    "npx",
    [
      "--yes",
      LIGHTHOUSE,
      url,
      `--chrome-flags=--headless=new --no-first-run${proxyServer ? ` --proxy-server=${proxyServer}` : ""}`,
      "--output=json",
      `--output-path=${out}`,
      "--quiet",
      "--only-categories=performance,accessibility,best-practices,seo",
      ...(devtoolsThrottling ? ["--throttling-method=devtools"] : []),
    ],
    {
      stdio: ["ignore", "ignore", "pipe"],
      encoding: "utf8",
      env: { ...process.env, CHROME_PATH: chromePath },
    },
  );
  if (result.status !== 0 || !fs.existsSync(out)) {
    // Lighthouse occasionally loses the trace (NO_NAVSTART, target closed); try again.
    if (attempt < 3) return lighthouseRun(url, i, attempt + 1);
    throw new Error(`lighthouse failed for ${url}: ${result.stderr?.slice(-500)}`);
  }
  return JSON.parse(fs.readFileSync(out, "utf8"));
}

let worstCls = 0;
try {
  for (const url of urls) {
    if (clsMode) {
      const totals = [];
      for (let i = 0; i < runs; i++) {
        const shifts = await clsRun(url);
        const total = shifts.reduce((sum, s) => sum + s.value, 0);
        totals.push(Number(total.toFixed(4)));
        for (const s of shifts)
          console.log(`  run ${i + 1} +${s.value.toFixed(4)} @${s.at}ms ${s.sources.join(" | ")}`);
      }
      worstCls = Math.max(worstCls, ...totals);
      console.log(
        `${url} CLS${slow4g ? " (slow 4G)" : ""}${fontDelay ? ` (fonts +${fontDelay} ms)` : ""} per run: ${totals.join(" ")}`,
      );
      continue;
    }
    const reports = [];
    for (let i = 0; i < runs; i++) reports.push(lighthouseRun(url, i));
    const score = (r, c) => Math.round((r.categories[c]?.score ?? 0) * 100);
    const metric = (r, a) => r.audits[a]?.numericValue ?? Number.NaN;
    const cats = ["performance", "accessibility", "best-practices", "seo"];
    const line = cats
      .map((c) => {
        const xs = reports.map((r) => score(r, c));
        return `${c} ${median(xs)} (${range(xs)})`;
      })
      .join(", ");
    const lcp = reports.map((r) => Math.round(metric(r, "largest-contentful-paint")));
    const cls = reports.map((r) => Number(metric(r, "cumulative-layout-shift").toFixed(3)));
    const ttfb = reports.map((r) => Math.round(metric(r, "server-response-time")));
    console.log(
      `${url}\n  ${line}\n  LCP ms ${lcp.join(" ")} | CLS ${cls.join(" ")} | TTFB ms ${ttfb.join(" ")}`,
    );
    const failing = new Map();
    for (const r of reports) {
      for (const c of ["accessibility", "best-practices"]) {
        for (const ref of r.categories[c].auditRefs) {
          const a = r.audits[ref.id];
          if (ref.weight > 0 && a.score !== null && a.score < 1)
            failing.set(`${c}:${ref.id}`, a.title);
        }
      }
    }
    for (const [id, title] of failing) console.log(`  FAIL ${id} — ${title}`);
  }
} finally {
  await browser?.close();
}
console.log(`reports: ${outDir}`);
if (clsMode && process.env.CLS_MAX !== undefined && worstCls > Number(process.env.CLS_MAX)) {
  console.error(`worst CLS ${worstCls} > ${process.env.CLS_MAX}`);
  process.exit(1);
}
