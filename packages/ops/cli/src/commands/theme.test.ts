import { describe, expect, it } from "vitest";
import { formatThemeInspect, formatThemeList } from "./theme";

describe("theme command formatters", () => {
  it("formats theme list as json for agents", () => {
    const json = formatThemeList("json");
    const parsed = JSON.parse(json);

    expect(parsed.count).toBe(6);
    expect(parsed.themes.map((theme: { id: string }) => theme.id)).toEqual([
      "neon",
      "gradient",
      "dark-dense",
      "minimal",
      "vibrant",
      "ocean",
    ]);
    expect(parsed.themes[0].installCommand).toBe("nebutra theme add neon");
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
