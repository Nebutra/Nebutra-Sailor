/**
 * raycast design-language compile preset (stress fixture).
 */
import { tryHexToHsl } from "../hex-to-hsl";
import type { BrandPackage } from "../types";
import type { CompileContext } from "./context";
import { buildRecipe } from "./recipe";

export function buildRaycast(ctx: CompileContext): BrandPackage {
  const canvas = ctx.colors["void-black"] ?? ctx.colors.canvas ?? "#040506";
  const ink = ctx.colors.ink ?? ctx.colors.card ?? "#07080a";
  const obsidian = ctx.colors.obsidian ?? ctx.colors.recessed ?? "#111214";
  const graphite = ctx.colors.graphite ?? ctx.colors.badge ?? "#1b1c1e";
  const smoke = ctx.colors.smoke ?? "#6a6b6c";
  const ash = ctx.colors.ash ?? "#9c9c9d";
  const mist = ctx.colors.mist ?? "#e6e6e6";
  const iron = ctx.colors.iron ?? "#454647";
  const slate = ctx.colors.slate ?? "#2f3031";
  const paper = ctx.colors["pure-white"] ?? "#ffffff";
  const coral = ctx.colors["coral-pulse"] ?? "#ff6363";
  const success = ctx.colors["success-green"] ?? "#59d499";
  const info = ctx.colors["info-blue"] ?? "#56c2ff";

  ctx.warnings.push(
    "Raycast: coral-pulse is brand mark only — primary CTA is Mist/Iron neutral solid.",
  );

  const brand: BrandPackage = {
    id: "raycast",
    name: "Raycast",
    darkDefault: true,
    version: "1.0.0",
    semantic: {
      background: tryHexToHsl(canvas, "210 20% 2%"),
      foreground: tryHexToHsl(paper, "0 0% 100%"),
      card: tryHexToHsl(ink, "220 18% 3%"),
      cardForeground: tryHexToHsl(paper, "0 0% 100%"),
      popover: tryHexToHsl(ink, "220 18% 3%"),
      popoverForeground: tryHexToHsl(paper, "0 0% 100%"),
      // Filled CTA = Mist on dark (not coral)
      primary: tryHexToHsl(mist, "0 0% 90%"),
      primaryForeground: tryHexToHsl(iron, "210 1% 27%"),
      secondary: tryHexToHsl(graphite, "220 4% 11%"),
      secondaryForeground: tryHexToHsl(paper, "0 0% 100%"),
      muted: tryHexToHsl(obsidian, "220 6% 7%"),
      mutedForeground: tryHexToHsl(smoke, "240 1% 42%"),
      // Coral as accent for brand-adjacent UI (badges that opt-in to accent)
      accent: tryHexToHsl(coral, "0 100% 69%"),
      accentForeground: tryHexToHsl(paper, "0 0% 100%"),
      destructive: "0 72% 51%",
      destructiveForeground: tryHexToHsl(paper, "0 0% 100%"),
      border: tryHexToHsl(slate, "210 2% 19%"),
      input: tryHexToHsl(obsidian, "220 6% 7%"),
      ring: tryHexToHsl(ash, "240 1% 61%"),
      success: tryHexToHsl(success, "150 58% 59%"),
      successForeground: tryHexToHsl(canvas, "210 20% 2%"),
      info: tryHexToHsl(info, "200 100% 67%"),
      infoForeground: tryHexToHsl(canvas, "210 20% 2%"),
    },
    recipe: buildRecipe({
      buttonDefault: "solid",
      radii: {
        button: ctx.recipeHints.radii?.button ?? "8px",
        card: "16px",
        badge: "6px",
        input: "8px",
      },
      elevationPreset: ctx.recipeHints.elevationPreset ?? "key",
      density: ctx.recipeHints.density ?? "comfortable",
      badgeDefault: "muted",
    }),
    // Native-feeling: quick, with a small overshoot on things that appear. The
    // spring is the point — a launcher should feel like it was already there.
    motion: {
      easeOut: "cubic-bezier(0.16, 1, 0.3, 1)",
      easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
      easeSpring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      micro: 90,
      flow: 160,
      reveal: 220,
      cinematic: 340,
    },
    // Command-palette density — compact, but not as tight as Linear.
    spacing: {
      xs: "0.375rem",
      sm: "0.5rem",
      md: "0.75rem",
      lg: "1rem",
      xl: "1.375rem",
      "2xl": "2rem",
    },
    typography: {
      fontSans: `'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif`,
      fontMono: `'Geist Mono', 'GeistMono', ui-monospace, Menlo, monospace`,
      fontDisplay: `'Inter', ui-sans-serif, system-ui, sans-serif`,
      headingWeight: 400,
      faces: [
        {
          family: "Inter",
          src: [
            {
              url: "https://cdn.jsdelivr.net/fontsource/fonts/inter:vf@latest/latin-wght-normal.woff2",
              format: "woff2",
            },
          ],
          weight: "100 900",
          display: "swap",
        },
      ],
    },
    extensions: {
      categories: {
        brand: coral,
        ember: ctx.colors["ember-hush"] ?? "#452324",
        sky: ctx.colors["electric-sky"] ?? "#63a1ff",
      },
      sourceUrl: typeof ctx.refero.url === "string" ? ctx.refero.url : "https://raycast.com",
      notes: [
        "Primary CTA = Mist fill + Iron text (neutral solid).",
        "Coral Pulse is brand mark only — do not use for general product chrome CTAs.",
        "Cards use elevation=key (keyboard-key inset shadow stack).",
      ],
    },
  };
  return brand;
}
