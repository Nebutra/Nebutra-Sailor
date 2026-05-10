import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Resolve the package version from package.json at runtime.
 *
 * This is the single source of truth for the CLI version, avoiding drift
 * between hardcoded constants and the published package metadata.
 *
 * Path resolution works in both environments:
 *   - Production:  dist/index.js  → ../package.json
 *   - Development: src/index.ts   → ../package.json (src is also one level deep)
 *
 * Falls back to "0.0.0-dev" if package.json cannot be read so the CLI never
 * crashes on a malformed install.
 */
function resolveVersion(): string {
  try {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    // Walk up until we find a package.json (handles both src/ and src/ui/ callers).
    let dir = currentDir;
    for (let i = 0; i < 4; i++) {
      const candidate = path.join(dir, "package.json");
      if (fs.existsSync(candidate)) {
        const raw = fs.readFileSync(candidate, "utf-8");
        const pkg = JSON.parse(raw) as { version?: string; name?: string };
        if (pkg.name === "create-sailor" && typeof pkg.version === "string") {
          return pkg.version;
        }
      }
      dir = path.dirname(dir);
    }
    return "0.0.0-dev";
  } catch {
    return "0.0.0-dev";
  }
}

export const VERSION: string = resolveVersion();
