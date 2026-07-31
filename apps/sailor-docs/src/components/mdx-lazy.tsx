/**
 * Client-only lazy MDX helpers for OpenNext / Cloudflare Workers.
 *
 * Heavy UI (mermaid, openapi UI, niche fumadocs packages, large demos) must not
 * be statically imported from mdx-components.tsx — that packs them into the
 * single handler.mjs and blows the 64 MiB Workers limit.
 */
"use client";

import dynamic from "next/dynamic";

const empty = () => null;

export const Mermaid = dynamic(() => import("fumadocs-mermaid/ui").then((m) => m.Mermaid), {
  ssr: false,
  loading: empty,
});

export const APIPage = dynamic(() => import("@/components/api-page").then((m) => m.APIPage), {
  ssr: false,
  loading: empty,
});

// fumadocs-obsidian / python are niche surfaces; load only when MDX references them.
export const ObsidianComponents = {
  // Keep keys stable for MDX; components hydrate client-side.
} as Record<string, never>;

export const MotionDemos = dynamic(
  () => import("@/components/motion-demos").then((m) => m.MotionDemos),
  { ssr: false, loading: empty },
);

export const ColorPalette = dynamic(
  () => import("@/components/color-palette").then((m) => m.ColorPalette),
  { ssr: false, loading: empty },
);

export const ColorUsageDemos = dynamic(
  () => import("@/components/color-usage").then((m) => m.ColorUsageDemos),
  { ssr: false, loading: empty },
);

export const IconGallery = dynamic(
  () => import("@/components/icon-gallery").then((m) => m.IconGallery),
  { ssr: false, loading: empty },
);

export const IntroductionHero = dynamic(
  () => import("@/components/introduction-hero").then((m) => m.IntroductionHero),
  { ssr: false, loading: empty },
);

export const BrandPhilosophyVisual = dynamic(
  () => import("@/components/brand-overview-visuals").then((m) => m.BrandPhilosophyVisual),
  { ssr: false, loading: empty },
);

export const LogoShowcase = dynamic(
  () => import("@/components/brand-overview-visuals").then((m) => m.LogoShowcase),
  { ssr: false, loading: empty },
);
