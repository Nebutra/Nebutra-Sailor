#!/usr/bin/env node
/**
 * Regenerate the `sourceStats` blocks in
 * `apps/landing/src/components/landing/features/capability-folder-data.ts`.
 *
 * The landing page advertises real repository metrics (package counts, source
 * files, test files, READMEs) per capability folder. Those numbers were
 * hand-typed, so they drifted the moment anyone added a package —
 * `capability-folder-data.test.ts` caught it, but only after the fact and only
 * for whoever ran the suite.
 *
 * This script makes the numbers derived rather than asserted. The counting
 * rules are deliberately identical to the ones in that test, which remains as
 * the regression guard:
 *
 *   unitCount   — package.json files under the folder
 *   sourceFiles — .ts/.tsx/.js/.jsx under a `src/` dir, excluding tests
 *   testFiles   — *.test.* / *.spec.*
 *   readmes     — README.md
 *
 * Only files committed to HEAD are counted (`git ls-tree`), so a dirty working
 * tree cannot inflate what the marketing site claims.
 *
 * Usage:
 *   node scripts/generate-capability-stats.mjs           # rewrite in place
 *   node scripts/generate-capability-stats.mjs --check   # CI drift gate
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TARGET = path.join(
  REPO_ROOT,
  "apps/landing/src/components/landing/features/capability-folder-data.ts",
);

function collectCommittedFiles(sourcePath) {
  const output = execFileSync("git", ["ls-tree", "-r", "--name-only", "HEAD", "--", sourcePath], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  }).trim();

  return output ? output.split(/\r?\n/) : [];
}

function statsFor(sourcePath) {
  const files = collectCommittedFiles(sourcePath);
  const isTest = (file) => /\.(test|spec)\.[tj]sx?$/.test(file);
  const inSrc = (file) => file.includes("/src/") && /\.[tj]sx?$/.test(file);

  return {
    unitCount: files.filter((file) => path.basename(file) === "package.json").length,
    sourceFiles: files.filter((file) => inSrc(file) && !isTest(file)).length,
    testFiles: files.filter((file) => isTest(file)).length,
    readmes: files.filter((file) => path.basename(file) === "README.md").length,
  };
}

/**
 * Rewrite each `sourceStats` block in place. `unitLabel` sits inside the same
 * object and is human-authored copy, so the numeric fields are patched
 * individually rather than regenerating the whole literal.
 */
function render(source) {
  const entryPattern = /sourcePath:\s*"([^"]+)",([\s\S]*?)sourceStats:\s*\{([\s\S]*?)\n(\s*)\},/g;

  return source.replace(entryPattern, (_match, sourcePath, between, body, closeIndent) => {
    const stats = statsFor(sourcePath);
    let next = body;
    for (const [key, value] of Object.entries(stats)) {
      const field = new RegExp(`(\\n\\s*${key}:\\s*)\\d+(,)`);
      if (!field.test(next)) {
        throw new Error(`${sourcePath}: sourceStats is missing a numeric \`${key}\` field`);
      }
      next = next.replace(field, `$1${value}$2`);
    }
    return `sourcePath: "${sourcePath}",${between}sourceStats: {${next}\n${closeIndent}},`;
  });
}

const current = readFileSync(TARGET, "utf8");
const updated = render(current);
const relative = path.relative(REPO_ROOT, TARGET);

if (process.argv.includes("--check")) {
  if (current === updated) {
    process.stdout.write(`✔︎ ${relative} matches the repository\n`);
  } else {
    process.stderr.write(
      `✖ ${relative} is stale — the landing page is advertising outdated repository metrics.\n` +
        `  Run: node scripts/generate-capability-stats.mjs\n`,
    );
    process.exitCode = 1;
  }
} else if (current === updated) {
  process.stdout.write(`✔︎ ${relative} already up to date\n`);
} else {
  writeFileSync(TARGET, updated, "utf8");
  process.stdout.write(`✔︎ ${relative} regenerated\n`);
}
