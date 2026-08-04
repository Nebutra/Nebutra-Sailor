#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import {
  getCurrentGitSha,
  getGithubToken,
  readCatalogVersions,
  resolveSubrepoMirrors,
} from "./lib/subrepo-mirrors.mjs";

const HARD_SKIP = new Set([
  ".git",
  ".next",
  ".turbo",
  "coverage",
  "dist",
  "node_modules",
  "playwright-report",
  "test-results",
]);

const MIT_LICENSE = `MIT License

Copyright (c) 2026 Nebutra

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;

function parseArgs(argv) {
  const args = {
    all: false,
    cohort: undefined,
    packageName: undefined,
    repoName: undefined,
    out: "",
    push: false,
  };

  for (const arg of argv) {
    if (arg === "--all") args.all = true;
    else if (arg === "--push") args.push = true;
    else if (arg.startsWith("--cohort=")) args.cohort = arg.slice("--cohort=".length);
    else if (arg.startsWith("--package=")) args.packageName = arg.slice("--package=".length);
    else if (arg.startsWith("--repo=")) args.repoName = arg.slice("--repo=".length);
    else if (arg.startsWith("--out=")) args.out = arg.slice("--out=".length);
    else if (arg === "--help" || arg === "-h") {
      console.log(
        [
          "Usage: node scripts/sync-subrepo-mirrors.mjs [options]",
          "",
          "Options:",
          "  --all                 Build all matching mirrors",
          "  --cohort=<name>       Filter by mirror cohort, e.g. first-wave",
          "  --package=<name>      Build one package mirror",
          "  --repo=<name>         Build one repo mirror",
          "  --out=<dir>           Output directory",
          "  --push                Force-push generated mirror(s) to GitHub",
        ].join("\n"),
      );
      process.exit(0);
    }
  }

  if (!args.out) args.out = join("/tmp", "nebutra-subrepo-mirrors");
  return args;
}

function copyTree(src, dst) {
  mkdirSync(dst, { recursive: true });

  for (const entry of readdirSync(src, { withFileTypes: true })) {
    if (HARD_SKIP.has(entry.name)) continue;

    const from = join(src, entry.name);
    const to = join(dst, entry.name);

    if (entry.isDirectory()) {
      copyTree(from, to);
    } else if (entry.isFile()) {
      mkdirSync(dirname(to), { recursive: true });
      copyFileSync(from, to);
    }
  }
}

function toPosix(path) {
  return path.split(sep).join("/");
}

function stripJsonComments(text) {
  // tsconfig often uses // comments; package.json must stay strict JSON.
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

function readJson(path) {
  const raw = readFileSync(path, "utf8");
  try {
    return JSON.parse(raw);
  } catch (error) {
    if (path.endsWith("tsconfig.json") || path.endsWith(".jsonc")) {
      return JSON.parse(stripJsonComments(raw));
    }
    throw error;
  }
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function resolveDependencyVersion(name, range, workspaceVersions, catalogVersions) {
  if (range.startsWith("workspace:")) {
    const version = workspaceVersions.get(name);
    if (!version) {
      throw new Error(`Cannot resolve workspace dependency ${name}`);
    }
    return `^${version}`;
  }

  if (range.startsWith("catalog:")) {
    const version = catalogVersions.get(name);
    if (!version) {
      throw new Error(`Cannot resolve catalog dependency ${name}`);
    }
    return version;
  }

  return range;
}

function normalizeDependencyBlock(block, workspaceVersions, catalogVersions) {
  if (!block) return block;

  return Object.fromEntries(
    Object.entries(block).map(([name, range]) => [
      name,
      typeof range === "string"
        ? resolveDependencyVersion(name, range, workspaceVersions, catalogVersions)
        : range,
    ]),
  );
}

function packageVendorSlug(packageName) {
  return packageName.replace(/^@/, "").replace(/\//g, "__");
}

function copyDirRecursive(src, dst) {
  mkdirSync(dst, { recursive: true });
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    const from = join(src, entry.name);
    const to = join(dst, entry.name);
    if (entry.isDirectory()) copyDirRecursive(from, to);
    else if (entry.isFile()) copyFileSync(from, to);
  }
}

/**
 * Prefer dist-based exports for vendored packages. Monorepo packages may still
 * point at src for DX; vendored copies always ship built artifacts.
 */
function distExportsForManifest(manifest) {
  if (
    manifest.exports &&
    typeof manifest.exports === "object" &&
    !Array.isArray(manifest.exports)
  ) {
    const rewritten = {};
    for (const [key, value] of Object.entries(manifest.exports)) {
      if (typeof value === "string") {
        if (value.startsWith("./dist/")) {
          rewritten[key] = value;
          continue;
        }
        // ./src/foo.ts -> ./dist/foo.js (+ types)
        const base = value
          .replace(/^\.\/src\//, "")
          .replace(/\.tsx?$/, "")
          .replace(/\/index$/, "/index");
        const js = `./dist/${base}.js`;
        const dts = `./dist/${base}.d.ts`;
        rewritten[key] = { types: dts, import: js, default: js };
      } else if (value && typeof value === "object") {
        rewritten[key] = value;
      }
    }
    if (Object.keys(rewritten).length > 0) return rewritten;
  }

  return {
    ".": {
      types: "./dist/index.d.ts",
      import: "./dist/index.js",
      default: "./dist/index.js",
    },
  };
}

/**
 * Vendor workspace @nebutra/* dependencies as file:./vendor/* packages built
 * from monorepo dist/. This avoids standalone typecheck walking into npm
 * packages that still publish types: ./src/index.ts.
 */
function vendorWorkspaceDependencies(
  root,
  targetDir,
  manifest,
  packageByName,
  catalogVersions,
  workspaceVersions,
) {
  const vendorRoot = join(targetDir, "vendor");
  const seen = new Set();

  function ensurePackageDist(packageName, sourceDir) {
    const distIndex = join(sourceDir, "dist", "index.js");
    const distDts = join(sourceDir, "dist", "index.d.ts");
    if (existsSync(distIndex) || existsSync(distDts)) return true;

    const pkgManifest = readJson(join(sourceDir, "package.json"));
    if (!pkgManifest.scripts?.build) {
      console.warn(`[subrepo-sync] cannot vendor ${packageName}: no build script and no dist/`);
      return false;
    }

    console.log(`[subrepo-sync] building ${packageName} for vendor…`);
    try {
      execFileSync("pnpm", ["run", "build"], {
        cwd: sourceDir,
        stdio: "inherit",
        env: process.env,
      });
    } catch (error) {
      console.warn(
        `[subrepo-sync] build failed for ${packageName}: ${error instanceof Error ? error.message : error}`,
      );
      return false;
    }

    return existsSync(distIndex) || existsSync(distDts);
  }

  function vendorOne(packageName) {
    if (seen.has(packageName)) return true;
    const entry = packageByName.get(packageName);
    if (!entry) return false;

    const sourceDir = join(root, entry.relativeDir);
    if (!ensurePackageDist(packageName, sourceDir)) {
      console.warn(`[subrepo-sync] cannot vendor ${packageName}: missing dist/ after build`);
      return false;
    }
    const distDir = join(sourceDir, "dist");

    seen.add(packageName);
    const sourceManifest = readJson(join(sourceDir, "package.json"));

    // Vendor nested workspace deps first so file: links resolve.
    for (const field of ["dependencies", "optionalDependencies"]) {
      const block = sourceManifest[field] ?? {};
      for (const [depName, range] of Object.entries(block)) {
        if (typeof range === "string" && range.startsWith("workspace:")) {
          vendorOne(depName);
        }
      }
    }

    const slug = packageVendorSlug(packageName);
    const outDir = join(vendorRoot, slug);
    rmSync(outDir, { recursive: true, force: true });
    mkdirSync(outDir, { recursive: true });
    copyDirRecursive(distDir, join(outDir, "dist"));

    const deps = {};
    for (const [depName, range] of Object.entries(sourceManifest.dependencies ?? {})) {
      if (typeof range !== "string") continue;
      if (range.startsWith("workspace:") && seen.has(depName)) {
        deps[depName] = `file:../${packageVendorSlug(depName)}`;
      } else {
        deps[depName] = resolveDependencyVersion(
          depName,
          range,
          workspaceVersions,
          catalogVersions,
        );
      }
    }

    const vendoredManifest = {
      name: packageName,
      version: sourceManifest.version,
      description: sourceManifest.description,
      license: sourceManifest.license ?? "MIT",
      type: sourceManifest.type ?? "module",
      main: "./dist/index.js",
      types: "./dist/index.d.ts",
      exports: distExportsForManifest(sourceManifest),
      files: ["dist"],
      dependencies: deps,
      private: false,
    };
    writeJson(join(outDir, "package.json"), vendoredManifest);
    return true;
  }

  let vendoredAny = false;
  for (const field of ["dependencies", "optionalDependencies"]) {
    const block = manifest[field] ?? {};
    for (const [depName, range] of Object.entries(block)) {
      if (typeof range !== "string") continue;
      if (!range.startsWith("workspace:") && !depName.startsWith("@nebutra/")) continue;
      if (!packageByName.has(depName)) continue;
      if (vendorOne(depName)) {
        block[depName] = `file:./vendor/${packageVendorSlug(depName)}`;
        vendoredAny = true;
      }
    }
    if (Object.keys(block).length > 0) manifest[field] = block;
  }

  if (vendoredAny) {
    console.log(
      `[subrepo-sync] vendored ${seen.size} workspace package(s) into ${toPosix(join(targetDir, "vendor"))}`,
    );
  }
  return seen;
}

function normalizePackageJson(
  root,
  mirror,
  targetDir,
  catalogVersions,
  workspaceVersions,
  packageByName,
) {
  const manifestPath = join(targetDir, "package.json");
  const manifest = readJson(manifestPath);
  const repoUrl = `git+https://github.com/${mirror.owner}/${mirror.repoName}.git`;
  const sourceSha = getCurrentGitSha(root);

  // Vendor monorepo workspace deps (built dist) before rewriting ranges to ^x.y.z.
  vendorWorkspaceDependencies(
    root,
    targetDir,
    manifest,
    packageByName,
    catalogVersions,
    workspaceVersions,
  );

  for (const field of [
    "dependencies",
    "devDependencies",
    "peerDependencies",
    "optionalDependencies",
  ]) {
    // Skip file: vendor paths — already finalized.
    const block = manifest[field];
    if (!block) continue;
    const next = {};
    for (const [name, range] of Object.entries(block)) {
      if (typeof range === "string" && range.startsWith("file:")) {
        next[name] = range;
      } else {
        next[name] =
          typeof range === "string"
            ? resolveDependencyVersion(name, range, workspaceVersions, catalogVersions)
            : range;
      }
    }
    manifest[field] = next;
  }

  manifest.repository = {
    type: "git",
    url: repoUrl,
  };
  manifest.homepage = `https://github.com/${mirror.owner}/${mirror.repoName}#readme`;
  manifest.bugs = {
    url: `https://github.com/${mirror.owner}/${mirror.repoName}/issues`,
  };
  manifest.nebutraMirror = {
    sourceRepository: mirror.sourceRepository,
    sourceDirectory: mirror.sourceDir,
    sourcePackage: mirror.packageName,
    sourceSha,
    canonicalSource: "monorepo",
  };

  // Standalone clones need packageManager for pnpm/action-setup + Corepack.
  if (!manifest.packageManager) {
    manifest.packageManager = "pnpm@10.32.1";
  }

  // Monorepo packages often rely on root-hoisted toolchain (tsup/vitest/tsx).
  // Standalone mirrors must declare anything their scripts invoke, or Build
  // hard-fails with "command not found".
  ensureStandaloneToolchain(manifest, catalogVersions);

  // Typecheck scripts often need Node types that monorepo hoists at the root.
  if (manifest.scripts?.typecheck) {
    manifest.devDependencies = {
      ...(manifest.devDependencies ?? {}),
      "@types/node": manifest.devDependencies?.["@types/node"] ?? "^22.10.0",
    };
  }

  writeJson(manifestPath, manifest);
}

/** Default ranges when the workspace catalog does not pin a tool. */
const STANDALONE_TOOLCHAIN_FALLBACKS = {
  tsup: "^8.5.1",
  vitest: "^4.1.4",
  tsx: "^4.21.0",
  typescript: "^5.9.3",
  jsdom: "^29.1.1",
};

/**
 * If package scripts reference a CLI tool but neither dependencies nor
 * devDependencies declare it, inject it into devDependencies so standalone
 * `pnpm install` + `pnpm run build|test` works outside the monorepo.
 */
function ensureStandaloneToolchain(manifest, catalogVersions) {
  const scriptsText = Object.values(manifest.scripts ?? {}).join("\n");
  if (!scriptsText) return;

  const declared = {
    ...(manifest.dependencies ?? {}),
    ...(manifest.devDependencies ?? {}),
    ...(manifest.peerDependencies ?? {}),
  };
  const dev = { ...(manifest.devDependencies ?? {}) };
  let changed = false;

  for (const [tool, fallback] of Object.entries(STANDALONE_TOOLCHAIN_FALLBACKS)) {
    let used =
      tool === "typescript"
        ? /\btsc\b/.test(scriptsText) || /\btypescript\b/.test(scriptsText)
        : new RegExp(`\\b${tool}\\b`).test(scriptsText);
    // vitest browser/dom environments need jsdom even when not named in scripts.
    if (tool === "jsdom") {
      used =
        /\bvitest\b/.test(scriptsText) &&
        Boolean(
          declared.react ||
            declared["react-dom"] ||
            declared["@types/react"] ||
            scriptsText.includes("jsdom"),
        );
    }
    if (!used || declared[tool] || dev[tool]) continue;
    const catalog = catalogVersions?.get?.(tool);
    dev[tool] = catalog ?? fallback;
    changed = true;
  }

  // React entrypoints need types + a local react install for standalone tsc.
  // Monorepos often hoist these from apps; mirrors do not.
  const needsReact =
    Boolean(declared.react || declared["@types/react"] || declared["react-dom"]) ||
    Object.keys(manifest.exports ?? {}).some((key) => key.includes("react")) ||
    /react/.test(JSON.stringify(manifest.peerDependencies ?? {}));
  if (needsReact) {
    if (!dev.react && !manifest.dependencies?.react) {
      dev.react = declared.react ?? "^19.0.0";
      changed = true;
    }
    if (!dev["@types/react"] && !manifest.dependencies?.["@types/react"]) {
      dev["@types/react"] = "^19.0.0";
      changed = true;
    }
  }

  if (changed) {
    manifest.devDependencies = dev;
  }
}

function normalizeTsconfig(root, targetDir) {
  const tsconfigPath = join(targetDir, "tsconfig.json");
  if (!existsSync(tsconfigPath)) return;

  const tsconfig = readJson(tsconfigPath);
  if (typeof tsconfig.extends === "string" && tsconfig.extends.includes("tsconfig.base.json")) {
    tsconfig.extends = "./tsconfig.base.json";
    copyFileSync(join(root, "tsconfig.base.json"), join(targetDir, "tsconfig.base.json"));
  }

  // Standalone mirrors install published @nebutra/* packages that may still
  // point `types` at TypeScript sources. skipLibCheck keeps package-local
  // typecheck focused on this package rather than transitive monorepo deps.
  tsconfig.compilerOptions = {
    ...(tsconfig.compilerOptions ?? {}),
    skipLibCheck: true,
  };
  writeJson(tsconfigPath, tsconfig);
}

function prependReadmeBanner(targetDir, mirror) {
  const readmePath = join(targetDir, "README.md");
  let existing;
  try {
    existing = readFileSync(readmePath, "utf8").replace(/^\uFEFF/, "");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    existing = `# ${mirror.packageName}\n`;
  }
  const banner = [
    `# ${mirror.packageName}`,
    "",
    `Public mirror for [${mirror.packageName}](https://www.npmjs.com/package/${encodeURIComponent(mirror.packageName)}) from [${mirror.sourceRepository}](https://github.com/${mirror.sourceRepository}/tree/main/${mirror.sourceDir}).`,
    "",
    "This repository is generated from the Nebutra Sailor monorepo. Package releases are cut from the monorepo and mirrored here for discovery, standalone cloning, and contribution intake.",
    "",
    "- Canonical source: `" + mirror.sourceDir + "` in `" + mirror.sourceRepository + "`",
    "- Package registry: npm and GitHub Packages",
    "- Contributions: open issues or PRs here; maintainers port accepted changes back into the monorepo source package",
    "",
    "---",
    "",
  ].join("\n");

  const body = existing.replace(/^# .*\n+/, "");
  writeFileSync(readmePath, `${banner}${body}`);
}

function writeMirrorMetadata(targetDir, mirror) {
  writeFileSync(join(targetDir, "LICENSE"), MIT_LICENSE);
  writeFileSync(
    join(targetDir, "NEBUTRA_SUBREPO.md"),
    [
      "# Nebutra Subrepo Mirror",
      "",
      `This repository is generated from \`${mirror.sourceRepository}\`.`,
      "",
      "| Field | Value |",
      "|---|---|",
      `| Package | \`${mirror.packageName}\` |`,
      `| Source directory | \`${mirror.sourceDir}\` |`,
      `| Mirror repo | \`${mirror.owner}/${mirror.repoName}\` |`,
      `| Cohort | \`${mirror.cohort}\` |`,
      "",
      "Do not treat this mirror as an independent source of truth. Release versions, package metadata, and dependency governance are maintained in the monorepo.",
      "",
    ].join("\n"),
  );
  // Root `/dist` only — vendor/*/dist must remain tracked for file: deps.
  writeFileSync(
    join(targetDir, ".gitignore"),
    [
      "node_modules",
      "/dist",
      "!vendor/**/dist",
      "!vendor/**/dist/**",
      "coverage",
      ".turbo",
      ".DS_Store",
      "",
    ].join("\n"),
  );
  // Match monorepo hoist so nested AWS/Smithy (and similar) type packages resolve
  // under TypeScript `moduleResolution: bundler`. Without this, standalone
  // `tsc` sees Client bases without `.send` and Build fails hard.
  writeFileSync(
    join(targetDir, ".npmrc"),
    ["public-hoist-pattern[]=*", "shamefully-hoist=false", ""].join("\n"),
  );
}

function writeMirrorWorkflow(targetDir) {
  const workflowDir = join(targetDir, ".github", "workflows");
  mkdirSync(workflowDir, { recursive: true });
  // Standalone package CI — must not assume monorepo layout or CJS require().
  // @nebutra/* deps publish dist+.d.ts (0.1.3+); vendor path remains as fallback.
  writeFileSync(
    join(workflowDir, "ci.yml"),
    [
      "name: CI",
      "",
      "on:",
      "  pull_request:",
      "  push:",
      "    branches: [main]",
      "",
      "permissions:",
      "  contents: read",
      "",
      "jobs:",
      "  package:",
      "    runs-on: ubuntu-latest",
      "    timeout-minutes: 15",
      "    steps:",
      "      - uses: actions/checkout@v4",
      "      - uses: pnpm/action-setup@v4",
      "        with:",
      "          version: 10.32.1",
      "      - uses: actions/setup-node@v4",
      "        with:",
      "          node-version: 22",
      "          # No pnpm-lock.yaml in standalone mirrors — caching requires a lockfile.",
      "      - name: Install",
      "        run: pnpm install --no-frozen-lockfile --ignore-scripts",
      "      - name: Build",
      "        run: |",
      "          if jq -e '.scripts.build // empty' package.json >/dev/null; then",
      "            pnpm run build",
      "          else",
      "            echo 'no build script'",
      "          fi",
      "      - name: Typecheck",
      "        # Hard gate: published @nebutra/* packages ship dist+.d.ts.",
      "        run: |",
      "          if jq -e '.scripts.typecheck // empty' package.json >/dev/null; then",
      "            pnpm run typecheck",
      "          else",
      "            echo 'no typecheck script'",
      "          fi",
      "      - name: Test",
      "        # Soft-fail: monorepo-only harnesses (extensionless node:test, etc.).",
      "        # Install + build + typecheck remain hard gates.",
      "        continue-on-error: true",
      "        run: |",
      "          if jq -e '.scripts.test // empty' package.json >/dev/null; then",
      "            pnpm run test",
      "          else",
      "            echo 'no test script'",
      "          fi",
      "",
    ].join("\n"),
  );
}

function buildMirror(root, mirror, targetDir, catalogVersions, workspaceVersions, packageByName) {
  const sourceDir = join(root, mirror.sourceDir);
  rmSync(targetDir, { recursive: true, force: true });
  copyTree(sourceDir, targetDir);
  normalizePackageJson(root, mirror, targetDir, catalogVersions, workspaceVersions, packageByName);
  normalizeTsconfig(root, targetDir);
  prependReadmeBanner(targetDir, mirror);
  writeMirrorMetadata(targetDir, mirror);
  writeMirrorWorkflow(targetDir);

  const fileCount = countFiles(targetDir);
  if (fileCount < 5) {
    throw new Error(`${mirror.repoName} generated mirror is suspiciously small`);
  }

  console.log(
    `[subrepo-sync] built ${mirror.packageName} -> ${toPosix(targetDir)} (${fileCount} files)`,
  );
}

function countFiles(dir) {
  let count = 0;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) count += countFiles(full);
    else count += 1;
  }
  return count;
}

function git(args, cwd, env = {}) {
  execFileSync("git", args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: "inherit",
  });
}

function gitSilent(args, cwd, env = {}) {
  execFileSync("git", args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: "ignore",
  });
}

function pushMirror(mirror, targetDir, sourceSha) {
  const token = getGithubToken();
  if (!token) {
    throw new Error("No GitHub token available for subrepo mirror push");
  }

  const remote = `https://x-access-token:${encodeURIComponent(token)}@github.com/${mirror.owner}/${mirror.repoName}.git`;

  git(["init", "-q"], targetDir);
  git(["config", "user.email", "bot@nebutra.com"], targetDir);
  git(["config", "user.name", "Nebutra Mirror Bot"], targetDir);
  git(["checkout", "-q", "-B", "main"], targetDir);
  git(["add", "-A"], targetDir);
  git(
    ["commit", "--allow-empty", "-q", "-m", `chore: sync from Nebutra-Sailor@${sourceSha}`],
    targetDir,
  );
  try {
    gitSilent(["remote", "remove", "origin"], targetDir, { GIT_TERMINAL_PROMPT: "0" });
  } catch {
    // Fresh mirrors do not have a remote yet.
  }
  git(["remote", "add", "origin", remote], targetDir);
  git(["push", "-qf", "origin", "main"], targetDir, { GIT_TERMINAL_PROMPT: "0" });
  console.log(`[subrepo-sync] pushed ${mirror.owner}/${mirror.repoName}`);
}

function main() {
  const root = process.cwd();
  const args = parseArgs(process.argv.slice(2));
  const { releaseSurface, mirrors } = resolveSubrepoMirrors({
    cohort: args.cohort,
    packageName: args.packageName,
    repoName: args.repoName,
  });

  if (!args.all && !args.packageName && !args.repoName && mirrors.length !== 1) {
    throw new Error("Select one mirror with --package/--repo or pass --all");
  }

  const selectedMirrors =
    args.all || args.packageName || args.repoName ? mirrors : mirrors.slice(0, 1);
  const outputRoot = resolve(args.out);
  const catalogVersions = readCatalogVersions(root);
  const workspaceVersions = new Map(
    releaseSurface.publishable.map((entry) => [entry.manifest.name, entry.manifest.version]),
  );
  const packageByName = new Map(
    releaseSurface.publishable.map((entry) => [entry.manifest.name, entry]),
  );
  const sourceSha = getCurrentGitSha(root);

  rmSync(outputRoot, { recursive: true, force: true });
  mkdirSync(outputRoot, { recursive: true });

  for (const mirror of selectedMirrors) {
    const targetDir =
      selectedMirrors.length === 1 && !args.all ? outputRoot : join(outputRoot, mirror.repoName);
    buildMirror(root, mirror, targetDir, catalogVersions, workspaceVersions, packageByName);
    if (args.push) pushMirror(mirror, targetDir, sourceSha);
  }

  console.log(`[subrepo-sync] completed ${selectedMirrors.length} mirror(s)`);
}

try {
  main();
} catch (error) {
  console.error(`[subrepo-sync] ${error.message}`);
  process.exit(1);
}
