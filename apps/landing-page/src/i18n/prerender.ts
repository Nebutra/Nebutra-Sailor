import { routing } from "./routing";

/**
 * Returns one param object per item, locked to the default locale.
 *
 * PPR / cacheComponents semantics:
 *  - These paths are pre-built at compile time (fast CDN hit on first visit).
 *  - Any locale×slug combination NOT in this list renders on-demand the first
 *    time it is requested, then gets cached — no `dynamicParams = true` needed,
 *    because on-demand rendering is the PPR default.
 *  - NEVER expand with routing.locales.flatMap here: that multiplies the static
 *    build by locale-count × dataset-size and is forbidden under cacheComponents.
 */
export function prerenderDefaultLocale<T>(
  items: T[],
  toParam: (item: T) => Record<string, string>,
): Array<Record<string, string>> {
  return items.map((item) => ({ lang: routing.defaultLocale, ...toParam(item) }));
}
