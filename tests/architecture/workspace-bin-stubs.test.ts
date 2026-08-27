import { describe, expect, it } from "vitest";

import { readWorkspacePackages } from "../../scripts/lib/release-surface.mjs";

function binTargets(bin: unknown): string[] {
  if (typeof bin === "string") return [bin];
  if (bin && typeof bin === "object") {
    return Object.values(bin).filter((value): value is string => typeof value === "string");
  }
  return [];
}

function normalizeBinPath(target: string): string {
  return target.replace(/^\.\//, "");
}

describe("workspace package bins", () => {
  it("stubs every dist bin so a clean install can link without a prior build", () => {
    const missing = [];

    for (const entry of readWorkspacePackages()) {
      const prepare = String(entry.manifest.scripts?.prepare ?? "");

      for (const target of binTargets(entry.manifest.bin)) {
        const relative = normalizeBinPath(target);
        if (!relative.startsWith("dist/")) continue;
        if (prepare.includes(relative)) continue;

        missing.push(`${entry.manifest.name} bin ${target} is not created by scripts.prepare`);
      }
    }

    expect(missing).toEqual([]);
  });
});
