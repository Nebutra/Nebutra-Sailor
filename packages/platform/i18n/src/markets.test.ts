import { describe, expect, it } from "vitest";
import { getCurrencyForCountry } from "./currency";
import { SHIPPED_MESSAGE_LOCALES, toShippedMessageKey } from "./languages";
import { ROUTE_LOCALES } from "./locales";
import {
  buildMarketPickerEntries,
  createMarketLocale,
  listAllMarketLocales,
} from "./market-locale";
import { assertMarketMatrixIntegrity, getMarket, listMarkets } from "./markets";
import { resolveCountryFromRequest } from "./resolve-market-request";

describe("market governance", () => {
  it("integrity + coverage", () => {
    expect(() => assertMarketMatrixIntegrity()).not.toThrow();
    expect(listMarkets().length).toBeGreaterThanOrEqual(40);
    expect(getMarket("JP")?.defaultLanguage).toBe("ja");
    expect([...SHIPPED_MESSAGE_LOCALES].sort()).toEqual([...ROUTE_LOCALES].sort());
    // Global wheel: Portuguese (and others) are shipped product keys, not en-fallback
    expect(toShippedMessageKey("pt")).toBe("pt");
    expect(toShippedMessageKey("zh-Hans")).toBe("zh-Hans");
    expect(toShippedMessageKey("zh-Hant")).toBe("zh-Hant");
    for (const m of listMarkets()) expect(getCurrencyForCountry(m.country)).toMatch(/^[A-Z]{3}$/);
  });
  it("composition + picker", () => {
    expect(createMarketLocale("JP", "ja")?.bcp47).toBe("ja-JP");
    expect(createMarketLocale("SG", "zh-Hans")?.bcp47).toBe("zh-Hans-SG");
    expect(createMarketLocale("TW", "zh-Hant")?.bcp47).toBe("zh-Hant-TW");
    expect(createMarketLocale("CN", "zh-Hans")?.bcp47).toBe("zh-Hans-CN");
    expect(resolveCountryFromRequest({ marketCookie: "JP", geoCountry: "US" })).toBe("JP");
    expect(buildMarketPickerEntries("en").length).toBe(listMarkets().length);
    expect(listAllMarketLocales().length).toBeGreaterThan(50);
  });
});
