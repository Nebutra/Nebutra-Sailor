import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  getNebutraPackageVersion,
  getNebutraPackageVersionOrNull,
  NEBUTRA_PACKAGE_VERSIONS,
} from "../nebutra-package-versions";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../../");
const CLI_REEXPORT = path.join(REPO_ROOT, "packages/ops/cli/src/utils/nebutra-versions.ts");
const CREATE_SAILOR_REEXPORT = path.join(
  REPO_ROOT,
  "packages/ops/create-sailor/src/utils/nebutra-versions.ts",
);
const PRESET_REGISTRY = "packages/ops/preset/src/nebutra-package-versions";

describe("NEBUTRA_PACKAGE_VERSIONS registry", () => {
  it("lists only packages that exist and are publishable", () => {
    const names = Object.keys(NEBUTRA_PACKAGE_VERSIONS);
    expect(names.length).toBeGreaterThan(10);

    for (const name of names) {
      const range = NEBUTRA_PACKAGE_VERSIONS[name];
      expect(range, name).toMatch(/^\^\d+\.\d+\.\d+$/);

      const pkgPath = findPackageJson(name);
      expect(pkgPath, `manifest for ${name}`).not.toBeNull();
      const manifest = JSON.parse(fs.readFileSync(pkgPath as string, "utf8")) as {
        version: string;
        private?: boolean;
      };
      expect(manifest.private, `${name} must not be private`).not.toBe(true);
      expect(range).toBe(`^${manifest.version}`);
    }
  });

  it("exposes throwing and nullable resolvers", () => {
    const sample = Object.keys(NEBUTRA_PACKAGE_VERSIONS)[0] as string;
    expect(getNebutraPackageVersion(sample)).toBe(NEBUTRA_PACKAGE_VERSIONS[sample]);
    expect(getNebutraPackageVersionOrNull(sample)).toBe(NEBUTRA_PACKAGE_VERSIONS[sample]);
    expect(getNebutraPackageVersionOrNull("@nebutra/does-not-exist-zzz")).toBeNull();
    expect(() => getNebutraPackageVersion("@nebutra/does-not-exist-zzz")).toThrow(
      /not in NEBUTRA_PACKAGE_VERSIONS/,
    );
  });

  it("is the only owned map — CLI and create-sailor re-export it", () => {
    const cli = fs.readFileSync(CLI_REEXPORT, "utf8");
    const createSailor = fs.readFileSync(CREATE_SAILOR_REEXPORT, "utf8");

    expect(cli).toContain(PRESET_REGISTRY);
    expect(cli).not.toMatch(/"@nebutra\/ui":\s*"\^/);
    expect(createSailor).toContain(PRESET_REGISTRY);
    expect(createSailor).not.toMatch(/"@nebutra\/ui":\s*"\^/);
  });

  it("passes package-versions:check against the monorepo", () => {
    const script = path.join(REPO_ROOT, "scripts/sync-nebutra-package-versions.mjs");
    expect(() =>
      execFileSync(process.execPath, [script, "--check"], {
        cwd: REPO_ROOT,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }),
    ).not.toThrow();
  });
});

function findPackageJson(packageName: string): string | null {
  const packagesRoot = path.join(REPO_ROOT, "packages");
  const stack = [packagesRoot];
  while (stack.length > 0) {
    const dir = stack.pop() as string;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (
        entry.name === "node_modules" ||
        entry.name === "dist" ||
        entry.name === ".next" ||
        entry.name === "coverage"
      ) {
        continue;
      }
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
        continue;
      }
      if (entry.name !== "package.json") continue;
      try {
        const manifest = JSON.parse(fs.readFileSync(full, "utf8")) as { name?: string };
        if (manifest.name === packageName) return full;
      } catch {
        // ignore
      }
    }
  }
  return null;
}
