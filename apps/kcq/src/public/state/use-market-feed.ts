/**
 * The page's one market feed: the hero's 600519 daily bars from the read-only `/market/tdx` route.
 * Shared and ref-counted (VueUse `createSharedComposable`): the hero starts it once the page is idle;
 * the nav dot, the trust diagram and the footer status read the same state instead of fetching
 * again. In prerender `createSharedComposable` falls back to a fresh instance per caller, and every
 * instance starts on the cached bars, so the HTML is the same for every route.
 */
import { createSharedComposable, tryOnScopeDispose } from "@vueuse/core";
import { computed, ref, shallowRef } from "vue";
import { type Bar, CACHED_BARS, HERO_QUERY, mergeBars, quoteOf, sameBars } from "../home/hero/bars";

/** `idle` until the hero starts the feed (it never starts on pages without the hero). */
export type FeedStatus = "idle" | "connecting" | "live" | "delayed";

const REFRESH_MS = 60_000;
const TIMEOUT_MS = 15_000;

function useMarketFeedState() {
  const bars = shallowRef<readonly Bar[]>(CACHED_BARS);
  const status = ref<FeedStatus>("idle");
  /** Feed requests this visit (each one is a GET-shaped read; the trust diagram pulses per request). */
  const requests = ref(0);
  const quote = computed(() => quoteOf(bars.value));
  let timer = 0;
  let first: Promise<boolean> | undefined;

  async function refresh(): Promise<boolean> {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
    requests.value += 1;
    try {
      const { fetchLiveBars } = await import("../home/hero/live-chart");
      const live = await fetchLiveBars(window.location.origin, controller.signal);
      // Live bars extend the cached ones; never a hole between the two (bars.ts mergeBars).
      const next = mergeBars(CACHED_BARS, live).slice(-HERO_QUERY.limit);
      // Same bars (a closed market): keep the reference, so nothing downstream redraws.
      if (!sameBars(bars.value, next)) bars.value = next;
      status.value = "live";
      return true;
    } catch {
      // Keep the last good bars; the status says what they are.
      if (status.value !== "live") status.value = "delayed";
      return false;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  /** Idempotent; resolves with whether the first request returned live bars. */
  function start(): Promise<boolean> {
    if (first) return first;
    status.value = "connecting";
    first = refresh();
    timer = window.setInterval(() => {
      if (!document.hidden) void refresh();
    }, REFRESH_MS);
    return first;
  }

  tryOnScopeDispose(() => window.clearInterval(timer));
  return { bars, status, quote, requests, start };
}

export const useMarketFeed = createSharedComposable(useMarketFeedState);
