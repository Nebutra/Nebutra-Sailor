import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(appRoot, "..", "..");

const runtimeDeps = [
  {
    name: "@nebutra/brand",
    sourcePaths: [
      "packages/design/brand/src",
      "packages/design/brand/package.json",
      "packages/design/brand/tsconfig.json",
      "packages/design/brand/tsup.config.ts",
    ],
    artifacts: [
      "packages/design/brand/dist/index.js",
      "packages/design/brand/dist/index.d.ts",
      "packages/design/brand/dist/metadata.js",
      "packages/design/brand/dist/metadata.d.ts",
    ],
  },
  {
    name: "@nebutra/icons",
    sourcePaths: [
      "packages/design/icons/src",
      "packages/design/icons/package.json",
      "packages/design/icons/tsconfig.json",
      "packages/design/icons/tsconfig.build.json",
    ],
    artifacts: [
      "packages/design/icons/dist/index.js",
      "packages/design/icons/dist/index.mjs",
      "packages/design/icons/dist/index.d.ts",
    ],
  },
  {
    name: "@nebutra/design-tokens",
    sourcePaths: [
      "packages/design/design-tokens/tokens",
      "packages/design/design-tokens/package.json",
      "packages/design/design-tokens/style-dictionary.config.mjs",
      "packages/design/design-tokens/tsconfig.json",
    ],
    artifacts: [
      "packages/design/design-tokens/build/css/styles.generated.css",
      "packages/design/design-tokens/build/ts/nebutra.js",
      "packages/design/design-tokens/build/ts/nebutra.d.ts",
    ],
  },
];

function maxMtimeMs(paths) {
  return Math.max(0, ...paths.map((path) => newestMtimeMs(resolve(repoRoot, path))));
}

function newestMtimeMs(path) {
  if (!existsSync(path)) {
    return 0;
  }

  const stat = statSync(path);
  if (!stat.isDirectory()) {
    return stat.mtimeMs;
  }

  return Math.max(
    stat.mtimeMs,
    ...readdirSync(path, { withFileTypes: true })
      .filter((entry) => !entry.name.startsWith("."))
      .map((entry) => newestMtimeMs(resolve(path, entry.name))),
  );
}

function oldestArtifactMtimeMs(paths) {
  let oldest = Number.POSITIVE_INFINITY;

  for (const path of paths) {
    const artifactPath = resolve(repoRoot, path);
    if (!existsSync(artifactPath)) {
      return 0;
    }
    oldest = Math.min(oldest, statSync(artifactPath).mtimeMs);
  }

  return oldest;
}

function needsBuild(dep) {
  const sourceMtime = maxMtimeMs(dep.sourcePaths);
  const artifactMtime = oldestArtifactMtimeMs(dep.artifacts);

  return artifactMtime === 0 || sourceMtime > artifactMtime;
}

for (const dep of runtimeDeps) {
  if (!needsBuild(dep)) {
    process.stdout.write(`${dep.name}: runtime artifacts are current\n`);
    continue;
  }

  process.stdout.write(`${dep.name}: building runtime artifacts\n`);
  const result = spawnSync("pnpm", ["--filter", dep.name, "build"], {
    cwd: repoRoot,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
