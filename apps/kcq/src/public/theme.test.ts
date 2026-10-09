import { describe, expect, it } from "vitest";
// @ts-expect-error: plain ESM build helper without types.
import { THEME_INIT_SCRIPT } from "../../scripts/landing-plugin.mjs";
import { readThemePreference, resolveThemeMode, storeThemePreference, THEME_STORAGE_KEY } from "./theme";

function memory() {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    removeItem: (key: string) => void values.delete(key),
  };
}

describe("colour mode", () => {
  it("lets an explicit choice win and falls back to the system preference", () => {
    expect(resolveThemeMode("system", true)).toBe("dark");
    expect(resolveThemeMode("system", false)).toBe("light");
    expect(resolveThemeMode("light", true)).toBe("light");
  });

  it("persists explicit choices and forgets them for system", () => {
    const storage = memory();
    storeThemePreference(storage, "dark");
    expect(readThemePreference(storage)).toBe("dark");
    storeThemePreference(storage, "system");
    expect(storage.values.has(THEME_STORAGE_KEY)).toBe(false);
    storage.values.set(THEME_STORAGE_KEY, "sepia");
    expect(readThemePreference(storage)).toBe("system");
  });

  it("survives blocked storage", () => {
    const blocked = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    expect(readThemePreference(blocked)).toBe("system");
    expect(() => storeThemePreference(blocked, "dark")).not.toThrow();
  });

  it("is applied before first paint by a script that reads the same key and values", () => {
    expect(THEME_INIT_SCRIPT).toContain(`localStorage.getItem('${THEME_STORAGE_KEY}')`);
    for (const mode of ["light", "dark"]) {
      const root = { attrs: new Map<string, string>(), setAttribute(k: string, v: string) { this.attrs.set(k, v); } };
      const run = new Function("document", "localStorage", "matchMedia", THEME_INIT_SCRIPT);
      run({ documentElement: root }, { getItem: () => mode }, () => ({ matches: mode === "light" }));
      expect(root.attrs.get("data-theme")).toBe(mode);
    }
  });
});

describe("theme-init and the CSP", () => {
  it("is admitted by its exact hash in the nginx security headers", async () => {
    // @ts-expect-error: plain ESM build helper without types.
    const { THEME_INIT_CSP } = await import("../../scripts/landing-plugin.mjs");
    const { readFileSync } = await import("node:fs");
    const headers = readFileSync(new URL("../../../../infra/fly/kcq.security-headers.conf", import.meta.url), "utf8");
    expect(headers).toMatch(new RegExp(`script-src 'self' ${THEME_INIT_CSP.replace(/[.*+?^${}()|[\]\\/=]/g, "\\$&")} `));
  });
});
