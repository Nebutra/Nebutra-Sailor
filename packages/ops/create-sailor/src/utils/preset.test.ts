import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { readPresetOption, writeScaffoldPreset } from "./preset";

let target: string;
afterEach(() => target && rmSync(target, { recursive: true, force: true }));

describe("create-sailor --preset", () => {
  it("rejects a mistyped code before anything is downloaded", () => {
    expect(() => readPresetOption("not a code")).toThrow();
  });

  it("writes the canonical code to the project's one look file", () => {
    target = mkdtempSync(join(tmpdir(), "sailor-scaffold-"));
    const code = writeScaffoldPreset(target, readPresetOption("linear"));
    const file = join(target, "packages/design/tokens/project/preset");
    expect(readFileSync(file, "utf8").trim()).toBe(code);
  });

  it("writes nothing for factory: the House tokens are the default", () => {
    target = mkdtempSync(join(tmpdir(), "sailor-scaffold-"));
    expect(writeScaffoldPreset(target, readPresetOption("factory"))).toBeNull();
    expect(writeScaffoldPreset(target, null)).toBeNull();
    expect(existsSync(join(target, "packages/design/tokens/project/preset"))).toBe(false);
  });
});
