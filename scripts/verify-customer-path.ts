#!/usr/bin/env tsx
/**
 * verify-customer-path.ts — the release gate for what a customer gets.
 *
 * Walks the path a new customer walks, from this checkout, outside the repo:
 *
 *   1. `pnpm template:build` into a temp dir (what the template mirror ships)
 *   2. builds create-sailor
 *   3. scaffolds `acme-rocket` from that template (SAILOR_TEMPLATE_LOCAL_DIR,
 *      --yes --json) — create-sailor installs dependencies and sets the brand
 *   4. `pnpm dev` in the scaffold, until it prints the product app's URL
 *   5. Playwright (chromium): / lands on /welcome showing the project's name
 *      and not Nebutra's, the one-click demo sign-in signs in, settings open;
 *      no page errors and no failed same-origin requests on the way. The
 *      site's / answers server-rendered HTML with real text.
 *   6. what the customer reads is theirs: every page walked (welcome,
 *      sign-in, each settings tab, billing, and every page the site serves
 *      per site-map.ts, en + zh) shows no Nebutra, no upstream product copy
 *      (Sailor, Agent OS, its prices, Nebutra's product names) and — in the
 *      product app — no notes meant for developers; the signed-in nav has no
 *      Startup OS, settings shows the demo account's email, no devtools
 *      widget floats over the app, no page loads images or media from
 *      another host, and every icon the app and the site serve (link rel
 *      icons, manifest icons, /favicon.ico) is an image that is not
 *      byte-equal to Nebutra's own.
 *   7. screenshots (welcome light + dark, mobile, signed in, settings
 *      profile, site desktop + mobile, the pricing section) and timings into
 *      the output dir, then tears everything down.
 *
 * Exits non-zero, naming the failed step, on any failure.
 *
 * Usage: pnpm verify:customer-path [--out=<dir>] [--keep] [--attach=<web>,<site>]
 *   --out   screenshots, timings.json and logs (default: artifacts/customer-path)
 *   --keep  leave the temp scaffold on disk (it is printed)
 *   --attach  run only the browser checks, against a preview already running
 *             (e.g. a --keep scaffold's `pnpm dev`) — for iterating on a
 *             failure; a release is gated by the full run
 */
import { type ChildProcess, execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Browser, BrowserContext, Page } from "playwright";
import { SITE_MAP } from "../apps/landing/src/site-map";

const ROOT = path.resolve(__dirname, "..");
const PROJECT = "acme-rocket";
/** What create-sailor's brandNameFromProject makes of PROJECT. */
const BRAND = "Acme Rocket";
const DEV_TIMEOUT_MS = Number(process.env.CUSTOMER_PATH_DEV_TIMEOUT_MS ?? 15 * 60_000);
const STEP_TIMEOUT_MS = 20 * 60_000;

/**
 * Nebutra's name may appear to the customer only as an identifier they
 * actually type: the `nebutra` CLI and the `@nebutra/*` packages the code
 * imports. Anything else visible (text, title, meta, alt/aria labels,
 * JSON-LD) is the upstream brand leaking into the customer's product.
 */
const ALLOWED_NEBUTRA = [
  /@nebutra\/[\w./-]+/gi,
  /\b(?:npx |pnpm (?:exec )?)?nebutra (?:status|apply|init|login|doctor|rls-audit|[a-z-]+)\b/gi,
];

/**
 * The upstream product showing through: Sailor's own sales copy and prices,
 * and Nebutra's product names. None of it belongs on a customer's pages.
 */
const UPSTREAM_DENYLIST: ReadonlyArray<[label: string, pattern: RegExp]> = [
  ["Sailor", /\bSailor\b/i],
  ["Agent OS", /Agent\s?OS/i],
  ["$2,000", /\$\s?2,000/],
  ["$30,000", /\$\s?30,000/],
  ["Startup OS", /Startup\s?OS/i],
  ["Founder OS", /Founder\s?OS/i],
  ["Sleptons", /Sleptons/i],
  ["Kuanlan", /Kuanlan|观澜/i],
  ["Pebble", /\bPebble\b/],
  ["TypeLens", /TypeLens/i],
  ["Forge", /\bForge\b/],
];

/** Notes written for the template's developers, not for the people using the product. */
const DEVELOPER_NOTES: ReadonlyArray<[label: string, pattern: RegExp]> = [
  ["TanStack", /TanStack/i],
  ["React Query", /React Query/i],
  ["browser-safe", /browser-safe/i],
  ["BFF", /\bBFF\b/],
  ["gateway", /\bgateway\b/i],
  ["boundary", /\bboundary\b/i],
  ["facade", /\bfacade\b/i],
  ["URL search state", /search state/i],
  ["Product App", /Product App/],
  ["feature flag", /feature flag/i],
  ["browser-rendered", /browser-rendered/i],
];

/** The preview database's demo account (apps/web/src/vite-app/preview-auth.ts). */
const DEMO_EMAIL = "admin@example.com";

/** Hosts a page may load images and media from: its own origins and data:/blob: URLs. */
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

// ---------------------------------------------------------------------------

interface Args {
  out: string;
  keep: boolean;
  /** Browser checks only, against a preview already running: [web, site]. */
  attach: [string, string] | null;
}

function parseArgs(): Args {
  const args: Args = {
    out: path.join(ROOT, "artifacts", "customer-path"),
    keep: false,
    attach: null,
  };
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--out=")) args.out = path.resolve(arg.slice("--out=".length));
    else if (arg === "--keep") args.keep = true;
    else if (arg.startsWith("--attach=")) {
      const [web, site] = arg.slice("--attach=".length).split(",");
      if (!web || !site) throw new Error("--attach=<product app URL>,<site URL>");
      args.attach = [web.replace(/\/+$/, ""), site.replace(/\/+$/, "")];
    } else if (arg === "--help" || arg === "-h") {
      process.stdout.write(
        "Usage: pnpm verify:customer-path [--out=<dir>] [--keep] [--attach=<web>,<site>]\n",
      );
      process.exit(0);
    }
  }
  return args;
}

class GateError extends Error {
  constructor(
    readonly step: string,
    message: string,
  ) {
    super(message);
  }
}

const timings: Record<string, number> = {};
const log = (line: string) => process.stdout.write(`[customer-path] ${line}\n`);
const seconds = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

function tail(file: string, lines = 40): string {
  try {
    return fs.readFileSync(file, "utf8").split("\n").slice(-lines).join("\n");
  } catch {
    return "(no log)";
  }
}

/** Runs a command to completion, output to a log file; throws GateError on failure. */
function runStep(
  step: string,
  command: string,
  args: string[],
  opts: { cwd: string; env?: NodeJS.ProcessEnv; logFile: string; onLine?: (line: string) => void },
): Promise<void> {
  const started = Date.now();
  log(`${step}: ${command} ${args.join(" ")}`);
  return new Promise((resolve, reject) => {
    const out = fs.createWriteStream(opts.logFile);
    const child = spawn(command, args, {
      cwd: opts.cwd,
      env: opts.env ?? process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let buffer = "";
    child.stdout.on("data", (chunk: Buffer) => {
      out.write(chunk);
      if (!opts.onLine) return;
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) opts.onLine(line);
    });
    child.stderr.on("data", (chunk: Buffer) => out.write(chunk));
    const timer = setTimeout(() => child.kill("SIGKILL"), STEP_TIMEOUT_MS);
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(new GateError(step, error.message));
    });
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      out.end();
      if (buffer && opts.onLine) opts.onLine(buffer);
      timings[step] = Date.now() - started;
      if (code === 0) {
        log(`${step}: ok (${seconds(timings[step])})`);
        resolve();
      } else {
        reject(
          new GateError(
            step,
            `exited with ${signal ?? `code ${code}`} — log ${opts.logFile}\n${tail(opts.logFile)}`,
          ),
        );
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Dev server
// ---------------------------------------------------------------------------

interface DevServer {
  child: ChildProcess;
  webUrl: string;
  siteUrl: string | null;
}

function startDev(projectDir: string, logFile: string): Promise<DevServer> {
  const started = Date.now();
  log("dev: pnpm dev");
  return new Promise((resolve, reject) => {
    const out = fs.createWriteStream(logFile);
    const child = spawn("pnpm", ["dev"], {
      cwd: projectDir,
      env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" },
      stdio: ["ignore", "pipe", "pipe"],
      // Own process group: teardown signals the preview and everything under it.
      detached: true,
    });
    let webUrl: string | null = null;
    let siteUrl: string | null = null;
    let settled = false;
    const settle = (error?: GateError) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve({ child, webUrl: webUrl as string, siteUrl });
    };
    let buffer = "";
    const onData = (chunk: Buffer) => {
      out.write(chunk);
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const raw of lines) {
        // biome-ignore lint/suspicious/noControlCharactersInRegex: strips ANSI colour codes
        const line = raw.replace(/\u001b\[[0-9;]*m/g, "");
        const web = /Product app answered 200 at/.test(line);
        if (web) timings["dev→web first 200"] = Date.now() - started;
        if (/Site answered 200 at/.test(line)) timings["dev→site first 200"] = Date.now() - started;
        const site = /^\s+Site\s+(http:\/\/localhost:\d+)/.exec(line);
        if (site) siteUrl = site[1] ?? null;
        const start = /Start here: (http:\/\/localhost:\d+)\/welcome/.exec(line);
        if (start) {
          webUrl = start[1] ?? null;
          timings["dev→ready"] = Date.now() - started;
          settle();
        }
      }
    };
    child.stdout?.on("data", onData);
    child.stderr?.on("data", onData);
    const timer = setTimeout(
      () =>
        settle(
          new GateError(
            "dev",
            `no web URL within ${seconds(DEV_TIMEOUT_MS)} — log ${logFile}\n${tail(logFile)}`,
          ),
        ),
      DEV_TIMEOUT_MS,
    );
    child.on("exit", (code) =>
      settle(new GateError("dev", `pnpm dev exited (${code}) — log ${logFile}\n${tail(logFile)}`)),
    );
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Stops the preview's process group, then anything still running from the
 * temp project (the preview database runs in its own group). Only processes
 * whose command line names this run's unique temp dir are touched.
 */
async function teardown(dev: ChildProcess | null, tempDir: string): Promise<void> {
  if (dev?.pid && dev.exitCode === null) {
    try {
      process.kill(-dev.pid, "SIGTERM");
    } catch {
      // already gone
    }
    for (let i = 0; i < 20 && dev.exitCode === null; i++) await sleep(250);
    try {
      process.kill(-dev.pid, "SIGKILL");
    } catch {
      // already gone
    }
  }
  const strays = (): number[] => {
    try {
      return execFileSync("ps", ["-axo", "pid=,command="], { encoding: "utf8" })
        .split("\n")
        .filter((line) => line.includes(tempDir))
        .map((line) => Number.parseInt(line.trim(), 10))
        .filter((pid) => Number.isInteger(pid) && pid !== process.pid);
    } catch {
      return [];
    }
  };
  for (const signal of ["SIGTERM", "SIGKILL"] as const) {
    const pids = strays();
    if (pids.length === 0) break;
    for (const pid of pids) {
      try {
        process.kill(pid, signal);
      } catch {
        // already gone
      }
    }
    await sleep(1500);
  }
}

// ---------------------------------------------------------------------------
// Browser checks
// ---------------------------------------------------------------------------

interface PageWatch {
  problems: string[];
}

/** Page errors and failed same-origin requests, collected per context. */
function watch(context: BrowserContext, origins: string[]): PageWatch {
  const state: PageWatch = { problems: [] };
  const sameOrigin = (url: string) => origins.some((o) => url.startsWith(o));
  context.on("page", (page) => attach(page));
  const attach = (page: Page) => {
    page.on("pageerror", (error) =>
      state.problems.push(`page error on ${page.url()}: ${error.message}`),
    );
    page.on("requestfailed", (request) => {
      const failure = request.failure()?.errorText ?? "failed";
      // A navigation away aborts in-flight requests; that is not a failure.
      if (failure.includes("ERR_ABORTED")) return;
      if (sameOrigin(request.url())) {
        state.problems.push(`request failed: ${request.method()} ${request.url()} (${failure})`);
      }
    });
    page.on("response", (response) => {
      // 401 is an answer, not a failure: signed-out session probes
      // (/api/me/public, the site's navbar) return it by contract.
      const status = response.status();
      if (status >= 400 && status !== 401 && sameOrigin(response.url())) {
        state.problems.push(
          `HTTP ${response.status()}: ${response.request().method()} ${response.url()}`,
        );
      }
    });
  };
  return state;
}

/**
 * Waits for the page to load, then for the network to go quiet — bounded:
 * the site pulls third-party images, so "idle" may never come, and that is
 * not the product's failure.
 */
async function settle(page: Page): Promise<void> {
  await page.waitForLoadState("load", { timeout: 60_000 }).catch(() => undefined);
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
}

/** Everything a visitor can read on the page, plus what search/share cards show. */
async function readableText(page: Page): Promise<string> {
  return page.evaluate(() => {
    const parts: string[] = [document.title, document.body.innerText];
    for (const m of Array.from(document.querySelectorAll("meta[content]"))) {
      const key = m.getAttribute("name") ?? m.getAttribute("property") ?? "";
      if (/^(description|author|creator|publisher|application-name|og:|twitter:)/.test(key)) {
        parts.push(m.getAttribute("content") ?? "");
      }
    }
    for (const e of Array.from(document.querySelectorAll("[alt],[aria-label],[title]"))) {
      parts.push(e.getAttribute("alt") ?? "", e.getAttribute("aria-label") ?? "");
      parts.push(e.getAttribute("title") ?? "");
    }
    for (const s of Array.from(document.querySelectorAll('script[type="application/ld+json"]'))) {
      parts.push(s.textContent ?? "");
    }
    return parts.join("\n");
  });
}

function nebutraLeaks(text: string): string[] {
  let scrubbed = text;
  for (const allowed of ALLOWED_NEBUTRA) scrubbed = scrubbed.replace(allowed, "");
  const leaks = [...scrubbed.matchAll(/.{0,50}(?:nebutra|云毓).{0,50}/gi)].map((m) =>
    m[0].replace(/\s+/g, " ").trim(),
  );
  return [...new Set(leaks)];
}

function denied(
  text: string,
  list: ReadonlyArray<readonly [string, RegExp]>,
): Array<{ label: string; context: string }> {
  const hits: Array<{ label: string; context: string }> = [];
  for (const [label, pattern] of list) {
    const m = new RegExp(pattern.source, pattern.flags.replace("g", "")).exec(text);
    if (m) {
      const at = m.index;
      hits.push({
        label,
        context: text.slice(Math.max(0, at - 50), at + m[0].length + 50).replace(/\s+/g, " "),
      });
    }
  }
  return hits;
}

/**
 * The customer's page shows neither Nebutra nor the upstream product, and —
 * for the product app — no notes meant for the template's developers.
 */
async function expectCustomerCopy(
  page: Page,
  where: string,
  opts: { developerNotes?: boolean; brand?: boolean } = {},
): Promise<string> {
  const text = await readableText(page);
  if (opts.brand !== false && !text.includes(BRAND)) {
    throw new GateError("brand", `${where} does not show the project's name "${BRAND}"`);
  }
  const leaks = nebutraLeaks(text);
  if (leaks.length > 0) {
    throw new GateError(
      "brand",
      `${where} shows Nebutra to the customer:\n  ${leaks.slice(0, 15).join("\n  ")}`,
    );
  }
  const upstream = denied(text, UPSTREAM_DENYLIST);
  if (upstream.length > 0) {
    throw new GateError(
      "customer copy",
      `${where} shows the upstream product:\n  ${upstream.map((h) => `${h.label}: …${h.context}…`).join("\n  ")}`,
    );
  }
  if (opts.developerNotes) {
    const notes = denied(text, DEVELOPER_NOTES);
    if (notes.length > 0) {
      throw new GateError(
        "customer copy",
        `${where} shows notes meant for developers:\n  ${notes.map((h) => `${h.label}: …${h.context}…`).join("\n  ")}`,
      );
    }
  }
  return text;
}

/** Images and media the page loads from a host that is not the preview's own. */
function watchForeignMedia(page: Page, into: Set<string>): void {
  page.on("request", (request) => {
    if (!["image", "media"].includes(request.resourceType())) return;
    let url: URL;
    try {
      url = new URL(request.url());
    } catch {
      return;
    }
    if (url.protocol === "data:" || url.protocol === "blob:") return;
    if (!LOCAL_HOSTS.has(url.hostname)) into.add(`${url.host} (${page.url()})`);
  });
}

/** Dismisses the cookie banner so screenshots show the page, when it is there. */
async function dismissCookieBanner(page: Page): Promise<void> {
  const button = page.getByRole("button", { name: /essential only/i });
  if (await button.isVisible().catch(() => false)) {
    await button.click().catch(() => undefined);
    await page.waitForTimeout(300);
  }
}

/**
 * Nebutra's own icon files, as this checkout has them. A scaffold's served
 * icons are its brand's (brand:apply generates them); byte-equal to one of
 * these means the customer's browser tab shows Nebutra's mark.
 */
function nebutraIconBytes(): Map<string, string> {
  const files = [
    "apps/landing/src/app/icon.svg",
    "apps/landing/src/app/favicon.ico",
    ...[
      "favicon.ico",
      "favicon.svg",
      "apple-touch-icon.png",
      "android-chrome-192x192.png",
      "android-chrome-512x512.png",
    ].flatMap((f) => [
      `apps/landing/public/${f}`,
      `apps/web/public/${f}`,
      `packages/design/brand/assets/favicon/${f}`,
    ]),
  ];
  const bytes = new Map<string, string>();
  for (const rel of files) {
    const abs = path.join(ROOT, rel);
    if (fs.existsSync(abs)) bytes.set(fs.readFileSync(abs).toString("base64"), rel);
  }
  return bytes;
}

/**
 * Every icon a page declares (link rel=icon / apple-touch-icon, the web
 * manifest's icons) plus /favicon.ico: each must answer with an image and
 * none may be Nebutra's.
 */
async function expectBrandIcons(page: Page, origin: string, where: string): Promise<string[]> {
  const hrefs = await page.evaluate(() => {
    const out: string[] = [];
    for (const link of Array.from(document.querySelectorAll("link[rel]"))) {
      const rel = link.getAttribute("rel") ?? "";
      if (/(^|\s)(icon|apple-touch-icon|shortcut)(\s|$)/.test(rel)) {
        out.push((link as HTMLLinkElement).href);
      }
    }
    const manifest = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    return { icons: out, manifest: manifest?.href ?? null };
  });
  const urls = new Set<string>([...hrefs.icons, `${origin}/favicon.ico`]);
  if (hrefs.manifest) {
    const res = await fetch(hrefs.manifest).catch(() => null);
    const json = res?.ok
      ? ((await res.json().catch(() => null)) as { icons?: { src: string }[] } | null)
      : null;
    for (const icon of json?.icons ?? []) urls.add(new URL(icon.src, hrefs.manifest).href);
  }
  const nebutra = nebutraIconBytes();
  const checked: string[] = [];
  for (const url of urls) {
    const res = await fetch(url, { signal: AbortSignal.timeout(60_000) }).catch(() => null);
    if (!res?.ok) {
      throw new GateError("icons", `${where}: ${url} answered ${res?.status ?? "nothing"}`);
    }
    const type = res.headers.get("content-type") ?? "";
    if (!/^image\/|icon/.test(type)) {
      throw new GateError("icons", `${where}: ${url} is ${type || "untyped"}, not an image`);
    }
    const body = Buffer.from(await res.arrayBuffer());
    const same = nebutra.get(body.toString("base64"));
    if (same) {
      throw new GateError("icons", `${where}: ${url} is Nebutra's icon (${same})`);
    }
    if (/svg/.test(type) && /aria-label="Nebutra"|Nebutra/i.test(body.toString("utf8"))) {
      throw new GateError("icons", `${where}: ${url} is labelled Nebutra`);
    }
    checked.push(new URL(url).pathname);
  }
  return checked;
}

async function browserChecks(
  browser: Browser,
  webUrl: string,
  siteUrl: string | null,
  outDir: string,
): Promise<string[]> {
  const shots: string[] = [];
  const shot = async (page: Page, name: string, fullPage = true) => {
    const file = path.join(outDir, `${name}.png`);
    await page.screenshot({ path: file, fullPage });
    shots.push(file);
  };
  const origins = [webUrl, ...(siteUrl ? [siteUrl] : [])];
  const desktop = { width: 1440, height: 900 };
  const foreignMedia = new Set<string>();

  // -- welcome, light, desktop: / → /welcome, the project's name, no Nebutra
  const light = await browser.newContext({ viewport: desktop, colorScheme: "light" });
  const lightWatch = watch(light, origins);
  const page = await light.newPage();
  watchForeignMedia(page, foreignMedia);
  const firstLoad = Date.now();
  await page.goto(`${webUrl}/`, { waitUntil: "domcontentloaded", timeout: 180_000 });
  await page
    .waitForURL((url) => url.pathname === "/welcome", { timeout: 60_000 })
    .catch(() => undefined);
  await page
    .getByRole("heading", { level: 1 })
    .waitFor({ timeout: 60_000 })
    .catch(() => undefined);
  timings["browser: / → welcome rendered"] = Date.now() - firstLoad;
  await settle(page);
  if (new URL(page.url()).pathname !== "/welcome") {
    throw new GateError("welcome", `/ landed on ${page.url()}, expected /welcome`);
  }
  await page.getByRole("heading", { level: 1 }).waitFor({ timeout: 30_000 });
  const h1 = await page.getByRole("heading", { level: 1 }).innerText();
  if (!h1.includes(BRAND)) {
    throw new GateError("welcome", `the welcome headline reads "${h1}", expected "${BRAND}"`);
  }
  await expectCustomerCopy(page, "/welcome");
  const appIcons = await expectBrandIcons(page, webUrl, "the product app");
  log(`icons (product app): ${appIcons.join(", ")}`);
  await shot(page, "welcome-light-desktop");

  // -- sign-in page, signed out
  const signInPage = await light.newPage();
  await signInPage.goto(`${webUrl}/sign-in`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await settle(signInPage);
  await expectCustomerCopy(signInPage, "/sign-in", { developerNotes: true });
  await signInPage.close();

  // -- the one-click demo sign-in → signed in
  const signIn = page.getByRole("button", { name: /sign in with the demo account/i });
  await signIn.waitFor({ timeout: 30_000 });
  const signInStarted = Date.now();
  await Promise.all([
    page.waitForURL(/\/welcome/, { waitUntil: "load", timeout: 60_000 }),
    signIn.click(),
  ]);
  await settle(page);
  try {
    await page.getByText(/Signed in as /).waitFor({ timeout: 30_000 });
  } catch {
    const shown = await page.locator("[role=alert]").allInnerTexts();
    throw new GateError(
      "sign-in",
      `the demo sign-in did not sign in${shown.length ? `: ${shown.join(" ")}` : ""}`,
    );
  }
  timings["browser: demo sign-in"] = Date.now() - signInStarted;
  await expectCustomerCopy(page, "/welcome (signed in)");
  const nav = await page.getByRole("navigation", { name: "Product" }).innerText();
  if (/Startup\s?OS/i.test(nav)) {
    throw new GateError("app nav", `the signed-in navigation offers Nebutra's product: ${nav}`);
  }
  await shot(page, "signed-in-desktop");

  // -- settings, signed in: the demo account's own details, every tab customer copy
  await page.getByRole("link", { name: /open your workspace/i }).click();
  await page.waitForURL(/\/settings/, { timeout: 30_000 });
  await page.getByRole("heading", { name: "Settings" }).waitFor({ timeout: 30_000 });
  await settle(page);
  try {
    await page.getByText(DEMO_EMAIL).first().waitFor({ timeout: 30_000 });
  } catch {
    throw new GateError("settings", `the profile does not show the signed-in email ${DEMO_EMAIL}`);
  }
  await expectCustomerCopy(page, "/settings (profile)", { developerNotes: true });
  const devtools = await page.evaluate(
    () => document.querySelectorAll('[class*="tsqd"], .TanStackRouterDevtools').length,
  );
  if (devtools > 0) {
    throw new GateError("settings", "a developer tools widget floats over the product app");
  }
  await shot(page, "settings-profile-desktop");
  const tabs = page.getByRole("tab");
  const tabCount = await tabs.count();
  for (let i = 0; i < tabCount; i++) {
    const tab = tabs.nth(i);
    const name = (await tab.innerText()).trim();
    await tab.click();
    await page.waitForTimeout(600);
    await settle(page);
    await expectCustomerCopy(page, `/settings (${name})`, { developerNotes: true });
  }
  for (const route of ["/billing", "/startup-os"]) {
    await page.goto(`${webUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await settle(page);
    await expectCustomerCopy(page, route, { developerNotes: true });
  }
  await light.close();

  // -- welcome, dark, desktop
  const dark = await browser.newContext({ viewport: desktop, colorScheme: "dark" });
  const darkWatch = watch(dark, origins);
  const darkPage = await dark.newPage();
  await darkPage.goto(`${webUrl}/welcome`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await settle(darkPage);
  await darkPage.getByRole("heading", { level: 1 }).waitFor({ timeout: 30_000 });
  const isDark = await darkPage.evaluate(() => document.documentElement.classList.contains("dark"));
  if (!isDark) throw new GateError("welcome", "a dark-mode system does not get the dark theme");
  await shot(darkPage, "welcome-dark-desktop");
  await dark.close();

  // -- welcome, mobile
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    colorScheme: "light",
  });
  const mobileWatch = watch(mobile, origins);
  const mobilePage = await mobile.newPage();
  await mobilePage.goto(`${webUrl}/welcome`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await settle(mobilePage);
  await mobilePage.getByRole("heading", { level: 1 }).waitFor({ timeout: 30_000 });
  const overflow = await mobilePage.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  if (overflow > 1) {
    throw new GateError("welcome", `the mobile welcome page scrolls sideways by ${overflow}px`);
  }
  await shot(mobilePage, "welcome-mobile");
  await mobile.close();

  // -- the site: server-rendered HTML with real text, then every page it serves
  if (!siteUrl) throw new GateError("site", "pnpm dev did not print the site's URL");
  const started = Date.now();
  const response = await fetch(`${siteUrl}/`, { signal: AbortSignal.timeout(180_000) });
  const html = await response.text();
  timings["site: / server HTML"] = Date.now() - started;
  if (!response.ok) throw new GateError("site", `the site's / answered ${response.status}`);
  const serverText = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!/<h1[\s>]/i.test(html) || serverText.length < 400) {
    throw new GateError(
      "site",
      `the site's / has no server-rendered content (${serverText.length} chars of text)`,
    );
  }
  if (!serverText.includes(BRAND)) {
    throw new GateError("site", `the site's server HTML does not name "${BRAND}"`);
  }

  const site = await browser.newContext({ viewport: desktop, colorScheme: "light" });
  const siteWatch = watch(site, origins);
  const sitePage = await site.newPage();
  watchForeignMedia(sitePage, foreignMedia);
  const crawlStarted = Date.now();

  // The template's pages, as site-map.ts marks them; a dynamic route is
  // visited through the first link to it the other pages show.
  const templatePages = SITE_MAP.filter((p) => p.template && p.status === "live");
  const staticPaths = templatePages.filter((p) => !p.path.includes("[")).map((p) => p.path);
  const dynamic = templatePages
    .filter((p) => p.path.includes("["))
    .map((p) => ({
      path: p.path,
      re: new RegExp(`^${p.path.replace(/\[[^\]]+\]/g, "[^/]+")}/?$`),
      found: null as string | null,
    }));
  const queue = [...staticPaths, "/zh-Hans", "/zh-Hans/pricing"];
  const visited: string[] = [];
  for (let i = 0; i < queue.length; i++) {
    const route = queue[i] as string;
    const res = await sitePage.goto(`${siteUrl}${route}`, {
      waitUntil: "domcontentloaded",
      timeout: 180_000,
    });
    if (!res || res.status() >= 400) {
      throw new GateError("site", `the site's ${route} answered ${res?.status() ?? "nothing"}`);
    }
    await settle(sitePage);
    await expectCustomerCopy(sitePage, `the site's ${route}`);
    visited.push(route);
    const hrefs = await sitePage.evaluate(() =>
      Array.from(document.querySelectorAll("a[href]")).map((a) => a.getAttribute("href") ?? ""),
    );
    for (const d of dynamic) {
      if (d.found) continue;
      const hit = hrefs.find((h) => h.startsWith("/") && d.re.test(h.split(/[?#]/)[0] ?? ""));
      if (hit) {
        d.found = hit;
        queue.push(hit);
      }
    }
    if (route === "/") {
      const siteIcons = await expectBrandIcons(sitePage, siteUrl, "the site");
      log(`icons (site): ${siteIcons.join(", ")}`);
      await dismissCookieBanner(sitePage);
      await sitePage.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await sitePage.waitForTimeout(800);
      await sitePage.evaluate(() => window.scrollTo(0, 0));
      await shot(sitePage, "site-desktop");
      const pricing = sitePage.locator("#pricing");
      await pricing.scrollIntoViewIfNeeded();
      await sitePage.waitForTimeout(600);
      const file = path.join(outDir, "site-pricing.png");
      await pricing.screenshot({ path: file });
      shots.push(file);
    }
  }
  timings["site: every template page"] = Date.now() - crawlStarted;
  log(`site pages checked: ${visited.join(" ")}`);
  const unvisited = dynamic.filter((d) => !d.found).map((d) => d.path);
  if (unvisited.length > 0) log(`site: no link to ${unvisited.join(", ")} on the pages above`);
  await site.close();

  // -- the site on a phone
  const siteMobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    colorScheme: "light",
  });
  const siteMobileWatch = watch(siteMobile, origins);
  const siteMobilePage = await siteMobile.newPage();
  watchForeignMedia(siteMobilePage, foreignMedia);
  await siteMobilePage.goto(`${siteUrl}/`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await settle(siteMobilePage);
  const siteOverflow = await siteMobilePage.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  if (siteOverflow > 1) {
    throw new GateError("site", `the site on a phone scrolls sideways by ${siteOverflow}px`);
  }
  await dismissCookieBanner(siteMobilePage);
  await siteMobilePage.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await siteMobilePage.waitForTimeout(800);
  await siteMobilePage.evaluate(() => window.scrollTo(0, 0));
  await shot(siteMobilePage, "site-mobile");
  await siteMobile.close();

  if (foreignMedia.size > 0) {
    throw new GateError(
      "third-party media",
      `pages load images or media from other hosts:\n  ${[...foreignMedia].slice(0, 15).join("\n  ")}`,
    );
  }

  const problems = [
    ...lightWatch.problems,
    ...darkWatch.problems,
    ...mobileWatch.problems,
    ...siteWatch.problems,
    ...siteMobileWatch.problems,
  ];
  if (problems.length > 0) {
    throw new GateError(
      "browser",
      `errors while walking the preview:\n  ${[...new Set(problems)].slice(0, 25).join("\n  ")}`,
    );
  }
  return shots;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = parseArgs();
  const outDir = args.out;
  fs.rmSync(outDir, { recursive: true, force: true });
  const logs = path.join(outDir, "logs");
  fs.mkdirSync(logs, { recursive: true });

  if (args.attach) {
    const { chromium } = await import("playwright");
    const browser = await chromium.launch();
    try {
      const shots = await browserChecks(browser, args.attach[0], args.attach[1], outDir);
      process.stdout.write(`\n✓ browser checks OK\n    ${shots.join("\n    ")}\n`);
    } catch (error) {
      const step = error instanceof GateError ? error.step : "unexpected";
      process.stderr.write(
        `\n✘ browser checks FAILED at "${step}": ${String((error as Error).message)}\n`,
      );
      process.exitCode = 1;
    } finally {
      await browser.close();
    }
    return;
  }

  // realpath: macOS's tmpdir is a symlink, and the process scan in teardown
  // matches the path the children actually run under.
  const tempDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "sailor-customer-path-")));
  if (tempDir.startsWith(`${ROOT}${path.sep}`)) {
    throw new GateError("setup", `temp dir ${tempDir} is inside the repo`);
  }
  const templateDir = path.join(tempDir, "template");
  const projectDir = path.join(tempDir, PROJECT);
  log(`temp dir: ${tempDir}`);
  log(`output:   ${outDir}`);

  const gateStarted = Date.now();
  let dev: DevServer | null = null;
  let browser: Browser | null = null;
  let failure: GateError | null = null;
  let shots: string[] = [];

  try {
    await runStep("template:build", "pnpm", ["template:build", `--out=${templateDir}`], {
      cwd: ROOT,
      logFile: path.join(logs, "template-build.log"),
    });

    // `create-sailor...` builds the workspace packages it bundles first (brand,
    // tokens, preset): on a clean CI checkout they have no dist yet, and tsup
    // cannot resolve their subpath exports without it.
    await runStep("create-sailor build", "pnpm", ["--filter", "create-sailor...", "build"], {
      cwd: ROOT,
      logFile: path.join(logs, "create-sailor-build.log"),
    });

    // create-sailor --json reports each step as it goes; time install and
    // brand from its events, and fail on either going wrong.
    const events: Array<Record<string, unknown>> = [];
    const stepStart: Record<string, number> = {};
    await runStep(
      "scaffold",
      process.execPath,
      [path.join(ROOT, "packages/ops/create-sailor/dist/index.js"), PROJECT, "--yes", "--json"],
      {
        cwd: tempDir,
        env: {
          ...process.env,
          SAILOR_TEMPLATE_LOCAL_DIR: templateDir,
          NEBUTRA_TELEMETRY: "0",
          NO_UPDATE_NOTIFIER: "1",
          npm_config_user_agent: "pnpm",
        },
        logFile: path.join(logs, "scaffold.log"),
        onLine: (line) => {
          let event: Record<string, unknown>;
          try {
            event = JSON.parse(line);
          } catch {
            return;
          }
          events.push(event);
          const step = typeof event.step === "string" ? event.step : null;
          if (!step) return;
          if (event.status === "start" && !(step in stepStart)) stepStart[step] = Date.now();
          if (
            event.status !== "start" &&
            step in stepStart &&
            (step === "install" || step === "brand")
          ) {
            timings[`scaffold: ${step}`] = Date.now() - (stepStart[step] as number);
          }
        },
      },
    );
    const failed = events.find(
      (e) => e.event === "error" || (e.step === "install" && e.status === "error"),
    );
    if (failed) throw new GateError("scaffold", `create-sailor reported ${JSON.stringify(failed)}`);
    const brand = events.find((e) => e.step === "brand" && e.status !== "start");
    if (!brand || brand.status !== "ok" || brand.name !== BRAND) {
      throw new GateError(
        "scaffold",
        `the brand step did not set "${BRAND}": ${JSON.stringify(brand ?? "no brand event")}`,
      );
    }

    dev = await startDev(projectDir, path.join(logs, "dev.log"));
    log(
      `dev: web ${dev.webUrl}, site ${dev.siteUrl ?? "?"} (${seconds(timings["dev→ready"] ?? 0)})`,
    );

    const { chromium } = await import("playwright");
    browser = await chromium.launch();
    const browserStarted = Date.now();
    shots = await browserChecks(browser, dev.webUrl, dev.siteUrl, outDir);
    timings["browser checks"] = Date.now() - browserStarted;
  } catch (error) {
    failure =
      error instanceof GateError
        ? error
        : new GateError(
            "unexpected",
            error instanceof Error ? (error.stack ?? error.message) : String(error),
          );
  } finally {
    await browser?.close().catch(() => undefined);
    log("teardown: stopping the preview");
    await teardown(dev?.child ?? null, tempDir);
    if (args.keep) log(`kept: ${tempDir}`);
    else fs.rmSync(tempDir, { recursive: true, force: true });
  }

  timings.total = Date.now() - gateStarted;
  const report = {
    ok: failure === null,
    failedStep: failure?.step ?? null,
    error: failure?.message ?? null,
    brand: BRAND,
    timingsMs: timings,
    screenshots: shots.map((s) => path.relative(outDir, s)),
    platform: `${process.platform}-${process.arch} node ${process.version}`,
  };
  fs.writeFileSync(path.join(outDir, "timings.json"), `${JSON.stringify(report, null, 2)}\n`);

  process.stdout.write("\n  Customer path timings\n");
  for (const [key, ms] of Object.entries(timings)) {
    process.stdout.write(`    ${key.padEnd(32)} ${seconds(ms)}\n`);
  }
  if (shots.length) {
    process.stdout.write("\n  Screenshots\n");
    for (const s of shots) process.stdout.write(`    ${s}\n`);
  }
  if (failure) {
    process.stderr.write(`\n✘ customer path FAILED at "${failure.step}": ${failure.message}\n`);
    process.exit(1);
  }
  process.stdout.write("\n✓ customer path OK\n");
}

main().catch((error) => {
  process.stderr.write(
    `\n✘ customer path FAILED: ${error instanceof Error ? error.stack : error}\n`,
  );
  process.exit(1);
});
