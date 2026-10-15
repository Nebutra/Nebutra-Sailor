"use client";

import dynamic from "next/dynamic";

/** The search dialog (and Orama) load on first open, not with every page. */
export const LazySearchDialog = dynamic(
  () => import("./search-dialog").then((m) => m.DocsSearchDialog),
  {
    ssr: false,
  },
);
