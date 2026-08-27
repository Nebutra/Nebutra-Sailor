/**
 * Locale negotiation — @formatjs/intl-localematcher (Unicode / TC39-aligned).
 * Matches browser Accept-Language or user prefs against product-available locales.
 */
import { match } from "@formatjs/intl-localematcher";
import {
  maximizeLocaleTag,
  minimizeLocaleTag,
  normalizeLocaleInput,
  toCanonicalLocaleTag,
} from "./bcp47";

/**
 * Pick the best available locale for a list of user preferences.
 * `available` should be product-supported tags (canonical or compact).
 */
export function negotiateLocale(
  requested: readonly string[],
  available: readonly string[],
  defaultLocale: string,
): string {
  if (available.length === 0) {
    return defaultLocale;
  }

  const prefs = requested
    .map((r) => normalizeLocaleInput(r))
    .filter(Boolean)
    .flatMap((r) => {
      // Feed matcher both raw + maximized forms for better CLDR matching
      const max = maximizeLocaleTag(r);
      return max && max !== r ? [r, max] : [r];
    });

  if (prefs.length === 0) {
    return defaultLocale;
  }

  try {
    return match([...prefs], [...available], defaultLocale, {
      algorithm: "best fit",
    });
  } catch {
    return defaultLocale;
  }
}

/**
 * Resolve an arbitrary user/cookie/header locale into the best product locale.
 * Returns canonical product form when possible.
 */
export function resolveProductLocale(
  input: null | string | undefined,
  productCanonical: readonly string[],
  defaultCanonical: string,
): string {
  if (!input) {
    return defaultCanonical;
  }
  const normalized = normalizeLocaleInput(input);
  const compact = minimizeLocaleTag(normalized);
  const canonical = toCanonicalLocaleTag(normalized);

  // Exact hits first
  if (canonical && productCanonical.includes(canonical)) {
    return canonical;
  }

  // Match against product set
  const available = [...productCanonical];
  const requested = [normalized, canonical, compact].filter(
    (v): v is string => typeof v === "string" && v.length > 0,
  );
  const matched = negotiateLocale(requested, available, defaultCanonical);
  return toCanonicalLocaleTag(matched) ?? matched;
}
