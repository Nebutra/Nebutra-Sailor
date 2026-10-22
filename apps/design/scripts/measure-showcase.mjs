#!/usr/bin/env node
/**
 * Measure every showcase demo at 1:1 and write the table that bands the cards.
 *
 *   node apps/design/scripts/measure-showcase.mjs
 *
 * Needs the dev server (`/showcase/probe` is development-only) and a Chromium
 * that matches the installed Playwright; set CHROMIUM_PATH when the default
 * download is not the one on the machine.
 *
 * What is measured is the width a demo needs and the height it paints at. It is
 * laid out in a 560px column, then the column is narrowed until the demo would
 * wrap or grow taller; the last width that held its shape is its width. That is
 * neither the box's own width (a `w-full` demo would always read 560) nor
 * `max-content` (which collapses rows of truncating labels), and it includes
 * the demo's own padding. A card is then sized to it, never scaled.
 *
 * Re-run it when a demo is added or changes shape. A demo missing from the table
 * is not guessed at: its card is an entry card until it is measured.
 */

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const base = process.env.DESIGN_URL || "http://localhost:3109";
const out = fileURLToPath(new URL("../src/lib/showcase-sizes.generated.json", import.meta.url));

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto(`${base}/showcase/probe`, { waitUntil: "networkidle", timeout: 120_000 });
// Demos are separate chunks; wait until the placeholders are gone.
await page
  .waitForFunction(() => !document.querySelector("[data-probe] .animate-pulse"), null, {
    timeout: 120_000,
  })
  .catch(() => {});
await page.waitForTimeout(1500);

const result = await page.evaluate(() => {
  /** Union of everything the demo paints: text, backgrounds, borders, shadows. */
  function painted(root) {
    let left = Infinity;
    let right = -Infinity;
    let top = Infinity;
    let bottom = -Infinity;
    for (const el of root.querySelectorAll("*")) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") continue;
      const ownText = [...el.childNodes].some(
        (n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim(),
      );
      const paints =
        el.childElementCount === 0 ||
        ownText ||
        cs.backgroundColor !== "rgba(0, 0, 0, 0)" ||
        cs.borderTopWidth !== "0px" ||
        cs.boxShadow !== "none";
      if (!paints) continue;
      left = Math.min(left, r.left);
      right = Math.max(right, r.right);
      top = Math.min(top, r.top);
      bottom = Math.max(bottom, r.bottom);
    }
    if (!Number.isFinite(left)) return null;
    return { w: right - left, h: bottom - top };
  }

  const sizes = {};
  const failed = [];
  for (const root of document.querySelectorAll("[data-probe]")) {
    const id = root.getAttribute("data-probe");
    if (root.textContent?.includes("failed to render")) {
      failed.push(id);
      continue;
    }
    root.style.width = "560px";
    const base = painted(root);
    if (!base) {
      failed.push(id);
      continue;
    }
    // The painted box is not the width a demo needs: a demo with its own padding
    // paints narrower than it lays out. So narrow the column until the demo
    // would wrap or grow taller, and take the last width that held its shape.
    let need = 560;
    for (let width = Math.max(40, Math.floor(base.w)); width <= 560; width += 8) {
      root.style.width = `${width}px`;
      const m = painted(root);
      if (m && m.h <= base.h + 1 && m.w <= width + 1) {
        need = width;
        break;
      }
    }
    root.style.width = "560px";
    sizes[id] = {
      w: Math.ceil(Math.max(need, base.w <= need ? base.w : need)),
      h: Math.ceil(base.h),
    };
  }
  return { sizes, failed };
});

await browser.close();

const sorted = Object.fromEntries(
  Object.entries(result.sizes).sort(([a], [b]) => a.localeCompare(b)),
);
writeFileSync(out, `${JSON.stringify(sorted, null, 2)}\n`);
process.stdout.write(`measured ${Object.keys(sorted).length} demos -> ${out}\n`);
if (result.failed.length)
  process.stdout.write(`not measured (failed or empty): ${result.failed.join(", ")}\n`);
