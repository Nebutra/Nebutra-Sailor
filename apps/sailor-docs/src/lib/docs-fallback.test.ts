import { describe, expect, it } from "vitest";
import {
  fallbackPageFor,
  languagesWithPage,
  type PageLookup,
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

describe("fallbackPageFor", () => {
  it("serves the English page for an en-only slug requested in zh", () => {
    expect(fallbackPageFor(BOTH, ["architecture", "multi-schema"], "zh")).toEqual({
      slugs: ["architecture", "multi-schema"],
      language: "en",
    });
  });

  it("returns undefined (404) when neither language has the page", () => {
    expect(fallbackPageFor(BOTH, ["does", "not", "exist"], "zh")).toBeUndefined();
    expect(fallbackPageFor(BOTH, ["does", "not", "exist"], "en")).toBeUndefined();
  });

  it("offers no fallback for a page that exists in the requested language", () => {
    // Callers only consult the fallback on a miss, but the default language
    // must never be able to fall back onto itself even if that changes.
    expect(fallbackPageFor(BOTH, ["architecture", "multi-schema"], "en")).toBeUndefined();
  });

  it("serves the English entry page at the zh docs root when zh lacks it", () => {
    // The live break: /zh had no entry page of its own, because installation.mdx
    // is one of the en-only pages.
    const entry = { slugs: ["getting-started", "installation"], language: "en" };
    expect(fallbackPageFor(BOTH, [], "zh")).toEqual(entry);
    expect(fallbackPageFor(BOTH, undefined, "zh")).toEqual(entry);
  });

  it("prefers the requested language's own entry page when it exists", () => {
    const translated = fakeSource([
      "en:getting-started/installation",
      "zh:getting-started/installation",
    ]);
    expect(fallbackPageFor(translated, [], "zh")).toEqual({
      slugs: ["getting-started", "installation"],
      language: "zh",
    });
  });

  it("404s the docs root rather than looping when no language has the entry page", () => {
    expect(fallbackPageFor(fakeSource([]), [], "zh")).toBeUndefined();
  });

  it("never yields a path — a rewrite cannot translate a redirect back", () => {
    // The whole point of this shape. This origin is reached through landing's
    // /docs rewrite, so a Location in this app's own path space (`/en/...`)
    // resolves against the visitor's host and sends them outside the docs.
    // Returning the page to serve makes that class of bug unrepresentable.
    const result = fallbackPageFor(BOTH, [], "zh");
    expect(typeof result).toBe("object");
    expect(Object.keys(result ?? {}).sort()).toEqual(["language", "slugs"]);
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
