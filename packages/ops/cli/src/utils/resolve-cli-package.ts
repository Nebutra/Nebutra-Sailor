import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Locate packages/ops/cli/package.json from either src/ or the bundled dist/.
 * tsup inlines every module into dist/index.js, so a hard-coded ../ or ../../
 * only works for one of those two layouts.
 */
export function resolveCliPackageJson(from = import.meta.url): string {
  let current = dirname(fileURLToPath(from));
  for (let i = 0; i < 6; i += 1) {
    const candidate = join(current, "package.json");
    if (existsSync(candidate)) {
      try {
        const pkg = JSON.parse(readFileSync(candidate, "utf8")) as { name?: string };
        if (pkg.name === "nebutra") return candidate;
      } catch {
        // keep walking
      }
    }
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  throw new Error("Unable to locate the nebutra CLI package.json");
}

export function readCliVersion(from = import.meta.url): string {
  const pkg = JSON.parse(readFileSync(resolveCliPackageJson(from), "utf8")) as {
    version: string;
  };
  return pkg.version;
}
