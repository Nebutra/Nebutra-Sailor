/**
 * BCP 47 / Unicode CLDR locale algebra via ECMA-402 `Intl.Locale`.
 *
 * Scientific basis:
 * - BCP 47 (RFC 5646) language tags
 * - CLDR likely-subtags (exposed as Locale#maximize / #minimize in modern engines)
 *
 * No hand-maintained alias tables.
 */

/** Languages that need explicit Script subtags in product/SEO tags (multi-script). */
const MULTI_SCRIPT_LANGUAGES = new Set(["az", "bs", "ku", "sr", "uz", "zh", "yue"]);

export function isValidLocaleTag(tag: string): boolean {
  try {
    // Throws RangeError on invalid tags
    void new Intl.Locale(tag);
    return true;
  } catch {
    return false;
  }
}

/**
 * Maximize a tag with CLDR likely subtags (language → script + region).
 * Example: `zh` → `zh-Hans-CN`, `en` → `en-Latn-US`.
 */
export function maximizeLocaleTag(tag: string): string | undefined {
  try {
    return new Intl.Locale(tag).maximize().toString();
  } catch {
    return undefined;
  }
}

/**
 * Minimize a tag by dropping redundant script/region.
 * Example: `en-Latn-US` → `en`, `zh-Hans-CN` → `zh`, `zh-Hant-TW` → `zh-TW`.
 */
export function minimizeLocaleTag(tag: string): string | undefined {
  try {
    return new Intl.Locale(tag).maximize().minimize().toString();
  } catch {
    return undefined;
  }
}

/**
 * Product/SEO-friendly canonical form:
 * - multi-script languages keep Script (`zh-Hans-CN`, `zh-Hant-TW`)
 * - others use `language-REGION` (`en-US`, `ja-JP`) without default Latn/Jpan noise
 */
export function toCanonicalLocaleTag(tag: string): string | undefined {
  try {
    const max = new Intl.Locale(tag).maximize();
    const language = max.language;
    const script = max.script;
    const region = max.region;
    if (!language || !region) {
      return max.toString();
    }
    if (MULTI_SCRIPT_LANGUAGES.has(language) && script) {
      return `${language}-${script}-${region}`;
    }
    return `${language}-${region}`;
  } catch {
    return undefined;
  }
}

/**
 * Compact route / message-file key (aligns with `locales/<key>.json` stems when possible).
 * Prefers minimized form (`en`, `zh`, `zh-TW`, `pt-BR`).
 */
export function toCompactLocaleTag(tag: string): string | undefined {
  return minimizeLocaleTag(tag);
}

/** Open Graph uses underscore separators (`en_US`, `zh_Hans_CN`). */
export function toOpenGraphLocaleTag(tag: string): string | undefined {
  const canonical = toCanonicalLocaleTag(tag);
  return canonical?.replace(/-/g, "_");
}

/** HTML `lang` / hreflang: canonical BCP 47 with hyphens. */
export function toHtmlLangTag(tag: string): string | undefined {
  return toCanonicalLocaleTag(tag);
}

export function getLocaleParts(tag: string):
  | {
      language: string;
      script?: string;
      region?: string;
    }
  | undefined {
  try {
    const max = new Intl.Locale(tag).maximize();
    return {
      language: max.language,
      ...(max.script ? { script: max.script } : {}),
      ...(max.region ? { region: max.region } : {}),
    };
  } catch {
    return undefined;
  }
}

/** Normalize underscores / case: `zh_Hans_CN` → parseable BCP 47. */
export function normalizeLocaleInput(input: string): string {
  return input.trim().replace(/_/g, "-");
}
