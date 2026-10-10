import { type CanonicalLocale, canonicalizeLocale, DEFAULT_LOCALE } from "./locales";

/**
 * Which language a cookie-mode product request renders in.
 *
 *   1. `NEXT_LOCALE` — the person chose it (the switcher writes it on
 *      `.nebutra.com`, so a choice made on one product holds on the others)
 *   2. `Accept-Language` — what the browser asks for, best match first
 *   3. English
 *
 * Path-mode surfaces (landing) take the locale from the URL instead and never
 * call this: there the URL is the state, and it must not move under a cookie.
 */
export function resolveRequestLocale(input: {
  cookie?: null | string | undefined;
  acceptLanguage?: null | string | undefined;
}): CanonicalLocale {
  return (
    canonicalizeLocale(input.cookie) ??
    negotiateAcceptLanguage(input.acceptLanguage) ??
    DEFAULT_LOCALE
  );
}

/** Best product locale for an `Accept-Language` header, or undefined. */
export function negotiateAcceptLanguage(
  header: null | string | undefined,
): CanonicalLocale | undefined {
  if (!header) return undefined;
  const ranked = header
    .split(",")
    .map((part, index) => {
      const [tag = "", ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      const weight = q ? Number(q.slice(2)) : 1;
      return { tag: tag.trim(), weight: Number.isFinite(weight) ? weight : 0, index };
    })
    .filter((entry) => entry.tag && entry.tag !== "*" && entry.weight > 0)
    .sort((a, b) => b.weight - a.weight || a.index - b.index);

  for (const { tag } of ranked) {
    // `fr-CA` is not a product tag, `fr` is: walk the subtags down until one is.
    const parts = tag.replace(/_/g, "-").split("-");
    for (let n = parts.length; n > 0; n--) {
      const hit = canonicalizeLocale(parts.slice(0, n).join("-"));
      if (hit) return hit;
    }
  }
  return undefined;
}
