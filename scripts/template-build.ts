#!/usr/bin/env tsx
/**
 * template-build.ts
 *
 * Builds a clean, pre-stripped template source tree suitable for pushing to
 * the `nebutra/sailor-template` mirror repository.
 *
 * Workflow:
 *   1. Copy the entire repo (minus heavy dev-only dirs) to --out.
 *   2. Apply .templateignore to delete Nebutra business content.
 *   3. Replace brand-specific references with template placeholders.
 *   4. Initialize a fresh git repo at the output (optional, with --git).
 *
 * Usage:
 *   tsx scripts/template-build.ts --out=/tmp/sailor-template
 *   tsx scripts/template-build.ts --out=/tmp/sailor-template --git
 *
 * The mirror repo is consumed by create-sailor when `SAILOR_TEMPLATE_REPO` is
 * set (default: nebutra/sailor-template). See packages/create-sailor/src/utils/git.ts.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import ignore from "ignore";

interface Args {
  out: string;
  git: boolean;
  verbose: boolean;
}

function parseArgs(): Args {
  const args: Args = {
    out: "",
    git: false,
    verbose: false,
  };
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--out=")) args.out = arg.slice("--out=".length);
    else if (arg === "--git") args.git = true;
    else if (arg === "--verbose" || arg === "-v") args.verbose = true;
    else if (arg === "--help" || arg === "-h") {
      process.stdout.write(
        [
          "Usage: tsx scripts/template-build.ts --out=<dir> [options]",
          "",
          "Options:",
          "  --out=<dir>    Output directory (required)",
          "  --git          Initialize git repo at output",
          "  --verbose, -v  Verbose logging",
          "  --help, -h     Show this help",
          "",
        ].join("\n"),
      );
      process.exit(0);
    }
  }
  if (!args.out) {
    process.stderr.write("error: --out=<dir> is required\n");
    process.exit(2);
  }
  return args;
}

const REPO_ROOT = path.resolve(__dirname, "..");

// Dirs never copied into the template (heavy, rebuilt on clone).
const HARD_SKIP = new Set([
  "node_modules",
  ".git",
  ".next",
  ".turbo",
  "dist",
  "build",
  "coverage",
  ".vercel",
  ".cache",
  "playwright-report",
  "test-results",
  "artifacts",
]);

function copyTree(src: string, dst: string, verbose: boolean): number {
  let count = 0;
  fs.mkdirSync(dst, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    if (HARD_SKIP.has(entry.name)) continue;
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      count += copyTree(s, d, verbose);
    } else if (entry.isSymbolicLink()) {
      // Dereference to stay portable across OSes.
      try {
        const target = fs.readlinkSync(s);
        fs.symlinkSync(target, d);
      } catch {
        // fallback: copy as regular file if symlink creation fails
        fs.copyFileSync(s, d);
      }
      count++;
    } else if (entry.isFile()) {
      fs.copyFileSync(s, d);
      count++;
    }
  }
  if (verbose) process.stdout.write(`  copied ${src} → ${dst}\n`);
  return count;
}

function collectPaths(root: string, current: string, out: string[]): void {
  const entries = fs.readdirSync(current, { withFileTypes: true });
  for (const entry of entries) {
    if (HARD_SKIP.has(entry.name)) continue;
    const full = path.join(current, entry.name);
    const rel = path.relative(root, full).split(path.sep).join("/");
    if (entry.isDirectory()) {
      out.push(`${rel}/`);
      collectPaths(root, full, out);
    } else {
      out.push(rel);
    }
  }
}

function applyTemplateIgnore(targetDir: string, verbose: boolean): number {
  const ignorePath = path.join(targetDir, ".templateignore");
  if (!fs.existsSync(ignorePath)) {
    process.stderr.write("warn: no .templateignore found in output\n");
    return 0;
  }

  const patterns = fs.readFileSync(ignorePath, "utf8");
  const matcher = ignore().add(patterns);

  const paths: string[] = [];
  collectPaths(targetDir, targetDir, paths);
  const normalized = paths.map((p) => (p.endsWith("/") ? p.slice(0, -1) : p));
  const kept = new Set(matcher.filter(normalized));
  const toDelete = normalized
    .filter((p) => !kept.has(p))
    .sort((a, b) => b.split("/").length - a.split("/").length);

  for (const rel of toDelete) {
    const abs = path.join(targetDir, rel);
    try {
      if (fs.existsSync(abs)) {
        fs.rmSync(abs, { recursive: true, force: true });
        if (verbose) process.stdout.write(`  - stripped ${rel}\n`);
      }
    } catch {
      // silent; keep going
    }
  }

  try {
    if (fs.existsSync(ignorePath)) fs.rmSync(ignorePath, { force: true });
  } catch {
    /* noop */
  }

  // Prune empty directories left behind by file-level deletions.
  pruneEmptyDirs(targetDir);

  return toDelete.length;
}

function pruneEmptyDirs(dir: string): boolean {
  if (!fs.statSync(dir).isDirectory()) return false;
  const entries = fs.readdirSync(dir);
  let isEmpty = true;
  for (const entry of entries) {
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) {
      const childEmpty = pruneEmptyDirs(full);
      if (!childEmpty) isEmpty = false;
    } else {
      isEmpty = false;
    }
  }
  if (isEmpty && dir !== REPO_ROOT) {
    try {
      fs.rmdirSync(dir);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Inject the license model into the mirror repo so consumers cloning
 * directly (without create-sailor) still see the same legal guardrails.
 */
function injectLicenseAndMarker(targetDir: string): void {
  // 1. Ensure LICENSE (AGPL-3.0) exists — source repo should already ship it.
  const licensePath = path.join(targetDir, "LICENSE");
  if (!fs.existsSync(licensePath)) {
    // Fail loud rather than silently shipping a template without a license.
    throw new Error("LICENSE missing from template output. Refusing to push.");
  }

  // 2. Ensure LICENSE-COMMERCIAL.md is present.
  const commercialPath = path.join(targetDir, "LICENSE-COMMERCIAL.md");
  if (!fs.existsSync(commercialPath)) {
    throw new Error("LICENSE-COMMERCIAL.md missing. Refusing to push.");
  }

  // 3. Inject NOTICE.md summarizing the dual-license model.
  const notice = [
    "# NOTICE · Sailor Template Licensing",
    "",
    "This template is distributed under a **dual-license** model:",
    "",
    "## 1. Open-source license — AGPL-3.0",
    "See [LICENSE](./LICENSE). If you deploy the software as a network",
    "service, AGPL requires you to make your source code available to users.",
    "",
    "## 2. Commercial License Exception",
    "See [LICENSE-COMMERCIAL.md](./LICENSE-COMMERCIAL.md). Three tiers:",
    "",
    "| Tier | Who | Cost |",
    "|------|-----|------|",
    "| Individual / OPC | Solo / annual revenue < $1M | **Free** — [register here](https://nebutra.com/get-license) |",
    "| Startup | ≤ 5 employees | $799/year — [buy here](https://nebutra.com/licensing) |",
    "| Enterprise | Business / SI / OEM | Contact sales |",
    "",
    "## Why dual-license?",
    "Keeping the codebase under AGPL lets the community learn, audit, and",
    "contribute. The commercial exception lets businesses ship products",
    "without opening their source — sustaining full-time engineering on",
    "the template + ecosystem.",
    "",
    "**Self-attest your tier when you scaffold:**",
    "```bash",
    "npm create sailor@latest",
    "# CLI will ask which tier applies. Individual/OPC is free.",
    "```",
    "",
    "## Questions",
    "- Website: https://nebutra.com",
    "- Licensing: https://nebutra.com/licensing",
    "- Email: licensing@nebutra.com",
    "",
    "---",
    "",
    "_This NOTICE is injected automatically by the sync-template workflow_",
    "_and represents the licensing model at the time of the last sync._",
    "",
  ].join("\n");
  fs.writeFileSync(path.join(targetDir, "NOTICE.md"), notice);

  // 4. Marker file — lets tools detect "this is a pre-stripped mirror".
  const marker = {
    type: "sailor-template-mirror",
    sourceRepo: "Nebutra/Nebutra-Sailor",
    syncedAt: new Date().toISOString(),
    license: {
      open: "AGPL-3.0",
      commercialException: "LICENSE-COMMERCIAL.md",
    },
    readonly: true,
    note: "PRs to this repo are closed. Open PRs against Nebutra/Nebutra-Sailor.",
  };
  fs.writeFileSync(
    path.join(targetDir, ".sailor-template.json"),
    `${JSON.stringify(marker, null, 2)}\n`,
  );
}

function initGit(targetDir: string): void {
  try {
    execSync("git init -q", { cwd: targetDir, stdio: "inherit" });
    execSync("git add -A", { cwd: targetDir, stdio: "inherit" });
    execSync(
      'git -c user.email=bot@nebutra.com -c user.name="Sailor Template Bot" commit -q -m "chore: sync from Nebutra-Sailor main"',
      { cwd: targetDir, stdio: "inherit" },
    );
    execSync("git branch -M main", { cwd: targetDir, stdio: "inherit" });
  } catch (err) {
    process.stderr.write(`warn: git init failed: ${String(err)}\n`);
  }
}

function main(): void {
  const args = parseArgs();
  const out = path.resolve(args.out);

  process.stdout.write(`Building template at: ${out}\n`);

  if (fs.existsSync(out)) {
    fs.rmSync(out, { recursive: true, force: true });
  }

  process.stdout.write("Step 1/3: copying source tree…\n");
  const copied = copyTree(REPO_ROOT, out, args.verbose);
  process.stdout.write(`  copied ${copied} files\n`);

  process.stdout.write("Step 2/4: applying .templateignore…\n");
  const stripped = applyTemplateIgnore(out, args.verbose);
  process.stdout.write(`  stripped ${stripped} paths\n`);

  process.stdout.write("Step 3/5: stripping Nebutra-only Prisma models…\n");
  const prismaStripped = stripNebutraOnlyModels(out);
  process.stdout.write(`  stripped ${prismaStripped} Nebutra-only models from schema.prisma\n`);

  process.stdout.write("Step 4/5: injecting license & template marker…\n");
  injectLicenseAndMarker(out);
  process.stdout.write("  injected LICENSE, LICENSE-COMMERCIAL.md, NOTICE.md, .sailor-template\n");

  if (args.git) {
    process.stdout.write("Step 5/5: initializing git repo…\n");
    initGit(out);
  } else {
    process.stdout.write("Step 5/5: skipping git init (pass --git to enable)\n");
  }

  process.stdout.write(`\nDone. Template built at: ${out}\n`);
}

/**
 * Remove Nebutra-only Prisma models from the template schema.
 *
 * These models power Nebutra's own products (Sleptons community, etc.) and
 * have no place in a generic SaaS template. Unlike @conditional-annotated
 * models (which are opt-in via CLI flags), these are hardcoded strips at
 * mirror-sync time — downstream users of Sailor-Template never see them.
 *
 * If you're adding a new Nebutra-only model, add it to NEBUTRA_ONLY_MODELS.
 */
const NEBUTRA_ONLY_MODELS = [
  "SleptonsaMemberProfile",
  "SleptonsProduct",
  "SleptonsUpvote",
  "SleptonsConnection",
  "CommunityProfile", // licensing/community table tied to Nebutra's OPC network
  "License",          // Nebutra's license issuance table
];

const NEBUTRA_ONLY_ENUMS = [
  "SleptonsTier",
  "ProductStage",    // used only by Sleptons
  "LicenseTier",
  "LicenseType",
];

function stripNebutraOnlyModels(targetDir: string): number {
  const schemaPath = path.join(targetDir, "packages/db/prisma/schema.prisma");
  if (!fs.existsSync(schemaPath)) return 0;

  let src = fs.readFileSync(schemaPath, "utf8");
  let removed = 0;

  const removeBlock = (kind: "model" | "enum", name: string) => {
    const re = new RegExp(`^${kind}\\s+${name}\\s*\\{`, "m");
    const m = re.exec(src);
    if (!m) return;
    const start = m.index;
    // find balanced closing brace
    let depth = 0;
    let i = m.index;
    while (i < src.length) {
      if (src[i] === "{") depth++;
      else if (src[i] === "}") {
        depth--;
        if (depth === 0) {
          // consume trailing newline
          let end = i + 1;
          if (src[end] === "\n") end++;
          src = src.slice(0, start) + src.slice(end);
          removed++;
          return;
        }
      }
      i++;
    }
  };

  for (const m of NEBUTRA_ONLY_MODELS) removeBlock("model", m);
  for (const e of NEBUTRA_ONLY_ENUMS) removeBlock("enum", e);

  // Strip relation fields from remaining models that point to removed models.
  const deletedNames = NEBUTRA_ONLY_MODELS.join("|");
  const relationFieldRe = new RegExp(
    `^\\s+\\w+\\s+(?:${deletedNames})(?:\\[\\])?(?:\\?)?\\s*(?:@relation\\([^)]*\\))?\\s*$\\n`,
    "gm",
  );
  src = src.replace(relationFieldRe, "");

  // Strip enum field references
  const deletedEnums = NEBUTRA_ONLY_ENUMS.join("|");
  const enumFieldRe = new RegExp(
    `^\\s+\\w+\\s+(?:${deletedEnums})(?:\\?)?(?:\\s+@default\\([^)]*\\))?\\s*$\\n`,
    "gm",
  );
  src = src.replace(enumFieldRe, "");

  // Collapse excess blank lines
  src = src.replace(/\n{3,}/g, "\n\n");

  fs.writeFileSync(schemaPath, src);
  return removed;
}

main();
