import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

function readJson(relativePath: string): JsonValue {
  return JSON.parse(readFileSync(join(ROOT, relativePath), "utf8")) as JsonValue;
}

function flattenKeys(value: JsonValue, prefix = ""): string[] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return prefix ? [prefix] : [];
  }

  return Object.entries(value).flatMap(([key, child]) =>
    flattenKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

function getString(value: JsonValue, dottedKey: string): string | undefined {
  let current: JsonValue = value;
  for (const key of dottedKey.split(".")) {
    if (current === null || typeof current !== "object" || Array.isArray(current)) {
      return undefined;
    }
    current = current[key];
  }
  return typeof current === "string" ? current : undefined;
}

describe("platform i18n parity", () => {
  // Coverage is not parity any more: a key zh-Hans lacks renders the English
  // until the translation workflow fills it (scripts/lib/i18n-catalog.mjs).
  // A key only zh-Hans has is still a bug — nothing would ever render it.
  it("keeps no Simplified Chinese key that English lacks", () => {
    const enKeys = new Set(flattenKeys(readJson("packages/platform/i18n/locales/en.json")));
    const zhKeys = new Set(flattenKeys(readJson("packages/platform/i18n/locales/zh-Hans.json")));

    expect(
      [...zhKeys].filter((key) => !enKeys.has(key)).sort(),
      "zh-Hans.json keys missing from en.json",
    ).toEqual([]);
  });

  it("keeps China compliance auth copy explicit in both catalogs", () => {
    const en = readJson("packages/platform/i18n/locales/en.json");
    const zh = readJson("packages/platform/i18n/locales/zh-Hans.json");

    for (const key of [
      "compliance.icp.recordNumber",
      "compliance.icp.publicSecurity",
      "compliance.wechat.signIn",
      "compliance.wechat.notConfigured",
    ]) {
      expect(getString(en, key), `en.json ${key}`).toEqual(expect.any(String));
      expect(getString(zh, key), `zh-Hans.json ${key}`).toEqual(expect.any(String));
    }
  });
});
