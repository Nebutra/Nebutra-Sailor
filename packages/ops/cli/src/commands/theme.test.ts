import { describe, expect, it } from "vitest";
import { formatThemeInspect, formatThemeList } from "./theme";

describe("theme command formatters", () => {
  it("formats design-language list as json for agents", () => {
    const json = formatThemeList("json");
    const parsed = JSON.parse(json);

    // Brand Package languages (not the retired mood catalog).
    const CORE_LANGUAGES = ["factory", "linear", "vercel", "stripe"];
    expect(parsed.count).toBe(parsed.languages.length);
    expect(parsed.count).toBeGreaterThanOrEqual(CORE_LANGUAGES.length);
    expect(parsed.defaultLanguage).toBe("factory");
    expect(parsed.languages.map((lang: { id: string }) => lang.id)).toEqual(
      expect.arrayContaining(CORE_LANGUAGES),
    );
    const factory = parsed.languages.find((lang: { id: string }) => lang.id === "factory");
    expect(factory?.install?.command).toBe("nebutra theme use factory");
  });

  it("formats inspect output for a known design language", () => {
    const json = formatThemeInspect("linear", "json");
    expect(json).toBeDefined();
    const parsed = JSON.parse(json as string);

    expect(parsed.id).toBe("linear");
    expect(parsed.kind).toBe("design-language");
    expect(parsed.install.command).toBe("nebutra theme use linear");
    expect(parsed.skinPath).toBeTruthy();
  });

  it("returns undefined when inspecting an unknown language", () => {
    expect(formatThemeInspect("missing", "json")).toBeUndefined();
  });
});
