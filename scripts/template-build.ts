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
 * set (default: nebutra/sailor-template). See packages/ops/create-sailor/src/utils/git.ts.
 */
import { execFileSync, execSync } from "node:child_process";
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
 * The sailor version — the one number every publishable core + runtime
 * package carries (TEMPLATE.md "Sailor version"). scripts/sailor-version.mjs
 * owns the rule; this asks it rather than re-deriving it, so the marker, the
 * mirror tag and the changesets group cannot disagree. `converged` is false
 * until the first lockstep release: before that only one package is at the
 * number, and sync-template.yml must not tag the mirror `v<x>` for a tree
 * that does not carry `x` throughout.
 */
function readSailorVersion(): { version: string; converged: boolean } {
  const printed = execFileSync(
    process.execPath,
    [path.join(REPO_ROOT, "scripts/sailor-version.mjs"), "--json"],
    { cwd: REPO_ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
  ).trim();
  let parsed: { version?: unknown; converged?: unknown };
  try {
    parsed = JSON.parse(printed);
  } catch {
    throw new Error(
      `scripts/sailor-version.mjs --json printed "${printed}", not JSON. Refusing to stamp the marker.`,
    );
  }
  const { version, converged } = parsed;
  if (typeof version !== "string" || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
    throw new Error(
      `scripts/sailor-version.mjs reported version "${String(version)}", not a version. Refusing to stamp the marker.`,
    );
  }
  if (typeof converged !== "boolean") {
    throw new Error(
      `scripts/sailor-version.mjs reported converged=${String(converged)}, not a boolean. Refusing to stamp the marker.`,
    );
  }
  return { version, converged };
}

/**
 * The mirror never publishes (release.yml is stripped), so the source repo's
 * changesets `fixed` group — the sailor-version lockstep — means nothing
 * there, and it would break scaffolds: `.changeset/` ships verbatim while
 * create-sailor prunes group members on request (`--no-webhooks` deletes
 * packages/integrations/webhooks), and @changesets/config rejects a `fixed`
 * name that matches no workspace package on the first `pnpm changeset`.
 * The number itself still travels in the marker (`sailorVersion`) and the
 * mirror tag. Every other key of the config is left as it is.
 */
function clearChangesetFixedGroup(targetDir: string): void {
  const configPath = path.join(targetDir, ".changeset/config.json");
  // Read directly and branch on ENOENT rather than existsSync-then-read: the
  // latter is a check-then-use race (the file can vanish between the check
  // and the read), which CodeQL flags as a TOCTOU file system race.
  let raw: string;
  try {
    raw = fs.readFileSync(configPath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      // Fail loud: a missing config means .changeset/ stopped shipping, which
      // is a boundary change someone should have made on purpose.
      throw new Error(".changeset/config.json missing from template output. Refusing to push.");
    }
    throw error;
  }
  const config = JSON.parse(raw) as { fixed?: unknown };
  config.fixed = [];
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
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
    "## 2. Commercial Tiers",
    "Commercial use is free at every size. See",
    "[LICENSE-COMMERCIAL.md](./LICENSE-COMMERCIAL.md) — paid tiers sell support",
    "and contractual commitments, never permission:",
    "",
    "| Tier | What it buys | Cost |",
    "|------|--------------|------|",
    "| Community | Everything, commercial use included | **Free** — no registration |",
    "| Team | Private support channel, 2-business-day first response | $2,000/year — [buy here](https://nebutra.com/licensing) |",
    "| Enterprise | SLA, indemnity, DPA, trademark / white-label | From $30,000/year — contact sales |",
    "",
    "## Why FSL?",
    "Keeping the codebase source-available lets the community learn, audit, and",
    "contribute, and every version becomes Apache-2.0 after two years. The only",
    "restricted use is selling a substitute for the platform itself, so businesses ship products",
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
  //    sailorVersion is what sync-template.yml tags the mirror with (v<x>),
  //    and only when sailorVersionConverged is true.
  const sailor = readSailorVersion();
  const marker = {
    type: "sailor-template-mirror",
    sourceRepo: "Nebutra/Nebutra-Sailor",
    sailorVersion: sailor.version,
    sailorVersionConverged: sailor.converged,
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
  clearChangesetFixedGroup(out);
  process.stdout.write(
    "  emptied .changeset/config.json fixed group (the mirror never publishes)\n",
  );

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
  // License model is generic SaaS infrastructure (issued, validated, renewed) —
  // keep it in the template so packages/commerce/license works downstream.
];

const NEBUTRA_ONLY_ENUMS = [
  "SleptonsTier",
  "ProductStage", // used only by Sleptons
  // LicenseTier/LicenseType travel with the License model.
];

function stripNebutraOnlyModels(targetDir: string): number {
  const schemaPath = path.join(targetDir, "packages/platform/db/prisma/schema.prisma");
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
