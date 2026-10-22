#!/usr/bin/env node
/**
 * Adoption scan: how much of each app in this monorepo is built from the
 * design system, measured from source.
 *
 * Run before `dev` and `build` (see the `predev` / `prebuild` scripts) and
 * written to `src/lib/generated/adoption.json`, which the /adoption page reads.
 * Nothing on that page is typed in; if an app changes, the next build changes
 * the page.
 *
 * Four numbers per app, all counted over its `.tsx` files:
 *   - tsxFiles            files scanned
 *   - uiFiles             files that import `@nebutra/ui` (root or any subpath)
 *   - hardcodedHex        `#rgb` / `#rrggbb` / … literals in code (comments and
 *                         in-page `href="#anchor"` links excluded)
 *   - arbitraryFontSizes  `text-[13px]`-style Tailwind sizes, which bypass the
 *                         type scale
 *
 * These are heuristics over text, not a parse. They are stable and cheap, they
 * err the same way for every app, and the page says what they are. Output is
 * deterministic (no timestamp) so the committed JSON changes only when the code
 * does.
 *
 * Usage:
 *   node apps/design/scripts/adoption.mjs                      # print JSON
 *   node apps/design/scripts/adoption.mjs --write <path>       # path from repo root
 */

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SKIPPED_DIRECTORIES = [
  "node_modules",
  ".next",
  ".turbo",
  ".source",
  ".vercel",
  "dist",
  "build",
  "out",
  "coverage",
  "storybook-static",
  "__tests__",
  "__mocks__",
];
const SKIPPED_FILE_SUFFIXES = [".test.tsx", ".spec.tsx", ".stories.tsx", ".d.tsx"];

/** `from "@nebutra/ui…"`, `import("@nebutra/ui…")`, `require("@nebutra/ui…")` — root or subpath. */
const UI_IMPORT =
  /(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*|^\s*import\s+)["']@nebutra\/ui(?:\/[^"']*)?["']/mu;

/**
 * A hex colour that is not part of a longer word or number: preceded by anything
 * but a word character or `&` (HTML entities), followed by no word character or
 * hyphen, and not the target of an `href`.
 */
const HEX =
  /(?<![\w&])(?<!href=["'{]["']?)#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})(?![\w-])/gu;

/** `text-[13px]`, `md:text-[0.8rem]` — a pixel/rem/em size, not `text-[var(--x)]` or `text-[#333]`. */
const ARBITRARY_FONT_SIZE = /(?<![\w-])text-\[\d*\.?\d+(?:px|rem|em)\]/gu;

/**
 * Drop comments so that documenting a colour is not counted as using one. Line
 * comments are only recognised when the `//` does not follow a colon, quote or
 * word character, which keeps `"https://…"` intact.
 */
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//gu, "").replace(/(^|[^:"'`\w])\/\/.*$/gmu, "$1");
}

export function importsNebutraUi(source) {
  return UI_IMPORT.test(stripComments(source));
}

export function countHardcodedHex(source) {
  return (stripComments(source).match(HEX) ?? []).length;
}

export function countArbitraryFontSizes(source) {
  return (stripComments(source).match(ARBITRARY_FONT_SIZE) ?? []).length;
}

function* tsxFiles(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRECTORIES.includes(entry.name)) yield* tsxFiles(path);
    } else if (
      entry.name.endsWith(".tsx") &&
      !SKIPPED_FILE_SUFFIXES.some((suffix) => entry.name.endsWith(suffix))
    ) {
      yield path;
    }
  }
}

function readNebutraMeta(appDirectory) {
  const manifest = join(appDirectory, "package.json");
  if (!existsSync(manifest)) return {};
  try {
    return JSON.parse(readFileSync(manifest, "utf-8")).nebutra ?? {};
  } catch {
    return {};
  }
}

const round = (value) => Math.round(value * 10000) / 10000;

export function scanApp(appDirectory) {
  const name = appDirectory.split("/").filter(Boolean).at(-1);
  const meta = readNebutraMeta(appDirectory);
  let files = 0;
  let uiFiles = 0;
  let hardcodedHex = 0;
  let arbitraryFontSizes = 0;

  for (const file of tsxFiles(appDirectory)) {
    const source = readFileSync(file, "utf-8");
    files += 1;
    if (importsNebutraUi(source)) uiFiles += 1;
    hardcodedHex += countHardcodedHex(source);
    arbitraryFontSizes += countArbitraryFontSizes(source);
  }

  return {
    name,
    status: typeof meta.status === "string" ? meta.status : null,
    graph: typeof meta.graph === "string" ? meta.graph : null,
    tsxFiles: files,
    uiFiles,
    // null, not 0: an app with no tsx has not adopted nothing, it has nothing to adopt.
    uiRatio: files === 0 ? null : round(uiFiles / files),
    hardcodedHex,
    arbitraryFontSizes,
  };
}

export function scanApps(appsDirectory) {
  const apps = readdirSync(appsDirectory)
    .filter((entry) => statSync(join(appsDirectory, entry)).isDirectory())
    .sort((a, b) => a.localeCompare(b))
    .map((entry) => scanApp(join(appsDirectory, entry)));

  const sum = (key) => apps.reduce((total, app) => total + app[key], 0);
  const tsx = sum("tsxFiles");
  const ui = sum("uiFiles");

  return {
    schema: 1,
    excluded: { directories: SKIPPED_DIRECTORIES, files: SKIPPED_FILE_SUFFIXES },
    totals: {
      apps: apps.length,
      tsxFiles: tsx,
      uiFiles: ui,
      uiRatio: tsx === 0 ? null : round(ui / tsx),
      hardcodedHex: sum("hardcodedHex"),
      arbitraryFontSizes: sum("arbitraryFontSizes"),
    },
    apps,
  };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
  const report = scanApps(join(root, "apps"));
  const json = `${JSON.stringify(report, null, 2)}\n`;
  const flag = process.argv.indexOf("--write");
  if (flag === -1) {
    process.stdout.write(json);
  } else {
    const target = process.argv[flag + 1];
    if (!target) {
      process.stderr.write("adoption: --write needs a path (relative to the repo root)\n");
      process.exit(2);
    }
    writeFileSync(resolve(root, target), json);
    process.stdout.write(
      `adoption: ${report.totals.apps} apps, ${report.totals.tsxFiles} tsx files -> ${target}\n`,
    );
  }
}
