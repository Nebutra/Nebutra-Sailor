import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { listBuiltInBrandIds } from "../built-in-packages";
import {
  DEFAULT_LANGUAGE,
  getLanguageById,
  isLanguageId,
  LANGUAGE_IDS,
  LANGUAGE_REGISTRY,
  listSkinLanguages,
} from "../languages";

const tokensRoot = resolve(fileURLToPath(new URL("../../../tokens", import.meta.url)));
const brandsRoot = resolve(tokensRoot, "brands");

describe("@nebutra/theme design-language catalog", () => {
  it("lists factory + stress-test fixtures as languages", () => {
    expect(DEFAULT_LANGUAGE).toBe("factory");
    expect(LANGUAGE_IDS).toEqual(
      expect.arrayContaining([
        "factory",
        "linear",
        "gsap",
        "raycast",
        "vercel",
        "vanta",
        "stripe",
        "notion",
      ]),
    );
    expect(LANGUAGE_IDS[0]).toBe("factory");
  });

  it("documents contract proofs per skin language", () => {
    for (const lang of listSkinLanguages()) {
      expect(lang.proves.length).toBeGreaterThan(0);
      expect(lang.brandPath).toMatch(/^brands\/.+\/brand\.json$/);
      expect(lang.skinPath).toMatch(/^skins\/.+\.css$/);
      expect(lang.compatibility.brandPackage).toBe(true);
      expect(lang.compatibility.dataBrand).toBe(true);
    }
  });

  it("keeps brand.json + published skins/<id>.css for each non-factory language", () => {
    for (const lang of listSkinLanguages()) {
      expect(lang.brandPath).toBeTruthy();
      expect(lang.skinPath).toBeTruthy();
      if (!lang.brandPath || !lang.skinPath) continue;
      expect(existsSync(resolve(tokensRoot, lang.brandPath))).toBe(true);
      expect(existsSync(resolve(tokensRoot, lang.skinPath))).toBe(true);
      // No dual-write brands/<id>/skin.css
      expect(existsSync(resolve(tokensRoot, "brands", lang.id, "skin.css"))).toBe(false);
    }
  });

  it("supports lookup without hardcoding fixture lists in apps", () => {
    expect(getLanguageById("vanta")?.proves.some((p) => /brand-mark|action/i.test(p))).toBe(true);
    expect(getLanguageById("missing")).toBeUndefined();
    expect(isLanguageId("linear")).toBe(true);
    expect(isLanguageId("nebutra")).toBe(false);
  });

  it("describes the package as design-language swap not mood tint", () => {
    expect(LANGUAGE_REGISTRY.description).toMatch(/Brand Package/i);
    expect(LANGUAGE_REGISTRY.description).toMatch(/roles|recipe/i);
  });

  it("keeps languages.json, brands/ dirs, and built-in packages in sync", () => {
    const diskBrandIds = readdirSync(brandsRoot, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();
    const catalogSkinIds = listSkinLanguages()
      .map((l) => l.id)
      .sort();
    const builtInIds = listBuiltInBrandIds().sort();

    expect(catalogSkinIds).toEqual(diskBrandIds);
    expect(builtInIds).toEqual(diskBrandIds);

    for (const id of diskBrandIds) {
      const lang = getLanguageById(id);
      expect(lang?.brandPath).toBe(`brands/${id}/brand.json`);
      expect(lang?.skinPath).toBe(`skins/${id}.css`);
      expect(existsSync(resolve(brandsRoot, id, "brand.json"))).toBe(true);
    }
  });

  it("derives catalog names/darkDefault from brand.json (sync-languages SSOT)", () => {
    for (const lang of listSkinLanguages()) {
      const brand = JSON.parse(
        readFileSync(resolve(tokensRoot, lang.brandPath as string), "utf8"),
      ) as { name: string; darkDefault: boolean };
      expect(lang.name).toBe(brand.name);
      expect(lang.darkDefault).toBe(brand.darkDefault);
    }
  });
});
