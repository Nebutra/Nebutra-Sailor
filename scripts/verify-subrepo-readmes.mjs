#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveSubrepoMirrors } from "./lib/subrepo-mirrors.mjs";

const STALE_PATTERNS = [
  "AI Chat",
  "apps/web /chat",
  "AGPL",
  "workspace:*",
  "@workspace:",
  "@nebutra/theme",
  "Proprietary",
  "Internal monorepo dependency",
  "console.log",
  "Do not import",
  "inherits from Lobe",
];

function readText(path) {
  return readFileSync(path, "utf8");
}

function h1Of(markdown) {
  return markdown.match(/^#\s+(.+)$/m)?.[1] ?? "";
}

function staleMatches(markdown) {
  const lower = markdown.toLowerCase();
  return STALE_PATTERNS.filter((pattern) => lower.includes(pattern.toLowerCase()));
}

const cohortArg = process.argv.find((arg) => arg.startsWith("--cohort="));
const cohort = cohortArg ? cohortArg.slice("--cohort=".length) : undefined;

try {
  const { mirrors } = resolveSubrepoMirrors({ cohort });
  const failures = [];

  for (const mirror of mirrors) {
    const readmePath = join(process.cwd(), mirror.sourceDir, "README.md");
    const manifest = mirror.packageEntry.manifest;

    if (!existsSync(readmePath)) {
      failures.push(`${mirror.packageName}: missing README.md`);
      continue;
    }

    const readme = readText(readmePath);
    const h1 = h1Of(readme);

    if (!h1.includes(mirror.packageName)) {
      failures.push(`${mirror.packageName}: README H1 must include package name`);
    }

    if (manifest.license && !readme.includes(manifest.license)) {
      failures.push(`${mirror.packageName}: README must mention license ${manifest.license}`);
    }

    const stale = staleMatches(readme);
    if (stale.length > 0) {
      failures.push(`${mirror.packageName}: stale README pattern(s): ${stale.join(", ")}`);
    }
  }

  if (failures.length > 0) {
    console.error("[subrepo-readmes] README drift detected:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log(`[subrepo-readmes] ${mirrors.length} README(s) validated`);
} catch (error) {
  console.error(`[subrepo-readmes] ${error.message}`);
  process.exit(1);
}
