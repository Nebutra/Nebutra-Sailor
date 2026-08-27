#!/usr/bin/env node
/**
 * Measure the contrast of TEXT AS RENDERED, against the background it actually
 * lands on, across every route and both modes.
 *
 * This is not the same check as the token contrast table the site already
 * shows. That one measures the pairings the token source DECLARES. This one
 * measures what a reader sees: the colour a rule finally computed, over the
 * nearest ancestor that painted a background. A token pairing can pass while a
 * component puts that foreground on some other surface entirely.
 *
 * Run against a BUILT site, not a dev server — dev pages here never hydrate,
 * because the HMR websocket cannot connect in this environment:
 *   pnpm --filter @nebutra/design build && pnpm --filter @nebutra/design start
 *   node apps/design/scripts/audit-rendered-contrast.mjs
 *
 * Colour conversion goes through a canvas rather than a regex. The stylesheet
 * computes to oklab()/oklch() in places, and pulling the first three numbers out
 * of `oklab(0.999 0.00004 0.00002 / 0.85)` yields a luminance near zero — which
 * reported the site title at 1.17:1 when it renders at roughly 17:1. Every
 * figure that harness produced was wrong in the same direction, which is worse
 * than not measuring: it invents defects and hides real ones. Let the browser
 * do the conversion.
 */

import { chromium } from "playwright";

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
const base = process.env.DESIGN_URL || "http://127.0.0.1:3109";
const routes = [
  "/",
  "/tokens",
  "/tokens/type",
  "/tokens/motion",
  "/tokens/layers",
  "/tokens/traps",
  "/tokens/switchability",
  "/components",
  "/tokens/shape",
  "/tokens/elevation",
];
const bad = [];
for (const r of routes)
  for (const dark of [false, true]) {
    await p.goto(base + r, { waitUntil: "load", timeout: 120000 });
    await p.evaluate((d) => document.documentElement.classList.toggle("dark", d), dark);
    await p.waitForTimeout(400);
    const rows = await p.evaluate(() => {
      // Let the browser do colour-space conversion: canvas fillStyle normalises
      // oklab/oklch/color() to sRGB, which a regex over the string cannot.
      const cv = document.createElement("canvas");
      cv.width = cv.height = 1;
      const cx = cv.getContext("2d", { willReadFrequently: true });
      function srgb(c) {
        cx.clearRect(0, 0, 1, 1);
        cx.fillStyle = "#000";
        cx.fillStyle = c;
        cx.fillRect(0, 0, 1, 1);
        const d = cx.getImageData(0, 0, 1, 1).data;
        return [d[0], d[1], d[2], d[3] / 255];
      }
      function bgOf(e) {
        let n = e;
        while (n) {
          const c = getComputedStyle(n).backgroundColor;
          if (c && c !== "rgba(0, 0, 0, 0)" && c !== "transparent") {
            const v = srgb(c);
            if (v[3] > 0.5) return v;
          }
          n = n.parentElement;
        }
        return srgb(getComputedStyle(document.body).backgroundColor);
      }
      const L = ([r, g, b]) => {
        const f = (v) => {
          v /= 255;
          return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
        };
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      };
      return [...document.querySelectorAll("p,li,td,th,dd,dt,span,a,h1,h2,h3,code")]
        .filter(
          (e) =>
            e.children.length === 0 &&
            (e.textContent || "").trim().length > 3 &&
            e.getBoundingClientRect().width > 0,
        )
        .slice(0, 400)
        .map((e) => {
          const s = getComputedStyle(e);
          const fg = srgb(s.color),
            bg = bgOf(e);
          const a = L(fg),
            c = L(bg);
          return {
            ratio: (Math.max(a, c) + 0.05) / (Math.min(a, c) + 0.05),
            size: parseFloat(s.fontSize),
            weight: +s.fontWeight,
            t: (e.textContent || "").trim().slice(0, 36),
          };
        });
    });
    for (const row of rows) {
      const large = row.size >= 24 || (row.size >= 18.66 && row.weight >= 700);
      const bar = large ? 3 : 4.5;
      if (row.ratio < bar - 0.01)
        bad.push({ r, mode: dark ? "dark" : "light", ratio: row.ratio.toFixed(2), bar, ...row });
    }
  }
if (!bad.length)
  process.stdout.write("PASS — no text below its WCAG AA bar across 10 routes x 2 modes\n");
else {
  const seen = new Set();
  for (const x of bad.sort((a, b) => a.ratio - b.ratio)) {
    const k = x.t + x.mode + x.r;
    if (seen.has(k)) continue;
    seen.add(k);
    process.stdout.write(
      `${x.ratio}:1 (need ${x.bar}) ${x.mode.padEnd(5)} ${x.r.padEnd(24)} ${x.size}px "${x.t}"\n`,
    );
  }
  process.stdout.write(`distinct: ${seen.size}\n`);
}
await b.close();
process.exit(bad.length ? 1 : 0);
