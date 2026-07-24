#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
/**
 * prepare-pnpm-deploy-node-runtime.mjs
 *
 * After `pnpm deploy --prod` of a Node service (e.g. @nebutra/gateway), the
 * stage tree still contains workspace packages that either:
 *   (a) advertise TypeScript sources via package.json `exports` (./src/*.ts), or
 *   (b) advertise ./dist/*.js that was never built.
 *
 * Plain Node cannot load .ts (no tsx) and fails on missing dist. This script:
 *  1. Walks the deployed package + node_modules/@nebutra/*
 *  2. For each runtime entry (main / exports):
 *     - Resolves a TypeScript source when the declared .js target is missing
 *     - esbuild-bundles the entry (relative imports inlined; node_modules external)
 *     - Rewrites remaining .ts/.tsx export targets to dist/*.js
 *  3. Writes package.json via unlink+write to break pnpm-deploy hardlinks so
 *     monorepo sources are never mutated
 *
 * Usage:
 *   node scripts/prepare-pnpm-deploy-node-runtime.mjs <stage-dir>
 */
import { build } from "esbuild";

const stageRoot = path.resolve(process.argv[2] || "");
if (!stageRoot || !fs.existsSync(stageRoot)) {
  console.error("Usage: node scripts/prepare-pnpm-deploy-node-runtime.mjs <stage-dir>");
  process.exit(1);
}

function listPackageJsonFiles(root) {
  const out = [];
  const rootPkg = path.join(root, "package.json");
  if (fs.existsSync(rootPkg)) out.push(rootPkg);

  const scoped = path.join(root, "node_modules", "@nebutra");
  if (!fs.existsSync(scoped)) return out;
  for (const name of fs.readdirSync(scoped)) {
    const pkgFile = path.join(scoped, name, "package.json");
    if (fs.existsSync(pkgFile)) out.push(pkgFile);
  }
  return out;
}

function isTsSource(value) {
  if (typeof value !== "string") return false;
  if (/\.d\.tsx?$/.test(value)) return false;
  return /\.tsx?$/.test(value);
}

function isJsTarget(value) {
  return typeof value === "string" && /\.m?jsx?$/.test(value) && !/\.d\.tsx?$/.test(value);
}

function stripDot(p) {
  return p.replace(/^\.\//, "");
}

function distRelForSource(srcRel) {
  let s = stripDot(srcRel);
  if (s.startsWith("src/")) s = s.slice(4);
  s = s.replace(/\.tsx?$/, ".js");
  if (s.startsWith("dist/")) return s;
  return path.posix.join("dist", s);
}

/** Collect declared export strings only (no filesystem expansion). */
function collectDeclaredStrings(pkg) {
  /** @type {{ subpath: string, value: string }[]} */
  const out = [];
  const add = (subpath, value) => {
    if (typeof value === "string") out.push({ subpath, value });
  };

  if (typeof pkg.main === "string") add(".", pkg.main);
  if (typeof pkg.module === "string") add(".", pkg.module);

  const walk = (exp, subpath = ".") => {
    if (typeof exp === "string") {
      add(subpath, exp);
      return;
    }
    if (!exp || typeof exp !== "object") return;
    if (
      "default" in exp ||
      "import" in exp ||
      "require" in exp ||
      "types" in exp ||
      "source" in exp
    ) {
      const pick = exp.source || exp.import || exp.default || exp.require;
      if (typeof pick === "string") add(subpath, pick);
      return;
    }
    for (const [key, val] of Object.entries(exp)) {
      const next = key === "." ? "." : key.startsWith("./") ? key : `./${key}`;
      walk(val, next);
    }
  };
  if (pkg.exports) walk(pkg.exports);
  return out;
}

/**
 * Resolve concrete (sourceAbs, outRel) pairs for one declared export value.
 * @returns {{ sourceAbs: string, outRel: string }[]}
 */
function resolveCompileJobs(pkgDir, declaredValue) {
  const value = stripDot(declaredValue);
  /** @type {{ sourceAbs: string, outRel: string }[]} */
  const jobs = [];

  if (value.includes("*")) {
    // Glob: prefer src/ when declared under dist/
    const star = value.indexOf("*");
    const before = value.slice(0, star);
    const srcDir = before.startsWith("dist/")
      ? before.replace(/^dist\//, "src/")
      : before.startsWith("src/")
        ? before
        : `src/${before}`;
    const absDir = path.join(pkgDir, srcDir);
    if (!fs.existsSync(absDir)) return jobs;
    for (const name of fs.readdirSync(absDir)) {
      if (!name.endsWith(".ts") && !name.endsWith(".tsx")) continue;
      if (name.endsWith(".test.ts") || name.endsWith(".test.tsx") || name.endsWith(".d.ts"))
        continue;
      const srcRel = path.posix.join(srcDir, name);
      jobs.push({
        sourceAbs: path.join(pkgDir, srcRel),
        outRel: distRelForSource(srcRel),
      });
    }
    return jobs;
  }

  if (isTsSource(value)) {
    const abs = path.join(pkgDir, value);
    if (fs.existsSync(abs)) {
      jobs.push({ sourceAbs: abs, outRel: distRelForSource(value) });
    }
    return jobs;
  }

  if (isJsTarget(value)) {
    const absJs = path.join(pkgDir, value);
    if (fs.existsSync(absJs)) return jobs; // already built
    const withoutExt = value.replace(/\.m?jsx?$/, "");
    const candidates = [];
    if (withoutExt.startsWith("dist/")) {
      const rest = withoutExt.slice("dist/".length);
      candidates.push(`src/${rest}.ts`, `src/${rest}.tsx`, `${rest}.ts`, `${rest}.tsx`);
    } else if (!withoutExt.startsWith("build/")) {
      candidates.push(
        `${withoutExt}.ts`,
        `${withoutExt}.tsx`,
        `src/${path.basename(withoutExt)}.ts`,
      );
    }
    for (const c of candidates) {
      const abs = path.join(pkgDir, c);
      if (fs.existsSync(abs)) {
        jobs.push({
          sourceAbs: abs,
          outRel: value.startsWith("dist/") ? value : distRelForSource(c),
        });
        break;
      }
    }
  }

  return jobs;
}

function rewritePackageJson(pkg) {
  // Glob rewrite without identity replacements or single-occurrence star rewrites.
  const mapExport = (value) => {
    if (typeof value !== "string") return value;
    if (value.includes("*")) {
      return value
        .replace(/^\.\/src\//, "./dist/")
        .replace(/\.tsx?(?=\*|$)/g, ".js")
        .replace(/\*\.tsx?/g, "*.js");
    }
    return mapExport(value);
  };

  if (typeof pkg.main === "string") pkg.main = mapExport(pkg.main);
  if (typeof pkg.module === "string") pkg.module = mapExport(pkg.module);
  if (typeof pkg.types === "string" && isTsSource(pkg.types)) {
    pkg.types = mapExport(pkg.types).replace(/\.js$/, ".d.ts");
  }

  const rewriteExports = (exp) => {
    if (typeof exp === "string") return mapExport(exp);
    if (!exp || typeof exp !== "object") return exp;
    if (
      "default" in exp ||
      "import" in exp ||
      "require" in exp ||
      "types" in exp ||
      "source" in exp
    ) {
      const next = { ...exp };
      if (next.source) delete next.source;
      if (next.import) next.import = mapExport(next.import);
      if (next.require) next.require = mapExport(next.require);
      if (next.default) next.default = mapExport(next.default);
      if (typeof next.types === "string" && isTsSource(next.types)) {
        next.types = mapExport(next.types).replace(/\.js$/, ".d.ts");
      }
      const js = next.import || next.default || next.require;
      if (js) {
        next.import = next.import || js;
        next.default = next.default || js;
      }
      return next;
    }
    const out = {};
    for (const [k, v] of Object.entries(exp)) out[k] = rewriteExports(v);
    return out;
  };

  if (pkg.exports) pkg.exports = rewriteExports(pkg.exports);
  return pkg;
}

/** Write package.json without mutating monorepo hardlinks from pnpm deploy. */
function writePackageJson(pkgFile, pkg) {
  const content = `${JSON.stringify(pkg, null, 2)}\n`;
  // Only ever write inside the stage tree. pnpm deploy hardlinks workspace
  // package files into the stage; unlink+write breaks the hardlink so the
  // monorepo copy is left untouched.
  const real = fs.realpathSync(pkgFile);
  if (!real.startsWith(stageRoot) && !pkgFile.startsWith(stageRoot)) {
    throw new Error(`refusing to write package.json outside stage: ${real}`);
  }
  try {
    // Unlink the stage-side path (after symlink resolution if still under stage)
    if (real.startsWith(stageRoot)) fs.unlinkSync(real);
    else fs.unlinkSync(pkgFile);
  } catch {
    // ignore missing
  }
  fs.writeFileSync(pkgFile, content);
}

async function compileJobs(pkgDir, jobs) {
  // Deduplicate by outRel
  const byOut = new Map();
  for (const j of jobs) {
    if (!fs.existsSync(j.sourceAbs)) continue;
    byOut.set(j.outRel, j);
  }
  if (byOut.size === 0) return 0;

  // Bundle each entry so extensionless relative imports work under plain Node.
  // node_modules stay external via packages:"external".
  await Promise.all(
    [...byOut.values()].map(async (j) => {
      const outfile = path.join(pkgDir, j.outRel);
      fs.mkdirSync(path.dirname(outfile), { recursive: true });
      await build({
        entryPoints: [j.sourceAbs],
        outfile,
        bundle: true,
        format: "esm",
        platform: "node",
        target: "node20",
        sourcemap: false,
        packages: "external",
        logLevel: "warning",
        loader: { ".ts": "ts", ".tsx": "tsx", ".js": "js", ".json": "json" },
      });
    }),
  );
  return byOut.size;
}

function isWorkspacePackage(pkg) {
  const name = pkg.name || "";
  return name.startsWith("@nebutra/") || pkg.private === true;
}

function stillHasTsExports(pkg) {
  return collectDeclaredStrings(pkg).some(({ value }) => isTsSource(value));
}

/**
 * tsc-emitted ESM often keeps extensionless relative imports
 * (`from "./factory"`). Plain Node ESM requires `./factory.js`.
 * Rewrite in-place under dist/ (and build/) for workspace packages
 * that shipped without source in the deploy stage.
 */
function fixExtensionlessRelativeImports(pkgDir) {
  const roots = ["dist", "build"].map((d) => path.join(pkgDir, d)).filter((d) => fs.existsSync(d));
  if (roots.length === 0) return 0;

  let fixed = 0;
  const stack = [...roots];
  const files = [];
  while (stack.length) {
    const dir = stack.pop();
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) stack.push(full);
      else if (ent.isFile() && ent.name.endsWith(".js")) files.push(full);
    }
  }

  // Match: from/import/export ... "relative-path-without-extension"
  const re =
    /(\bfrom\s+|import\s*\(\s*|export\s+\*\s+from\s+|export\s+\{[^}]*\}\s+from\s+)(['"])(\.[^'"]+?)\2/g;

  for (const file of files) {
    let src;
    try {
      src = fs.readFileSync(file, "utf8");
    } catch {
      continue;
    }
    let changed = false;
    const next = src.replace(re, (match, prefix, quote, spec) => {
      // already has a file extension (.js/.mjs/.cjs/.json/.node)
      if (/\.[cm]?js$|\.json$|\.node$/.test(spec)) return match;
      // skip bare-ish
      if (!spec.startsWith(".")) return match;

      const baseDir = path.dirname(file);
      const candidates = [
        `${spec}.js`,
        `${spec}.mjs`,
        `${spec}.cjs`,
        path.posix.join(spec, "index.js"),
      ];
      for (const cand of candidates) {
        const abs = path.resolve(baseDir, cand);
        if (fs.existsSync(abs)) {
          changed = true;
          // Keep POSIX-style relative path in the rewritten import
          let rel = cand;
          if (!rel.startsWith(".")) rel = `./${rel}`;
          return `${prefix}${quote}${rel}${quote}`;
        }
      }
      return match;
    });

    if (changed) {
      // Break hardlinks before write
      try {
        fs.unlinkSync(file);
      } catch {
        // ignore
      }
      fs.writeFileSync(file, next);
      fixed++;
    }
  }
  return fixed;
}

async function main() {
  const pkgFiles = listPackageJsonFiles(stageRoot);
  let rewritten = 0;
  let compiledFiles = 0;
  let fixedImportFiles = 0;
  let touched = 0;
  let skipped = 0;
  const failures = [];

  for (const pkgFile of pkgFiles) {
    const pkgDir = path.dirname(fs.realpathSync(pkgFile));
    let pkg;
    try {
      pkg = JSON.parse(fs.readFileSync(pkgFile, "utf8"));
    } catch {
      continue;
    }
    if (!isWorkspacePackage(pkg)) {
      skipped++;
      continue;
    }

    const name = pkg.name || path.basename(pkgDir);
    const declared = collectDeclaredStrings(pkg);
    if (declared.length === 0) {
      skipped++;
      continue;
    }

    let needsRewrite = false;
    /** @type {{ sourceAbs: string, outRel: string }[]} */
    const pending = [];

    for (const { value } of declared) {
      if (isTsSource(value) || (value.includes("*") && /\.tsx?(?=\*|$)/.test(value))) {
        needsRewrite = true;
      }
      const v = stripDot(value);

      // Glob exports — compile every matching src file (even if dist exists)
      if (v.includes("*")) {
        pending.push(...resolveCompileJobs(pkgDir, value));
        continue;
      }

      // Resolve source and rebundle when source is present in the stage.
      // (pnpm deploy --prod often omits src/ when package.json `files` is dist-only.)
      /** @type {string[]} */
      let srcCandidates = [];
      /** @type {string} */
      let outRel = "";
      if (isTsSource(v)) {
        srcCandidates = [v];
        outRel = distRelForSource(v);
      } else if (isJsTarget(v)) {
        outRel = v;
        // Dist already present → skip esbuild (gateway deps now ship prebuilt
        // dist; rebundling was pure overhead after the dist-graph paydown).
        if (fs.existsSync(path.join(pkgDir, v))) {
          continue;
        }
        const withoutExt = v.replace(/\.m?jsx?$/, "");
        if (withoutExt.startsWith("dist/")) {
          const rest = withoutExt.slice("dist/".length);
          srcCandidates = [`src/${rest}.ts`, `src/${rest}.tsx`, `${rest}.ts`, `${rest}.tsx`];
        } else if (!withoutExt.startsWith("build/")) {
          srcCandidates = [
            `${withoutExt}.ts`,
            `${withoutExt}.tsx`,
            `src/${path.posix.basename(withoutExt)}.ts`,
            `src/${path.posix.basename(withoutExt)}.tsx`,
          ];
        }
      }
      for (const c of srcCandidates) {
        const abs = path.join(pkgDir, c);
        if (fs.existsSync(abs)) {
          pending.push({ sourceAbs: abs, outRel });
          break;
        }
      }
    }

    // Always run extension fix on dist-only packages (and after compile).
    const hasDist =
      fs.existsSync(path.join(pkgDir, "dist")) || fs.existsSync(path.join(pkgDir, "build"));
    if (!needsRewrite && pending.length === 0 && !hasDist) {
      skipped++;
      continue;
    }

    console.log(
      `prepare: ${name}${pending.length ? ` (compile ${pending.length})` : ""}${hasDist && !pending.length ? " (fix-imports)" : ""}`,
    );
    touched++;
    try {
      if (pending.length) {
        compiledFiles += await compileJobs(pkgDir, pending);
      }
      if (needsRewrite) {
        const next = rewritePackageJson(structuredClone(pkg));
        writePackageJson(pkgFile, next);
        rewritten++;
        pkg = next;
      }

      // Fix tsc dist that only ships .js without source in the stage
      fixedImportFiles += fixExtensionlessRelativeImports(pkgDir);

      if (stillHasTsExports(pkg)) {
        failures.push(
          `${name}: still exports TS: ${collectDeclaredStrings(pkg)
            .filter(({ value }) => isTsSource(value))
            .map(({ value }) => value)
            .join(", ")}`,
        );
      }

      const mainRel = stripDot(pkg.main || "");
      if (mainRel && isJsTarget(mainRel) && !mainRel.includes("*")) {
        if (!fs.existsSync(path.join(pkgDir, mainRel))) {
          failures.push(`${name}: missing main ${mainRel}`);
        }
      }
    } catch (err) {
      failures.push(`${name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Final pass
  for (const pkgFile of pkgFiles) {
    let pkg;
    try {
      pkg = JSON.parse(fs.readFileSync(pkgFile, "utf8"));
    } catch {
      continue;
    }
    const name = pkg.name || "";
    if (!name.startsWith("@nebutra/")) continue;
    if (stillHasTsExports(pkg)) {
      const left = collectDeclaredStrings(pkg)
        .filter(({ value }) => isTsSource(value))
        .map(({ value }) => value);
      failures.push(`${name}: leftover TS exports: ${left.join(", ")}`);
    }
  }

  console.log(
    `done: touched=${touched} rewritten=${rewritten} compiled_files=${compiledFiles} fixed_import_files=${fixedImportFiles} skipped=${skipped} failures=${failures.length}`,
  );
  if (failures.length) {
    for (const f of failures) console.error("  FAIL", f);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
