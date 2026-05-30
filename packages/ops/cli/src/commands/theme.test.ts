import { describe, expect, it } from "vitest";
import { formatThemeInspect, formatThemeList } from "./theme";

describe("theme command formatters", () => {
  it("formats theme list as json for agents", () => {
    const json = formatThemeList("json");
    const parsed = JSON.parse(json);

    // Robust to theme-registry growth (community themes land continuously):
    // assert self-consistency + presence of the core themes, not an exact list/count.
    const CORE_THEMES = ["nebutra", "dark-dense", "minimal", "vibrant", "ocean"];
    expect(parsed.count).toBe(parsed.themes.length);
    expect(parsed.count).toBeGreaterThanOrEqual(CORE_THEMES.length);
    expect(parsed.themes.map((theme: { id: string }) => theme.id)).toEqual(
      expect.arrayContaining(CORE_THEMES),
    );
    const nebutra = parsed.themes.find((theme: { id: string }) => theme.id === "nebutra");
    expect(nebutra?.installCommand).toBe("nebutra theme add nebutra");
  });

  it("formats inspect output for a known theme", () => {
    const json = formatThemeInspect("dark-dense", "json");
    const parsed = JSON.parse(json);

    expect(parsed.id).toBe("dark-dense");
    expect(parsed.tokenPath).toBe("tokens/themes/dark-dense.json");
    expect(parsed.governance.wcag).toBe("AA");
  });

  it("returns undefined when inspecting an unknown theme", () => {
    expect(formatThemeInspect("missing", "json")).toBeUndefined();
  });
});
