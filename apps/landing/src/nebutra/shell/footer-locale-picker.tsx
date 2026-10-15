"use client";

import dynamic from "next/dynamic";

/**
 * The footer's market × language picker, loaded after hydration. It sits at
 * the very bottom of every page, and its code — the panel, the market table,
 * every language's endonym — was ~15 KB gzip of each page's first load.
 * Rendered client-only, it appears a moment after the page is interactive;
 * the footer is never in the first viewport, so nothing visible moves.
 */
export const FooterLocalePicker = dynamic(
  () => import("@/components/ui/market-locale-picker").then((m) => m.MarketLocalePicker),
  { ssr: false },
);
