#!/usr/bin/env node
/**
 * Stacking is chosen by role, not by number.
 *
 * core.json:layer is the one ladder (sticky 20 … panel 200, overlays
 * 1040–1070, devtools 9999). A hand-picked z-[150] has no defined place on it:
 * it silently sits above one app's toolbar and below another's, and the
 * overlay tier stops being a guarantee. Local layering inside a component
 * (z-10, z-20) is fine; anything at 50 or above must be a role:
 * z-[var(--layer-banner)], zIndex: "var(--layer-panel)", or overlayZIndex.*.
 * Exempt a line with `// allow-z-index: <reason>` above it.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const SKIP_DIR =
  /(^|\/)(node_modules|dist|build|\.next|\.open-next|storybook-static|__tests__|coverage)(\/|$)/;
const SKIP_FILE = /(\.stories\.|\.test\.|\.spec\.|theming-demos\.tsx$)/;
const LITERAL = [/(?<![\w-])-?z-\[(\d+)\]/g, /zIndex:\s*(\d+)/g, /z-index:\s*(\d+)/g];

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (SKIP_DIR.test(relative(ROOT, p))) continue;
    if (statSync(p).isDirectory()) yield* files(p);
    else if (/\.(tsx|ts|jsx|css)$/.test(name) && !SKIP_FILE.test(name)) yield p;
  }
}

const found = [];
for (const base of ["apps", "packages"]) {
  for (const file of files(join(ROOT, base))) {
    const rel = relative(ROOT, file);
    if (rel.endsWith("tokens/components/overlay.ts") || rel.startsWith("packages/design/tokens/"))
      continue;
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      if (/allow-z-index:/.test(lines[i - 1] ?? "")) return;
      for (const re of LITERAL) {
        for (const m of line.matchAll(re))
          if (Number(m[1]) >= 50) found.push(`${rel}:${i + 1}  ${m[0]}`);
      }
    });
  }
}
if (found.length) {
  console.error("❌ z-index of 50+ written as a number — use a core.json:layer role:");
  for (const f of found) console.error(`   ${f}`);
  process.exit(1);
}
console.log("✓ z-index: every layer at 50+ is a role.");
