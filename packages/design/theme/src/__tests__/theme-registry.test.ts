import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { getThemeById, THEME_IDS, THEME_REGISTRY } from "../index";

function getTokenAtPath(tokens: Record<string, unknown>, tokenPath: string): unknown {
  return tokenPath.split(".").reduce<unknown>((node, key) => {
    if (!node || typeof node !== "object") return undefined;
    return (node as Record<string, unknown>)[key];
  }, tokens);
}

describe("@nebutra/theme registry contract", () => {
  it("exports deterministic theme ids from the registry", () => {
    expect(THEME_IDS).toEqual(["neon", "gradient", "dark-dense", "minimal", "vibrant", "ocean"]);
  });

  it("exposes install and governance metadata for each built-in theme", () => {
    for (const theme of THEME_REGISTRY.themes) {
      expect(theme.id).toMatch(/^[a-z0-9-]+$/u);
      expect(theme.tokenPath).toBe(`tokens/themes/${theme.id}.json`);
      expect(theme.install.command).toContain(`nebutra theme add ${theme.id}`);
      expect(theme.governance.requiredTokens.length).toBeGreaterThan(0);
      expect(theme.governance.wcag).toBe("AA");
      expect(theme.compatibility.tailwind).toBe("4");
      expect(theme.compatibility.figmaVariables).toBe(true);
    }
  });

  it("keeps registry token paths and required tokens backed by DTCG files", async () => {
    for (const theme of THEME_REGISTRY.themes) {
      const tokenFile = new URL(`../../../design-tokens/${theme.tokenPath}`, import.meta.url);
      const tokens = JSON.parse(await readFile(tokenFile, "utf8")) as Record<string, unknown>;

      expect(tokens.theme).toBe(theme.id);

      for (const requiredToken of theme.governance.requiredTokens) {
        expect(getTokenAtPath(tokens, requiredToken)).toMatchObject({
          $type: expect.any(String),
          $value: expect.any(String),
        });
      }
    }
  });

  it("supports lookup by id without callers hardcoding theme details", () => {
    expect(getThemeById("neon")?.mood).toContain("AI");
    expect(getThemeById("missing")).toBeUndefined();
  });
});
