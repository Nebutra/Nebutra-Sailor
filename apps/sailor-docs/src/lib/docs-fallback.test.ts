import { describe, expect, it } from "vitest";
import {
  languagesWithPage,
  type PageLookup,
  translationFallbackFor,
  xDefaultLanguage,
} from "./docs-fallback";

/**
 * Fake loader over an explicit `${language}:${slug}` inventory, so each case
 * names exactly the tree shape it exercises. Mirrors the real invariant at
 * HEAD: content/docs/en ⊃ content/docs/zh, zero zh-only pages.
 */
function fakeSource(present: readonly string[]): PageLookup {
  const set = new Set(present);
  return {
    getPage(slugs, language) {
      if (!language) return undefined;
      return set.has(`${language}:${(slugs ?? []).join("/")}`) ? { slugs } : undefined;
    },
  };
}

const BOTH = fakeSource([
  "en:getting-started/installation",
  "en:architecture/multi-schema",
  "en:ai/agents",
  "zh:ai/agents",
]);

describe("translationFallbackFor", () => {
  it("redirects an en-only slug requested in zh to the English page", () => {
    expect(translationFallbackFor(BOTH, ["architecture", "multi-schema"], "zh")).toBe(
      "/en/architecture/multi-schema",
    );
  });

  it("returns undefined (404) when neither language has the page", () => {
    expect(translationFallbackFor(BOTH, ["does", "not", "exist"], "zh")).toBeUndefined();
    expect(translationFallbackFor(BOTH, ["does", "not", "exist"], "en")).toBeUndefined();
  });

  it("does not redirect a page that exists in the requested language", () => {
    // Callers only consult the fallback on a miss, but the default language
    // must never be able to redirect onto itself even if that changes.
    expect(translationFallbackFor(BOTH, ["architecture", "multi-schema"], "en")).toBeUndefined();
  });

  it("sends the zh docs root to the English entry page when zh lacks it", () => {
    // The live break: /zh -> /zh/getting-started/installation -> 404, because
    // installation.mdx is one of the en-only pages.
    expect(translationFallbackFor(BOTH, [], "zh")).toBe("/en/getting-started/installation");
    expect(translationFallbackFor(BOTH, undefined, "zh")).toBe("/en/getting-started/installation");
  });

  it("sends the docs root to the requested language's entry page when it exists", () => {
    const translated = fakeSource([
      "en:getting-started/installation",
      "zh:getting-started/installation",
    ]);
    expect(translationFallbackFor(translated, [], "zh")).toBe("/zh/getting-started/installation");
  });

  it("404s the docs root rather than looping when no language has the entry page", () => {
    expect(translationFallbackFor(fakeSource([]), [], "zh")).toBeUndefined();
  });
});

describe("languagesWithPage / xDefaultLanguage", () => {
  it("lists only the languages that actually carry the page", () => {
    expect(languagesWithPage(BOTH, ["ai", "agents"])).toEqual(["en", "zh"]);
    expect(languagesWithPage(BOTH, ["architecture", "multi-schema"])).toEqual(["en"]);
  });

  it("puts x-default at the default language when it has the page", () => {
    expect(xDefaultLanguage(BOTH, ["ai", "agents"])).toBe("en");
  });

  it("never emits an x-default for a (language, slug) pair the source cannot resolve", () => {
    // A hypothetical zh-only page: x-default must be the zh URL, not an
    // English URL that does not exist.
    const zhOnly = fakeSource(["zh:ai/zh-only"]);
    expect(xDefaultLanguage(zhOnly, ["ai", "zh-only"])).toBe("zh");
    // And no language at all -> no x-default key.
    expect(xDefaultLanguage(BOTH, ["nope"])).toBeUndefined();
  });
});
