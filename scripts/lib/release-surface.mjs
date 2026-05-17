import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";

const packageGroups = new Set(["packages", "apps", "backends"]);

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function walkPackageJsons(root, dir = root, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;

    const absolutePath = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkPackageJsons(root, absolutePath, out);
    } else if (entry.name === "package.json") {
      const rel = relative(root, absolutePath);
      if (rel.includes("/templates/")) continue;
      if (packageGroups.has(rel.split("/")[0])) {
        out.push(absolutePath);
      }
    }
  }

  return out;
}

export function readWorkspacePackages(root = process.cwd()) {
  return walkPackageJsons(root)
    .map((manifestPath) => {
      const manifest = readJson(manifestPath);
      return {
        manifest,
        manifestPath,
        packageDir: dirname(manifestPath),
        relativeDir: relative(root, dirname(manifestPath)),
      };
    })
    .filter((entry) => typeof entry.manifest.name === "string")
    .sort((a, b) => a.manifest.name.localeCompare(b.manifest.name));
}

export function readChangesetPackageNames(root = process.cwd()) {
  const changesetDir = join(root, ".changeset");
  if (!existsSync(changesetDir)) return [];

  const names = [];
  for (const entry of readdirSync(changesetDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".md") || entry.name === "README.md") continue;

    const filePath = join(changesetDir, entry.name);
    const text = readFileSync(filePath, "utf8");
    const frontmatter = text.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatter) continue;

    for (const line of frontmatter[1].split("\n")) {
      const match = line.match(/^"([^"]+)":\s*(patch|minor|major)$/);
      if (match) {
        names.push({
          packageName: match[1],
          changeset: basename(filePath),
        });
      }
    }
  }

  return names.sort((a, b) => a.packageName.localeCompare(b.packageName));
}

export function getReleaseSurfaceDiagnostics(root = process.cwd()) {
  const packages = readWorkspacePackages(root);
  const byName = new Map(packages.map((entry) => [entry.manifest.name, entry]));
  const publishable = packages.filter((entry) => entry.manifest.private !== true);

  const missingChangesetPackages = readChangesetPackageNames(root).filter(
    (entry) => !byName.has(entry.packageName),
  );

  const privateRuntimeDependencies = [];
  for (const entry of publishable) {
    for (const field of ["dependencies", "optionalDependencies"]) {
      for (const dependencyName of Object.keys(entry.manifest[field] ?? {})) {
        const dependency = byName.get(dependencyName);
        if (dependency?.manifest.private === true) {
          privateRuntimeDependencies.push({
            packageName: entry.manifest.name,
            dependencyName,
            field,
            dependencyDir: dependency.relativeDir,
          });
        }
      }
    }
  }

  const requiredMetadataMissing = [];
  for (const entry of publishable) {
    if (!entry.manifest.name?.startsWith("@nebutra/")) continue;

    if (entry.manifest.publishConfig?.access !== "public") {
      requiredMetadataMissing.push({
        packageName: entry.manifest.name,
        field: "publishConfig.access",
        expected: "public",
      });
    }

    if (!entry.manifest.license) {
      requiredMetadataMissing.push({
        packageName: entry.manifest.name,
        field: "license",
        expected: "declared license",
      });
    }

    if (!entry.manifest.repository?.directory) {
      requiredMetadataMissing.push({
        packageName: entry.manifest.name,
        field: "repository.directory",
        expected: entry.relativeDir,
      });
    }
  }

  return {
    packageCount: packages.length,
    publishableCount: publishable.length,
    packages,
    publishable,
    missingChangesetPackages,
    privateRuntimeDependencies,
    requiredMetadataMissing,
  };
}
