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

  process.stdout.write("Step 2/3: applying .templateignore…\n");
  const stripped = applyTemplateIgnore(out, args.verbose);
  process.stdout.write(`  stripped ${stripped} paths\n`);

  if (args.git) {
    process.stdout.write("Step 3/3: initializing git repo…\n");
    initGit(out);
  } else {
    process.stdout.write("Step 3/3: skipping git init (pass --git to enable)\n");
  }

  process.stdout.write(`\nDone. Template built at: ${out}\n`);
}

main();
