/**
 * gsap design-language compile preset (stress fixture).
 */
import { leafHex } from "../compile-helpers";
import { tryHexToHsl } from "../hex-to-hsl";
import type { BrandPackage, ButtonDefaultStyle, Density } from "../types";
import type { CompileContext } from "./context";
import { buildRecipe } from "./recipe";

export function buildGsap(ctx: CompileContext): BrandPackage {
  const canvas = ctx.colors["just-black"] ?? ctx.colors.canvas ?? "#0e100f";
  const cream = ctx.colors["surface-cream"] ?? ctx.colors["cream-surface"] ?? "#fffce1";
  const muted = ctx.colors["surface-50"] ?? "#7c7c6f";
  const hairline = ctx.colors["surface-25"] ?? "#42433d";
  const nested = ctx.colors["off-black"] ?? ctx.colors["nested-panel"] ?? "#191919";
  const green = ctx.colors["shockingly-green"] ?? "#0ae448";
  // DESIGN: do NOT promote shockingly-green to filled primary CTA
  ctx.warnings.push(
    "GSAP: shockingly-green is accent/link only — buttonDefault=outline (no solid green fill).",
  );

  const buttonDefault: ButtonDefaultStyle = ctx.recipeHints.buttonDefault ?? "gradient-stroke";

  const brand: BrandPackage = {
    id: "gsap",
    name: "GSAP",
    darkDefault: true,
    version: "1.0.0",
    semantic: {
      // Primary for *links/accents* — filled solid CTAs are disabled by recipe
      background: tryHexToHsl(canvas, "150 8% 6%"),
      foreground: tryHexToHsl(cream, "54 100% 94%"),
      card: tryHexToHsl(nested, "0 0% 10%"),
      cardForeground: tryHexToHsl(cream, "54 100% 94%"),
      popover: tryHexToHsl(nested, "0 0% 10%"),
      popoverForeground: tryHexToHsl(cream, "54 100% 94%"),
      primary: tryHexToHsl(green, "136 91% 47%"),
      primaryForeground: tryHexToHsl(canvas, "150 8% 6%"),
      secondary: tryHexToHsl(hairline, "60 5% 25%"),
      secondaryForeground: tryHexToHsl(cream, "54 100% 94%"),
      muted: tryHexToHsl(nested, "0 0% 10%"),
      mutedForeground: tryHexToHsl(muted, "60 6% 46%"),
      accent: tryHexToHsl(hairline, "60 5% 25%"),
      accentForeground: tryHexToHsl(green, "136 91% 47%"),
      destructive: tryHexToHsl(ctx.colors["lipstick-pink"] ?? "#f100cb", "310 100% 47%"),
      destructiveForeground: tryHexToHsl(cream, "54 100% 94%"),
      border: tryHexToHsl(hairline, "60 5% 25%"),
      input: tryHexToHsl(hairline, "60 5% 25%"),
      ring: tryHexToHsl(green, "136 91% 47%"),
      info: tryHexToHsl(ctx.colors.blue ?? "#00bae2", "191 100% 44%"),
      infoForeground: tryHexToHsl(canvas, "150 8% 6%"),
      success: tryHexToHsl(green, "136 91% 47%"),
      successForeground: tryHexToHsl(canvas, "150 8% 6%"),
    },
    recipe: buildRecipe({
      buttonDefault,
      radii: {
        button: ctx.recipeHints.radii?.button ?? leafHex(ctx.radius, ["full"]) ?? "100px",
        card: leafHex(ctx.radius, ["lg"]) ?? "8px",
      },
      elevationPreset: ctx.recipeHints.elevationPreset ?? "none",
      density: (ctx.recipeHints.density ?? "comfortable") satisfies Density,
      outlineBorder: cream,
      primaryStrokeGradient: "linear-gradient(114.41deg, #0ae448 20.74%, #abff84 65.5%)",
    }),
    // Performs. This is the one language where motion is the message, so the
    // ramp is long enough to be watched and the spring is allowed to overshoot
    // well past its resting state.
    motion: {
      easeOut: "cubic-bezier(0.22, 1, 0.36, 1)",
      easeInOut: "cubic-bezier(0.65, 0, 0.35, 1)",
      easeSpring: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
      micro: 120,
      flow: 250,
      reveal: 400,
      cinematic: 700,
    },
    // Room for the performance to land — more air than the product-chrome trio.
    spacing: {
      xs: "0.5rem",
      sm: "0.875rem",
      md: "1.25rem",
      lg: "1.75rem",
      xl: "2.5rem",
      "2xl": "3.5rem",
    },
    typography: {
      fontSans: `'Mori', 'Inter Tight', 'DM Sans', ui-sans-serif, system-ui, sans-serif`,
      fontDisplay: `'Mori', 'Inter Tight', ui-sans-serif, system-ui, sans-serif`,
      headingWeight: 600,
    },
    extensions: {
      categories: {
        gsap: green,
        scroll: ctx.colors.pink ?? "#fec5fb",
        svg: ctx.colors.orangey ?? "#ff8709",
        text: ctx.colors.lilac ?? "#9d95ff",
        ui: ctx.colors.blue ?? "#00bae2",
        other: ctx.colors["light-green"] ?? "#abff84",
      },
      displaySizePx: 224,
      sourceUrl: typeof ctx.refero.url === "string" ? ctx.refero.url : "https://gsap.com",
      notes: [
        "Outline-first product controls; category ctx.colors are marketing extensions.",
        "Replace typography.faces[].src with Create Center hosted ctx.font URLs.",
      ],
    },
  };
  return brand;
}
