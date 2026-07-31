/**
 * vanta design-language compile preset (stress fixture).
 */
import { leafHex } from "../compile-helpers";
import { tryHexToHsl } from "../hex-to-hsl";
import type { BrandPackage } from "../types";
import type { CompileContext } from "./context";
import { buildRecipe } from "./recipe";

export function buildVanta(ctx: CompileContext): BrandPackage {
  const parchment = ctx.colors.parchment ?? ctx.colors["page-canvas"] ?? "#f7f8fa";
  const paper = ctx.colors.paper ?? ctx.colors["card-surface"] ?? "#ffffff";
  const carbon = ctx.colors.carbon ?? "#181822";
  const graphite = ctx.colors.graphite ?? "#6d6e87";
  const steel = ctx.colors.steel ?? "#9e9fb7";
  const ash = ctx.colors.ash ?? "#dfdfe9";
  const fog = ctx.colors.fog ?? "#eaeaf1";
  const lavender = ctx.colors["lavender-wash"] ?? "#ddd6ff";
  const vivid = ctx.colors["vivid-violet"] ?? "#5e05c4";
  const indigo = ctx.colors["indigo-ink"] ?? "#260048";
  const mid = ctx.colors["mid-violet"] ?? "#8f47d5";
  const amber = ctx.colors["amber-signal"] ?? "#ffbe0f";

  ctx.warnings.push(
    "Vanta: vivid-violet is action CTA only; indigo-ink is brand-mark/logo (never default CTA fill).",
  );
  ctx.warnings.push("Vanta: elevation=none — cards use 1px carbon border, not box-shadow.");

  const brand: BrandPackage = {
    id: "vanta",
    name: "Vanta",
    darkDefault: false,
    version: "1.0.0",
    roles: {
      canvas: tryHexToHsl(parchment, "220 23% 97%"),
      canvasForeground: tryHexToHsl(carbon, "240 14% 11%"),
      surface: tryHexToHsl(paper, "0 0% 100%"),
      surfaceForeground: tryHexToHsl(carbon, "240 14% 11%"),
      // Action = single saturated CTA moment
      action: tryHexToHsl(vivid, "268 95% 39%"),
      actionForeground: tryHexToHsl(paper, "0 0% 100%"),
      // Brand mark = logo / wordmark / decorative ink (≠ action)
      brand: tryHexToHsl(indigo, "273 100% 14%"),
      brandForeground: tryHexToHsl(paper, "0 0% 100%"),
      // Quiet = lavender informational chips (not violet fill)
      quiet: tryHexToHsl(lavender, "249 100% 92%"),
      quietForeground: tryHexToHsl(indigo, "273 100% 14%"),
      muted: tryHexToHsl(fog, "240 14% 93%"),
      mutedForeground: tryHexToHsl(graphite, "237 11% 48%"),
      border: tryHexToHsl(carbon, "240 14% 11%"),
      input: tryHexToHsl(paper, "0 0% 100%"),
      ring: tryHexToHsl(vivid, "268 95% 39%"),
      destructive: "0 72% 51%",
      destructiveForeground: tryHexToHsl(paper, "0 0% 100%"),
      warning: tryHexToHsl(amber, "44 100% 53%"),
      warningForeground: tryHexToHsl(carbon, "240 14% 11%"),
      info: tryHexToHsl(mid, "269 63% 56%"),
      infoForeground: tryHexToHsl(paper, "0 0% 100%"),
    },
    // semantic filled by normalize from roles
    semantic: {
      background: tryHexToHsl(parchment, "220 23% 97%"),
      foreground: tryHexToHsl(carbon, "240 14% 11%"),
      card: tryHexToHsl(paper, "0 0% 100%"),
      cardForeground: tryHexToHsl(carbon, "240 14% 11%"),
      popover: tryHexToHsl(paper, "0 0% 100%"),
      popoverForeground: tryHexToHsl(carbon, "240 14% 11%"),
      primary: tryHexToHsl(vivid, "268 95% 39%"),
      primaryForeground: tryHexToHsl(paper, "0 0% 100%"),
      secondary: tryHexToHsl(lavender, "249 100% 92%"),
      secondaryForeground: tryHexToHsl(indigo, "273 100% 14%"),
      muted: tryHexToHsl(fog, "240 14% 93%"),
      mutedForeground: tryHexToHsl(graphite, "237 11% 48%"),
      accent: tryHexToHsl(indigo, "273 100% 14%"),
      accentForeground: tryHexToHsl(paper, "0 0% 100%"),
      destructive: "0 72% 51%",
      destructiveForeground: tryHexToHsl(paper, "0 0% 100%"),
      border: tryHexToHsl(carbon, "240 14% 11%"),
      input: tryHexToHsl(paper, "0 0% 100%"),
      ring: tryHexToHsl(vivid, "268 95% 39%"),
      warning: tryHexToHsl(amber, "44 100% 53%"),
      warningForeground: tryHexToHsl(carbon, "240 14% 11%"),
      info: tryHexToHsl(mid, "269 63% 56%"),
      infoForeground: tryHexToHsl(paper, "0 0% 100%"),
    },
    recipe: buildRecipe({
      buttonDefault: ctx.recipeHints.buttonDefault ?? "solid",
      // Prefer structural ctx.radius tokens (full=pill, 2xl=cards) over free-text
      radii: {
        button:
          leafHex(ctx.radius, ["buttons"]) ??
          leafHex(ctx.radius, ["full"]) ??
          ctx.recipeHints.radii?.button ??
          "999px",
        card: leafHex(ctx.radius, ["cards"]) ?? leafHex(ctx.radius, ["2xl"]) ?? "16px",
        badge:
          leafHex(ctx.radius, ["badges"]) ??
          leafHex(ctx.radius, ["full"]) ??
          ctx.recipeHints.radii?.button ??
          "999px",
        input:
          leafHex(ctx.radius, ["inputs"]) ??
          leafHex(ctx.radius, ["full"]) ??
          ctx.recipeHints.radii?.button ??
          "999px",
      },
      elevationPreset: ctx.recipeHints.elevationPreset ?? "none",
      density: ctx.recipeHints.density ?? "comfortable",
      // Informational chips = lavender wash + indigo (quiet), not violet CTA fill
      badgeDefault: "muted",
      outlineBorder: carbon,
    }),
    // Atmospheric. Backdrops drift rather than move, so even the micro step is
    // slow and nothing snaps.
    motion: {
      easeOut: "cubic-bezier(0.33, 1, 0.68, 1)",
      easeInOut: "cubic-bezier(0.37, 0, 0.63, 1)",
      micro: 120,
      flow: 240,
      reveal: 380,
      cinematic: 620,
    },
    // The most spacious of the seven — serif editorial wants the most air.
    spacing: {
      xs: "0.75rem",
      sm: "1.125rem",
      md: "1.75rem",
      lg: "2.5rem",
      xl: "3.5rem",
      "2xl": "5rem",
    },
    typography: {
      fontSans: `'Inter Variable', 'Inter', ui-sans-serif, system-ui, sans-serif`,
      fontDisplay: `'Reckless', 'Source Serif 4', 'Lora', ui-serif, Georgia, serif`,
      headingWeight: 500,
      faces: [
        {
          family: "Inter Variable",
          src: [
            {
              url: "https://cdn.jsdelivr.net/fontsource/fonts/inter:vf@latest/latin-wght-normal.woff2",
              format: "woff2",
            },
          ],
          weight: "100 900",
          display: "swap",
        },
        {
          family: "Reckless",
          // Placeholder — Create Center / tenant hosts the licensed Reckless cut
          src: [{ url: "/brand-assets/reckless-regular.woff2", format: "woff2" }],
          weight: 400,
          display: "swap",
        },
        {
          family: "Reckless",
          src: [{ url: "/brand-assets/reckless-medium.woff2", format: "woff2" }],
          weight: 500,
          display: "swap",
        },
      ],
    },
    extensions: {
      categories: {
        brand: indigo,
        action: vivid,
        link: mid,
        heroWash: lavender,
        warning: amber,
        steel,
        ash,
      },
      decorative: {
        "hero-wash": lavender,
      },
      sourceUrl: typeof ctx.refero.url === "string" ? ctx.refero.url : "https://www.vanta.com",
      notes: [
        "roles.action = Vivid Violet (filled CTA only).",
        "roles.brand = Indigo Ink (logo / wordmark / brand-mark).",
        "Elevation none — 1px carbon borders frame cards; no drop-shadow.",
        "Full-pill controls (999px); cards 16px.",
        "UI = Inter Variable; marketing display = Reckless serif.",
        "Lavender wash is marketing hero surface (decorative), not product chrome fill.",
      ],
    },
  };
  return brand;
}
