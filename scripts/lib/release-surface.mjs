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

function collectManifestFileReferences(value, out = []) {
  if (typeof value === "string") {
    if (value.startsWith("./")) {
      out.push(value);
    }
    return out;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectManifestFileReferences(item, out);
    }
    return out;
  }

  if (value && typeof value === "object") {
    for (const item of Object.values(value)) {
      collectManifestFileReferences(item, out);
    }
  }

  return out;
}

function normalizePackageFileReference(reference) {
  return reference.replace(/^\.\//, "").replace(/[?#].*$/, "");
}

function fileReferenceIncludedByFiles(reference, files) {
  const normalized = normalizePackageFileReference(reference);

  if (normalized === "package.json") {
    return true;
  }

  for (const entry of files) {
    const normalizedEntry = String(entry).replace(/^\.\//, "").replace(/\/$/, "");
    if (!normalizedEntry) continue;

    if (normalizedEntry.includes("*")) {
      const prefix = normalizedEntry.split("*")[0] ?? "";
      if (prefix && normalized.startsWith(prefix)) {
        return true;
      }
      continue;
    }

    if (normalized === normalizedEntry || normalized.startsWith(`${normalizedEntry}/`)) {
      return true;
    }
  }

  return false;
}

/** Protocols that only resolve inside a pnpm/yarn monorepo — not on the public npm registry. */
function isMonorepoOnlyProtocol(range) {
  return (
    typeof range === "string" && (range.startsWith("workspace:") || range.startsWith("catalog:"))
  );
}

export function getReleaseSurfaceDiagnostics(root = process.cwd()) {
  const packages = readWorkspacePackages(root);
  const byName = new Map(packages.map((entry) => [entry.manifest.name, entry]));
  const publishable = packages.filter((entry) => entry.manifest.private !== true);

  const missingChangesetPackages = readChangesetPackageNames(root).filter(
    (entry) => !byName.has(entry.packageName),
  );

  const privateRuntimeDependencies = [];
  const monorepoProtocolRuntimeDependencies = [];
  for (const entry of publishable) {
    for (const field of ["dependencies", "optionalDependencies"]) {
      for (const [dependencyName, range] of Object.entries(entry.manifest[field] ?? {})) {
        if (typeof range === "string" && isMonorepoOnlyProtocol(range)) {
          // Unscoped CLI bins (`npx create-sailor`, `npx nebutra`) are installed
          // by plain npm, which cannot resolve workspace:/catalog:. Keep those
          // protocols out of production deps and bundle workspace packages at
          // build time. Scoped @nebutra/* packages (and libraries) may keep
          // workspace:* — pnpm publish rewrites them on a correct release.
          if (entry.manifest.bin && !entry.manifest.name.startsWith("@")) {
            monorepoProtocolRuntimeDependencies.push({
              packageName: entry.manifest.name,
              dependencyName,
              field,
              range,
            });
          }
        }

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

  const manifestRuntimeFilesExcludedByFiles = [];
  for (const entry of publishable) {
    const files = entry.manifest.files;
    if (!Array.isArray(files) || files.length === 0) {
      continue;
    }

    const references = [
      ...collectManifestFileReferences(entry.manifest.main),
      ...collectManifestFileReferences(entry.manifest.module),
      ...collectManifestFileReferences(entry.manifest.types),
      ...collectManifestFileReferences(entry.manifest.exports),
    ];

    for (const reference of new Set(references)) {
      if (!fileReferenceIncludedByFiles(reference, files)) {
        manifestRuntimeFilesExcludedByFiles.push({
          packageName: entry.manifest.name,
          reference,
          files,
          packageDir: entry.relativeDir,
        });
      }
    }
  }

  return {
    packageCount: packages.length,
    publishableCount: publishable.length,
    packages,
    publishable,
    missingChangesetPackages,
    privateRuntimeDependencies,
    monorepoProtocolRuntimeDependencies,
    requiredMetadataMissing,
    manifestRuntimeFilesExcludedByFiles,
  };
}
