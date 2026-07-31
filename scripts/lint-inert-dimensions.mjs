#!/usr/bin/env node
/**
 * CI guard: a design-language dimension that nothing reads is not a dimension.
 *
 * A Brand Package at html[data-brand="…"] declares roughly 200 custom properties
 * per language. That number is only meaningful for the properties something
 * actually consumes: Tailwind tree-shakes a theme entry with no reference, and a
 * skin can override a variable forever without a single pixel moving.
 *
 * Measured 2026-07-31, by compiling the real pipeline rather than reading source:
 *   - colour, radius, typography and motion switch, and are read by shipped code
 *   - zone typography declares 48 properties per language and has ZERO consumers
 *   - spacing declares 6 and has ZERO consumers
 * Both were counted as evidence that the system "switches everything". They do
 * not switch anything, and nothing in the build said so.
 *
 * This is a bidirectional ratchet, like the doc-claims and repository-seam
 * guards. It fails when:
 *   - a dimension NOT on the known-inert list drops to zero consumers, which is
 *     a dimension quietly dying, and
 *   - a dimension ON the list has gained consumers, because the entry is now a
 *     lie that keeps the next regression allowlisted.
 *
 * The list may only shrink. It is not a place to park new work.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG = JSON.parse(readFileSync(join(ROOT, "governance.config.json"), "utf-8"));
const KNOWN_INERT = new Set(CONFIG.inertDimensions?.known ?? []);

const SKINS = join(ROOT, "packages/design/theme/skins.css");

/**
 * Each dimension names the properties a skin writes and the shape a consumer
 * uses to read them. Consumers are counted across product and library source —
 * never across the token packages themselves, which define the properties and
 * would otherwise count as their own audience.
 */
const DIMENSIONS = [
  {
    id: "colour",
    declares: /--role-[a-z-]+|--primary:|--background:/,
    reads:
      /var\(--(?:primary|background|foreground|border|muted|accent|role-[a-z-]+)\)|hsl\(var\(--/,
  },
  {
    id: "radius",
    declares: /--radius-[a-z0-9]+:/,
    reads: /var\(--radius-[a-z0-9]+\)|rounded-\[var\(--radius/,
  },
  {
    id: "elevation",
    declares: /--elevation-[a-z]+:/,
    reads: /var\(--elevation-[a-z]+\)|shadow-(?:ambient|glass|glow|sheen)/,
  },
  {
    id: "typography",
    declares: /--text-[a-z-]+:|--leading-[a-z-]+:/,
    reads: /var\(--(?:text|leading|tracking)-[a-z-]+\)|--font-(?:sans|heading|display|mono)\)/,
  },
  {
    id: "motion",
    declares: /--motion-duration-[a-z]+:/,
    reads:
      /var\(--(?:motion-)?(?:duration|ease)-[a-z-]+\)|duration-(?:micro|flow|reveal|cinematic)\b/,
  },
  // The lookbehind is load-bearing. Without it `gap-md` matches inside
  // `--section-gap-md`, a local token in apps/landing that has nothing to do
  // with this scale, and spacing reports consumers it does not have — which is
  // exactly the false-positive class that kept lint-defined-css-vars out of CI.
  {
    id: "spacing",
    declares: /--space-source-[a-z0-9]+:/,
    reads:
      /var\(--spacing-(?:xs|sm|md|lg|xl|2xl)\)|(?<![-\w])(?:p|px|py|pt|pb|pl|pr|m|mx|my|gap|space-[xy])-(?:xs|sm|md|lg|xl|2xl)(?![-\w])/,
  },
  { id: "zones", declares: /--zone-[a-z-]+:/, reads: /var\(--zone-[a-z-]+\)/ },
  {
    id: "controls",
    declares: /--control-height-[a-z]+:/,
    reads: /var\(--control-(?:height|font-size)-[a-z]+\)/,
  },
];

const CONSUMER_ROOTS = ["apps", "packages/design/ui/src", "packages/design/tokens/recipe.css"];

const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".open-next",
  ".turbo",
  ".source",
  "dist",
  "storybook-static",
  "generated",
  "brands",
  "skins",
]);

/** Files that define the tokens rather than consume them. */
const DEFINITION_FILES = [
  "packages/design/tokens/styles.css",
  "packages/design/theme/skins.css",
  "packages/design/design-tokens",
];

function collect(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) collect(full, out);
    else if ([".ts", ".tsx", ".css"].includes(extname(entry.name))) out.push(full);
  }
  return out;
}

const files = [];
for (const rootPath of CONSUMER_ROOTS) {
  const full = join(ROOT, rootPath);
  if (!existsSync(full)) continue;
  if (statSync(full).isDirectory()) collect(full, files);
  else files.push(full);
}
const consumerFiles = files.filter((f) => !DEFINITION_FILES.some((d) => f.includes(join(ROOT, d))));

const skins = readFileSync(SKINS, "utf-8");
const sources = consumerFiles.map((f) => readFileSync(f, "utf-8"));

const report = [];
for (const dimension of DIMENSIONS) {
  const declared = dimension.declares.test(skins);
  let consumers = 0;
  for (const src of sources) {
    if (dimension.reads.test(src)) consumers += 1;
  }
  report.push({ id: dimension.id, declared, consumers });
}

const newlyInert = report.filter((d) => d.declared && d.consumers === 0 && !KNOWN_INERT.has(d.id));
const stale = [...KNOWN_INERT].filter((id) => {
  const found = report.find((d) => d.id === id);
  return found && found.consumers > 0;
});
const unknown = [...KNOWN_INERT].filter((id) => !report.some((d) => d.id === id));

const width = Math.max(...report.map((d) => d.id.length));
for (const d of report) {
  const mark = !d.declared ? "·" : d.consumers === 0 ? "✗" : "✓";
  const note = !d.declared
    ? "not declared by any skin"
    : d.consumers === 0
      ? `INERT — declared, nothing reads it${KNOWN_INERT.has(d.id) ? " (known)" : ""}`
      : `${d.consumers} consuming file(s)`;
  process.stdout.write(`  ${mark} ${d.id.padEnd(width)}  ${note}\n`);
}

if (newlyInert.length === 0 && stale.length === 0 && unknown.length === 0) {
  process.stdout.write(
    `\n✅ inert-dimensions: every switchable dimension outside the known list has readers ` +
      `(${KNOWN_INERT.size} known inert: ${[...KNOWN_INERT].join(", ") || "none"}).\n`,
  );
  process.exit(0);
}

process.stderr.write("\n❌ lint-inert-dimensions\n\n");
for (const d of newlyInert) {
  process.stderr.write(
    `  ${d.id}: every language declares it and nothing reads it.\n` +
      `    A skin can override this forever without moving a pixel, and Tailwind will\n` +
      `    tree-shake the theme entry entirely. Either give it a consumer, or stop\n` +
      `    emitting it — do not add it to the known list to make this pass.\n\n`,
  );
}
for (const id of stale) {
  process.stderr.write(
    `  ${id}: listed as inert but now has consumers. Remove it from\n` +
      `    governance.config.json → inertDimensions.known; the list may only shrink.\n\n`,
  );
}
for (const id of unknown) {
  process.stderr.write(`  ${id}: listed as inert but is not a dimension this guard knows.\n\n`);
}
process.exit(1);
