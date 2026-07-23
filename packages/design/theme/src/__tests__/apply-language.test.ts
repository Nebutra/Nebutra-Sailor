/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from "vitest";
import { applyLanguage, clearLanguage, getActiveLanguageId } from "../apply-language";
import { getBuiltInBrandPackage, listBuiltInBrandIds } from "../built-in-packages";

afterEach(() => {
  clearLanguage();
  document.getElementById("nebutra-brand-skin")?.remove();
  delete document.documentElement.dataset.brand;
});

describe("getBuiltInBrandPackage", () => {
  it("loads all stress-test fixtures", () => {
    const ids = listBuiltInBrandIds();
    expect(ids).toEqual(
      expect.arrayContaining(["linear", "gsap", "raycast", "vercel", "vanta", "stripe", "notion"]),
    );
    for (const id of ids) {
      const pkg = getBuiltInBrandPackage(id);
      expect(pkg?.id).toBe(id);
      expect(pkg?.semantic.primary).toBeTruthy();
      expect(pkg?.recipe.buttonDefault).toBeTruthy();
    }
  });
});

describe("applyLanguage", () => {
  it("applies built-in language without options.package", () => {
    const entry = applyLanguage("vanta");
    expect(entry?.id).toBe("vanta");
    expect(getActiveLanguageId()).toBe("vanta");
    expect(document.documentElement.dataset.brand).toBe("vanta");
    const style = document.getElementById("nebutra-brand-skin");
    expect(style?.textContent).toMatch(/data-brand="vanta"/);
    // light pack: global inject must not force .dark selector
    expect(style?.textContent).not.toMatch(/:root,\n\.dark,/);
  });

  it("applies darkDefault language with .dark in injected CSS", () => {
    applyLanguage("linear");
    const style = document.getElementById("nebutra-brand-skin");
    expect(style?.textContent).toMatch(/:root,\n\.dark,\nhtml\[data-brand="linear"\]/);
  });

  it("clears to factory", () => {
    applyLanguage("stripe");
    clearLanguage();
    expect(getActiveLanguageId()).toBe("factory");
    expect(document.documentElement.dataset.brand).toBeUndefined();
    expect(document.getElementById("nebutra-brand-skin")).toBeNull();
  });

  it("applyLanguage('factory') clears brand", () => {
    applyLanguage("gsap");
    applyLanguage("factory");
    expect(getActiveLanguageId()).toBe("factory");
    expect(document.getElementById("nebutra-brand-skin")).toBeNull();
  });
});
