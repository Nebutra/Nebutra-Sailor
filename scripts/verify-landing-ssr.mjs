#!/usr/bin/env node
/**
 * verify-landing-ssr — the marketing site must be readable without JavaScript.
 *
 * AI crawlers (GPTBot, ClaudeBot, PerplexityBot) and most HTML-to-text
 * extractors do not execute JavaScript and drop elements carrying the `hidden`
 * attribute. React 19 streams a completed <Suspense> boundary *out of line* once
 * the document passes ~12.8 KB (`progressiveChunkSize`): the fallback stays in
 * place and the real content arrives in `<div hidden id="S:n">`, moved into
 * position by an inline `$RC` script. To such a client the page is its fallback
 * — "Loading…" — even though the HTML "contains" the text.
 *
 * This script requests each public route of a built landing app, removes what a
 * no-JS reader never sees (script, style, template, noscript, [hidden]), and
 * asserts that what remains is the page: its h1, a known sentence, no loading
 * fallback, and the head a search or answer engine needs (title, description,
 * canonical, JSON-LD where promised).
 *
 * Usage:
 *   node scripts/verify-landing-ssr.mjs                 # starts `next start` on a free port
 *   node scripts/verify-landing-ssr.mjs --base-url=http://127.0.0.1:3000
 *   node scripts/verify-landing-ssr.mjs --print         # also print each page's visible text
 *
 * Requires a production build (`apps/landing/.next/BUILD_ID`).
 */

import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APP_DIR = path.join(ROOT, "apps/landing");
const UA = "Mozilla/5.0 (compatible; GPTBot/1.2; +https://openai.com/gptbot)";

/**
 * Which site this checkout builds: "nebutra" (the upstream site) or "template" (the
 * Sailor scaffold, whose home and frame are the `*.for-template.*` variants).
 */
function readSiteId() {
  const source = readFileSync(path.join(APP_DIR, "src/site.config.ts"), "utf8");
  return /SITE_ID\s*=\s*"(\w+)"/.exec(source)?.[1] ?? "template";
}

/**
 * Each public route and what a reader without JavaScript must find on it.
 * `text`: phrases that must appear in the visible (non-hidden) body text.
 * `jsonLd`: schema.org @types that must be present in the initial HTML.
 * `nebutra: true` routes exist only on the upstream site (site-map.ts `template:
 * false`); their copy markers are Nebutra's. Every route also gets the generic
 * checks: a visible h1 and <main>, no loading fallback, title, description,
 * canonical. Markers are content that ships in the repo, not CMS data, so the
 * check does not depend on the CMS being reachable from CI.
 */
const NEBUTRA_ROUTES = [
  {
    path: "/",
    h1: "No company should be hard to start",
    text: ["Founder Tax", "Read it as it's written.", "What we're building"],
    jsonLd: ["Organization", "WebSite", "SoftwareApplication"],
  },
  {
    path: "/zh-Hans",
    // The Chinese home leads in Chinese since the site gained 中文 (#700).
    h1: "让世界上没有难创的业",
    text: [],
    jsonLd: ["Organization", "WebSite"],
  },
  {
    path: "/sailor",
    h1: "Sailor",
    text: ["The open-source platform we build everything on", "npx create-sailor"],
  },
  { path: "/ja/sailor", h1: "Sailor", text: ["npx create-sailor"] },
  { path: "/about", text: [] },
  { path: "/building", text: [] },
  { path: "/licensing", text: [] },
  { path: "/careers", text: [] },
  { path: "/solutions", text: [] },
  { path: "/open", text: [] },
];

const TEMPLATE_ROUTES = [
  { path: "/", text: [], jsonLd: ["Organization", "WebSite", "SoftwareApplication"] },
  { path: "/zh-Hans", text: [], jsonLd: ["Organization", "WebSite"] },
];

/** Routes both sites ship (site-map.ts `template: true`). */
const SHARED_ROUTES = [
  { path: "/pricing", text: [], jsonLd: ["Organization", "FAQPage"], pricing: true },
  { path: "/zh-Hans/pricing", text: [], pricing: true },
  { path: "/security", text: [] },
  { path: "/faq", text: [], jsonLd: ["FAQPage"] },
  { path: "/privacy", text: [] },
  { path: "/terms", text: [] },
  { path: "/blog", text: [] },
  { path: "/news", text: [] },
  { path: "/changelog", text: [] },
  { path: "/roadmap", text: [] },
  { path: "/refer", text: [] },
  { path: "/features", text: [] },
  { path: "/features/gateway", text: [] },
  // Not prebuilt (only the default locale is): rendered on demand as a
  // blocking route, which must be as readable as the prerendered one.
  { path: "/de/features/gateway", text: [] },
  { path: "/de/changelog/1.7", text: [] },
];

function routesFor(siteId) {
  return [...(siteId === "nebutra" ? NEBUTRA_ROUTES : TEMPLATE_ROUTES), ...SHARED_ROUTES];
}

/** Fallback copy a reader must never be left with. */
const FALLBACK_PATTERNS = [/Loading…/, /Loading\.\.\./];

function parseArgs(argv) {
  const args = { baseUrl: null, print: false, only: null };
  for (const arg of argv) {
    if (arg.startsWith("--base-url=")) args.baseUrl = arg.slice("--base-url=".length);
    else if (arg === "--print") args.print = true;
    else if (arg.startsWith("--only=")) args.only = arg.slice("--only=".length).split(",");
  }
  return args;
}

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

async function startServer() {
  if (!existsSync(path.join(APP_DIR, ".next/BUILD_ID"))) {
    throw new Error("apps/landing has no production build (.next/BUILD_ID). Run its build first.");
  }
  const port = await freePort();
  const nextBin = path.join(APP_DIR, "node_modules/next/dist/bin/next");
  const child = spawn(process.execPath, [nextBin, "start", "-p", String(port)], {
    cwd: APP_DIR,
    env: { ...process.env, NODE_ENV: "production", PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let log = "";
  child.stdout.on("data", (d) => {
    log += d;
  });
  child.stderr.on("data", (d) => {
    log += d;
  });
  const baseUrl = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`next start exited early:\n${log}`);
    try {
      const res = await fetch(`${baseUrl}/robots.txt`);
      if (res.ok) return { baseUrl, stop: () => child.kill("SIGTERM") };
    } catch {
      // not listening yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  child.kill("SIGTERM");
  throw new Error(`next start did not answer within 60s:\n${log}`);
}

/** What a client that runs no JavaScript and honours `hidden` renders. */
export function visibleDocument(html) {
  const dom = new JSDOM(html);
  const { document } = dom.window;
  for (const el of document.querySelectorAll("script, style, template, noscript, [hidden]")) {
    el.remove();
  }
  return document;
}

function normalize(text) {
  return text.replace(/\s+/g, " ").trim();
}

function jsonLdTypes(html) {
  const types = new Set();
  const dom = new JSDOM(html);
  for (const node of dom.window.document.querySelectorAll('script[type="application/ld+json"]')) {
    let data;
    try {
      data = JSON.parse(node.textContent ?? "");
    } catch {
      types.add("<invalid JSON-LD>");
      continue;
    }
    const walk = (v) => {
      if (Array.isArray(v)) {
        for (const item of v) walk(item);
        return;
      }
      if (!v || typeof v !== "object") return;
      for (const t of [v["@type"]].flat()) {
        if (typeof t === "string") types.add(t);
      }
      for (const key of ["@graph", "mainEntity", "itemListElement"]) {
        if (v[key]) walk(v[key]);
      }
    };
    walk(data);
  }
  return types;
}

/**
 * Blog posts come from the CMS, which CI does not reach, so the post checked is
 * whichever the journal index links first — when it links any.
 */
async function discoverBlogPost(baseUrl) {
  const res = await fetch(`${baseUrl}/blog`, { headers: { "user-agent": UA } });
  if (!res.ok) return null;
  const doc = visibleDocument(await res.text());
  for (const a of doc.querySelectorAll('a[href^="/blog/"]')) {
    const href = a.getAttribute("href") ?? "";
    if (/^\/blog\/[a-z0-9-]+$/.test(href)) return href;
  }
  return null;
}

async function checkRoute(baseUrl, route, print) {
  const failures = [];
  const res = await fetch(`${baseUrl}${route.path}`, {
    headers: { "user-agent": UA, accept: "text/html" },
    redirect: "follow",
  });
  if (res.status !== 200) {
    return { route, failures: [`HTTP ${res.status}`], excerpt: "" };
  }
  const html = await res.text();
  const head = new JSDOM(html).window.document;
  const doc = visibleDocument(html);
  const bodyText = normalize(doc.body?.textContent ?? "");

  for (const pattern of FALLBACK_PATTERNS) {
    if (pattern.test(bodyText))
      failures.push(`visible text contains a loading fallback (${pattern})`);
  }
  const h1 = doc.querySelector("h1");
  const h1Text = normalize(h1?.textContent ?? "");
  if (!h1Text) failures.push("no visible <h1>");
  else if (route.h1 && !h1Text.includes(route.h1)) {
    failures.push(`h1 is "${h1Text}", expected it to contain "${route.h1}"`);
  }
  if (!doc.querySelector("main")) failures.push("no visible <main>");
  for (const phrase of route.text) {
    if (!bodyText.includes(phrase)) failures.push(`visible text is missing "${phrase}"`);
  }
  if (route.pricing && !/[$¥€£]\s?\d/.test(bodyText)) {
    failures.push("visible text has no price");
  }
  // Content, not chrome: a page with only the rail and footer is still blank.
  const mainText = normalize(doc.querySelector("main")?.textContent ?? "");
  if (mainText.length < 200) failures.push(`<main> has only ${mainText.length} visible characters`);

  // Head: what a search or answer engine reads before the body.
  const title = normalize(head.querySelector("title")?.textContent ?? "");
  if (!title) failures.push("no <title>");
  const description = head.querySelector('meta[name="description"]')?.getAttribute("content");
  if (!description) failures.push("no meta description");
  const canonical = head.querySelector('link[rel="canonical"]')?.getAttribute("href");
  if (!canonical) failures.push("no canonical link");
  const types = jsonLdTypes(html);
  for (const t of route.jsonLd ?? []) {
    if (!types.has(t)) failures.push(`no ${t} JSON-LD (found: ${[...types].join(", ") || "none"})`);
  }

  if (print) {
    console.log(`\n── ${route.path}  title="${title}" canonical=${canonical}`);
    console.log(`   jsonld: ${[...types].join(", ")}`);
    console.log(`   ${mainText.slice(0, 600)}`);
  }
  return { route, failures, excerpt: mainText.slice(0, 160) };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  let server = null;
  let baseUrl = args.baseUrl;
  if (!baseUrl) {
    server = await startServer();
    baseUrl = server.baseUrl;
  }
  let failed = 0;
  try {
    const siteId = readSiteId();
    const all = routesFor(siteId);
    console.log(`site: ${siteId}, ${baseUrl}`);
    const routes = args.only ? all.filter((r) => args.only.includes(r.path)) : all;
    if (!args.only) {
      const post = await discoverBlogPost(baseUrl);
      if (post) routes.push({ path: post, text: [], jsonLd: ["Article"] });
      else console.log("skip blog post — the journal lists no posts (CMS not configured here)");
    }
    for (const route of routes) {
      const result = await checkRoute(baseUrl, route, args.print);
      if (result.failures.length === 0) {
        console.log(`ok   ${route.path}  ${result.excerpt.slice(0, 90)}`);
      } else {
        failed += 1;
        console.log(`FAIL ${route.path}`);
        for (const f of result.failures) console.log(`     - ${f}`);
      }
    }
  } finally {
    server?.stop();
  }
  if (failed > 0) {
    console.error(
      `\n${failed} landing route(s) are not readable without JavaScript. ` +
        "A <Suspense> boundary around page content is streamed out of line (fallback visible, content in a hidden div) " +
        "once the document passes ~12.8 KB. Keep page content outside <Suspense>; see apps/landing/src/app/[lang]/layout.tsx.",
    );
    process.exit(1);
  }
  console.log("\nAll landing routes render their content without JavaScript.");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
