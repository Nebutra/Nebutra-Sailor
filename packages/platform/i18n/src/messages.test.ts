import { describe, expect, it } from "vitest";
import { loadMessages, mergeMessages, pickMessages } from "./messages";
import { negotiateAcceptLanguage, resolveRequestLocale } from "./resolve-locale";

const catalogs: Record<string, Record<string, unknown>> = {
  en: { nav: { home: "Home", pricing: "Pricing" }, legal: { contact: { form: { name: "Name" } } } },
  ja: { nav: { home: "ホーム" } },
};
const load = async (locale: string) => {
  const found = catalogs[locale];
  if (!found) throw new Error(`no ${locale}`);
  return { default: found };
};

describe("loadMessages", () => {
  it("layers a partial catalog over English, key by key", async () => {
    const messages = await loadMessages("ja", load);
    expect(messages).toEqual({
      nav: { home: "ホーム", pricing: "Pricing" },
      legal: { contact: { form: { name: "Name" } } },
    });
  });

  it("renders English when the locale has no catalog file", async () => {
    expect(await loadMessages("sw", load)).toEqual(catalogs.en);
  });

  it("fails loudly when the source itself is missing", async () => {
    await expect(loadMessages("ja", async () => Promise.reject(new Error("x")))).rejects.toThrow(
      /source catalog/,
    );
  });

  it("does not mutate either side", () => {
    const base = { a: { b: "1" } };
    const merged = mergeMessages(base, { a: { c: "2" } });
    expect(base).toEqual({ a: { b: "1" } });
    expect(merged).toEqual({ a: { b: "1", c: "2" } });
  });
});

describe("pickMessages", () => {
  it("keeps namespaces and dotted subtrees at their original paths", () => {
    expect(pickMessages(catalogs.en as never, ["nav", "legal.contact.form", "missing"])).toEqual({
      nav: { home: "Home", pricing: "Pricing" },
      legal: { contact: { form: { name: "Name" } } },
    });
  });
});

describe("resolveRequestLocale", () => {
  it("prefers the cookie, then Accept-Language, then English", () => {
    expect(resolveRequestLocale({ cookie: "ja-JP", acceptLanguage: "de" })).toBe("ja-JP");
    expect(resolveRequestLocale({ cookie: "garbage", acceptLanguage: "de-AT,de;q=0.9" })).toBe(
      "de-DE",
    );
    expect(resolveRequestLocale({})).toBe("en-US");
  });

  it("ranks Accept-Language by q and folds regional tags onto product locales", () => {
    expect(negotiateAcceptLanguage("fr-CA;q=0.5, zh-TW;q=0.8, xx")).toBe("zh-Hant-TW");
    expect(negotiateAcceptLanguage("zh-CN,zh;q=0.9,en;q=0.8")).toBe("zh-Hans-CN");
    expect(negotiateAcceptLanguage("*")).toBeUndefined();
    expect(negotiateAcceptLanguage("xx-YY")).toBeUndefined();
  });
});
