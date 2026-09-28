/**
 * JavaScript-only build of the workspace packages a preview app imports.
 *
 * Workspace packages export `dist/`, so an app cannot start until the packages
 * it imports are built. The full build (`pnpm build`, turbo) also emits type
 * declarations and type-checks every package — correct for CI and publishing,
 * and more than two minutes on a fresh clone, almost all of it declarations
 * (`@nebutra/ui` alone: 76 s with them, 5 s without). A dev server needs none
 * of that, so this builds the same packages in dependency order with each
 * package's own build script, rewritten per `&&` step:
 *
 *   tsup …          → tsup … --no-dts        (JavaScript only)
 *   tsc …           → tsc … --noCheck        (emit without type-checking)
 *   tsc --noEmit    → skipped                (a type-check, not a build)
 *   anything else   → unchanged              (style-dictionary, asset copies)
 *
 * A package is rebuilt only when its sources are newer than its last build,
 * so the second `pnpm dev` starts in seconds. Output lands in the same
 * `dist/` the full build writes; `pnpm build` and `pnpm typecheck` rebuild
 * through turbo as before and are unaffected.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export interface WorkspacePackage {
  name: string;
  dir: string;
  deps: string[];
  buildScript: string | undefined;
}

const STAMP = ".sailor-dev-build";

function readJson<T>(file: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch {
    return null;
  }
}

/** Package directories from pnpm-workspace.yaml's `packages:` globs (dir/* and exact dirs). */
function workspaceDirs(root: string): string[] {
  const yaml = fs.readFileSync(path.join(root, "pnpm-workspace.yaml"), "utf8");
  const globs: string[] = [];
  let inPackages = false;
  for (const line of yaml.split("\n")) {
    if (/^packages:\s*$/.test(line)) {
      inPackages = true;
      continue;
    }
    if (inPackages) {
      const match = /^\s+-\s+["']?([^"'#]+?)["']?\s*$/.exec(line);
      if (match?.[1]) globs.push(match[1]);
      else if (/^\S/.test(line)) break;
    }
  }

  const expand = (pattern: string): string[] => {
    const parts = pattern.split("/");
    let dirs = [root];
    for (const part of parts) {
      const next: string[] = [];
      for (const dir of dirs) {
        if (part === "*") {
          for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            if (entry.isDirectory() && !entry.name.startsWith(".")) {
              next.push(path.join(dir, entry.name));
            }
          }
        } else if (fs.existsSync(path.join(dir, part))) {
          next.push(path.join(dir, part));
        }
      }
      dirs = next;
    }
    return dirs;
  };

  return globs.flatMap(expand).filter((dir) => fs.existsSync(path.join(dir, "package.json")));
}

export function readWorkspace(root: string): Map<string, WorkspacePackage> {
  const packages = new Map<string, WorkspacePackage>();
  for (const dir of workspaceDirs(root)) {
    const pkg = readJson<{
      name?: string;
      scripts?: Record<string, string>;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
    }>(path.join(dir, "package.json"));
    if (!pkg?.name) continue;
    const deps = Object.entries({
      ...pkg.peerDependencies,
      ...pkg.devDependencies,
      ...pkg.dependencies,
    })
      .filter(([, range]) => range.startsWith("workspace:"))
      .map(([name]) => name);
    packages.set(pkg.name, { name: pkg.name, dir, deps, buildScript: pkg.scripts?.build });
  }
  return packages;
}

/** Every workspace package the apps depend on (the apps themselves run from source). */
export function packagesToBuild(
  workspace: Map<string, WorkspacePackage>,
  apps: string[],
): WorkspacePackage[] {
  const needed = new Set<string>();
  const visit = (name: string) => {
    for (const dep of workspace.get(name)?.deps ?? []) {
      if (needed.has(dep) || !workspace.has(dep)) continue;
      needed.add(dep);
      visit(dep);
    }
  };
  for (const app of apps) visit(app);
  for (const app of apps) needed.delete(app);
  return [...needed].flatMap((name) => workspace.get(name) ?? []);
}

/** Rewrite one build script into its JavaScript-only form; null when nothing needs to run. */
export function fastBuildCommand(script: string | undefined): string | null {
  if (!script?.trim()) return null;
  const steps = script
    .split("&&")
    .map((step) => step.trim())
    .flatMap((step) => {
      const words = step.split(/\s+/);
      const bin = words.find((word) => !/^[A-Z_][A-Z0-9_]*=/.test(word));
      if (bin === "tsc") {
        if (words.includes("--noEmit")) return [];
        return [`${step} --noCheck`];
      }
      if (bin === "tsup") return [`${step} --no-dts`];
      return [step];
    });
  return steps.length > 0 ? steps.join(" && ") : null;
}

const SKIP_DIRS = new Set(["node_modules", "dist", ".turbo", ".next", "build", "coverage"]);

function newestMtime(dir: string, cutoff: number): number {
  let newest = 0;
  const walk = (current: string) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (SKIP_DIRS.has(entry.name) || entry.name.startsWith(".")) continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else {
        const mtime = fs.statSync(full).mtimeMs;
        if (mtime > newest) newest = mtime;
      }
      if (newest > cutoff) return;
    }
  };
  walk(dir);
  return newest;
}

/** Built after its sources last changed — by this script or by the full build. */
function isFresh(pkg: WorkspacePackage): boolean {
  const dist = path.join(pkg.dir, "dist");
  if (!fs.existsSync(dist)) return false;
  const stamp = path.join(dist, STAMP);
  const builtAt = fs.existsSync(stamp) ? fs.statSync(stamp).mtimeMs : fs.statSync(dist).mtimeMs;
  return newestMtime(pkg.dir, builtAt) <= builtAt;
}

function run(command: string, cwd: string, env: NodeJS.ProcessEnv, root: string) {
  const binPath = [path.join(cwd, "node_modules", ".bin"), path.join(root, "node_modules", ".bin")];
  return new Promise<{ code: number; output: string }>((resolve) => {
    const child = spawn(command, {
      cwd,
      shell: true,
      env: { ...env, PATH: [...binPath, env.PATH ?? ""].join(path.delimiter) },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    child.stdout?.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.on("close", (code) => resolve({ code: code ?? 1, output }));
  });
}

export async function prebuildWorkspacePackages(options: {
  root: string;
  workspace: Map<string, WorkspacePackage>;
  apps: string[];
  env: NodeJS.ProcessEnv;
}): Promise<void> {
  const { root, workspace, apps, env } = options;
  const packages = packagesToBuild(workspace, apps);
  const inGraph = new Set(packages.map((pkg) => pkg.name));
  const started = Date.now();
  let built = 0;
  let skipped = 0;
  // A package whose dependency was rebuilt is rebuilt too: tsup bundles, so a
  // stale copy of the dependency could be inside its output.
  const rebuilt = new Set<string>();

  process.stdout.write(`\n  Preparing ${packages.length} workspace packages (JavaScript only)…\n`);
  const limit = Math.max(2, os.cpus().length - 1);

  const buildOne = async (pkg: WorkspacePackage): Promise<void> => {
    const command = fastBuildCommand(pkg.buildScript);
    const depRebuilt = pkg.deps.some((dep) => rebuilt.has(dep));
    if (!command || (!depRebuilt && isFresh(pkg))) {
      skipped++;
      return;
    }
    const t0 = Date.now();
    const { code, output } = await run(command, pkg.dir, env, root);
    if (code !== 0) {
      process.stderr.write(`\n${output}\n`);
      throw new Error(
        `${pkg.name} failed to build (${command}). Run \`pnpm --filter ${pkg.name} build\` to see the full error.`,
      );
    }
    const dist = path.join(pkg.dir, "dist");
    if (fs.existsSync(dist)) fs.writeFileSync(path.join(dist, STAMP), "");
    rebuilt.add(pkg.name);
    built++;
    process.stdout.write(`    built ${pkg.name} (${((Date.now() - t0) / 1000).toFixed(1)}s)\n`);
  };

  // Each package starts the moment its own dependencies are done, up to
  // `limit` at once — no waiting for a whole "level" to finish.
  const done = new Set<string>();
  const running = new Map<string, Promise<void>>();
  let pending = [...packages];
  while (pending.length > 0 || running.size > 0) {
    const ready = pending.filter((pkg) =>
      pkg.deps.every((dep) => !inGraph.has(dep) || done.has(dep)),
    );
    for (const pkg of ready) {
      if (running.size >= limit) break;
      pending = pending.filter((other) => other !== pkg);
      running.set(
        pkg.name,
        buildOne(pkg).then(() => {
          done.add(pkg.name);
          running.delete(pkg.name);
        }),
      );
    }
    if (running.size === 0) {
      // A dependency cycle: build the rest in any order rather than hang.
      const [next] = pending;
      if (!next) break;
      pending = pending.slice(1);
      await buildOne(next);
      done.add(next.name);
      continue;
    }
    await Promise.race(running.values());
  }

  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  process.stdout.write(`  Packages ready: ${built} built, ${skipped} up to date (${seconds}s)\n`);
}
