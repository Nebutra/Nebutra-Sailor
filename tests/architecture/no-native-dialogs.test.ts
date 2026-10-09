import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * window.alert / confirm / prompt are banned outright (zero remaining), not
 * ratcheted: they block the main thread, cannot be themed or translated, and
 * Chrome lets users suppress them, after which confirm() silently returns
 * false. The replacements are useConfirm() / usePrompt() from
 * @nebutra/ui/primitives. The ban lives in Biome (suspicious/noAlert), so this
 * pins the rule's severity — downgrading it to a warning would let `pnpm lint`
 * (which runs at --diagnostic-level=error) pass a new native dialog.
 */
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

describe("native browser dialogs", () => {
  it("are an error-level Biome diagnostic across the repo", () => {
    const biome = JSON.parse(readFileSync(resolve(ROOT, "biome.json"), "utf-8"));
    expect(biome.linter.rules.suspicious.noAlert).toBe("error");
    for (const override of biome.overrides ?? []) {
      expect(override.linter?.rules?.suspicious?.noAlert, JSON.stringify(override.includes)).toBe(
        undefined,
      );
    }
  });
});
