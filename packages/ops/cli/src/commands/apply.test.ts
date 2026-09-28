import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { findProjectRoot, mergePreset, readProjectPreset, writeProjectPreset } from "./apply";

let root: string;
const project = () => {
  root = mkdtempSync(join(tmpdir(), "sailor-apply-"));
  mkdirSync(join(root, "packages/design/tokens"), { recursive: true });
  writeFileSync(join(root, "packages/design/tokens/package.json"), "{}");
  return root;
};
afterEach(() => root && rmSync(root, { recursive: true, force: true }));

describe("nebutra apply", () => {
  it("finds the project from anywhere inside it", () => {
    const dir = project();
    mkdirSync(join(dir, "apps/web/src"), { recursive: true });
    expect(findProjectRoot(join(dir, "apps/web/src"))).toBe(dir);
  });

  it("writes one file, the code, and reads the same preset back", () => {
    const dir = project();
    const result = writeProjectPreset(dir, { base: "linear", brandColor: "#7c3aed", radius: "lg" });
    const file = join(dir, "packages/design/tokens/project/preset");
    expect(readFileSync(file, "utf8").trim()).toBe(result.code);
    expect(readProjectPreset(dir)).toEqual({ base: "linear", brandColor: "#7c3aed", radius: "lg" });
  });

  it("returns to factory by removing the file", () => {
    const dir = project();
    writeProjectPreset(dir, { base: "linear" });
    writeProjectPreset(dir, { base: "factory" });
    expect(existsSync(join(dir, "packages/design/tokens/project/preset"))).toBe(false);
  });

  it("--only fonts keeps the colours, --only theme keeps the faces", () => {
    const current = { base: "linear" as const, brandColor: "#7c3aed", sans: "Inter" as const };
    const next = { base: "stripe" as const, sans: "Manrope" as const };
    expect(mergePreset(current, next, "fonts")).toEqual({
      base: "linear",
      brandColor: "#7c3aed",
      sans: "Manrope",
    });
    expect(mergePreset(current, next, "theme")).toEqual({ base: "stripe", sans: "Inter" });
  });
});
