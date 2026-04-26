import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const hooks = await import("../../scripts/install-git-hooks.mjs");

describe("git hook prepare guard", () => {
  it("keeps package prepare behind the guarded installer", async () => {
    const packageJson = JSON.parse(await readFile(join(process.cwd(), "package.json"), "utf8")) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.prepare).toBe("node scripts/install-git-hooks.mjs");
  });

  it("skips hook installation in CI-style installs", () => {
    expect(hooks.shouldSkipHookInstall({ CI: "1" })).toBe(true);
    expect(hooks.shouldSkipHookInstall({ CI: "true" })).toBe(true);
    expect(hooks.shouldSkipHookInstall({ NEBUTRA_SKIP_GIT_HOOKS: "1" })).toBe(true);
    expect(hooks.shouldSkipHookInstall({ HUSKY: "0" })).toBe(true);
  });

  it("allows explicit local hook installation to override CI", () => {
    expect(
      hooks.shouldSkipHookInstall({
        CI: "true",
        NEBUTRA_INSTALL_GIT_HOOKS: "1",
      }),
    ).toBe(false);
  });
});
