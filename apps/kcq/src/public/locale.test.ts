import { describe, expect, it } from "vitest";
import {
  detectLocale,
  LOCALE_STORAGE_KEY,
  readStoredLocale,
  resolveLocaleRedirect,
  storeLocale,
} from "./locale";

describe("detectLocale", () => {
  it("takes the first supported language in preference order", () => {
    expect(detectLocale(["zh-CN", "en"])).toBe("zh");
    expect(detectLocale(["en-US", "zh-CN"])).toBe("en");
    expect(detectLocale(["fr-FR", "zh-TW"])).toBe("zh");
    expect(detectLocale(["fr-FR"])).toBe("en");
    expect(detectLocale([])).toBe("en");
  });
});

describe("resolveLocaleRedirect", () => {
  it("sends a first-time zh browser from the default URL to the zh page", () => {
    expect(resolveLocaleRedirect({ pathname: "/home", languages: ["zh-CN"], stored: null })).toBe(
      "/zh/home",
    );
    expect(
      resolveLocaleRedirect({ pathname: "/benchmark/", languages: ["zh-Hans"], stored: null }),
    ).toBe("/zh/benchmark");
  });

  it("never detects away from an explicit locale URL (crawlers render with English)", () => {
    expect(resolveLocaleRedirect({ pathname: "/zh/home", languages: ["en-US"], stored: null })).toBe(
      null,
    );
  });

  it("lets a stored explicit choice win over the browser language", () => {
    expect(resolveLocaleRedirect({ pathname: "/home", languages: ["zh-CN"], stored: "en" })).toBe(
      null,
    );
    expect(resolveLocaleRedirect({ pathname: "/zh/home", languages: ["zh-CN"], stored: "en" })).toBe(
      "/home",
    );
    expect(resolveLocaleRedirect({ pathname: "/benchmark", languages: ["en"], stored: "zh" })).toBe(
      "/zh/benchmark",
    );
  });

  it("ignores paths outside the public pages", () => {
    expect(resolveLocaleRedirect({ pathname: "/app", languages: ["zh-CN"], stored: "zh" })).toBe(
      null,
    );
  });
});

describe("stored locale", () => {
  it("round-trips a valid choice and rejects anything else", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => void values.set(key, value),
    };
    expect(readStoredLocale(storage)).toBe(null);
    storeLocale(storage, "zh");
    expect(values.get(LOCALE_STORAGE_KEY)).toBe("zh");
    expect(readStoredLocale(storage)).toBe("zh");
    values.set(LOCALE_STORAGE_KEY, "de");
    expect(readStoredLocale(storage)).toBe(null);
  });

  it("survives blocked storage", () => {
    const blocked = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(readStoredLocale(blocked)).toBe(null);
    expect(() => storeLocale(blocked, "en")).not.toThrow();
    expect(readStoredLocale(undefined)).toBe(null);
  });
});
