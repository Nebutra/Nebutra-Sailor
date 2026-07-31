/**
 * stripe design-language compile preset (stress fixture).
 */
import { tryHexToHsl } from "../hex-to-hsl";
import type { BrandPackage } from "../types";
import type { CompileContext } from "./context";
import { buildRecipe } from "./recipe";

export function buildStripe(ctx: CompileContext): BrandPackage {
  const white = ctx.colors["pure-white"] ?? "#ffffff";
  const mist = ctx.colors.mist ?? "#f8fafd";
  const frost = ctx.colors.frost ?? "#e5edf5";
  const midnight = ctx.colors["midnight-ink"] ?? "#061b31";
  const slate = ctx.colors.slate ?? "#64748d";
  const steel = ctx.colors.steel ?? "#50617a";
  const indigo = ctx.colors["indigo-ink"] ?? "#533afd";
  const indigoHover = ctx.colors["indigo-hover"] ?? "#7389ff";
  const lavender = ctx.colors["lavender-border"] ?? "#b9b9f9";
  const periwinkle = ctx.colors["periwinkle-wash"] ?? "#e8e9ff";
  const deep = ctx.colors["deep-violet"] ?? "#182659";
  const smoke = ctx.colors.smoke ?? "#839bc8";

  ctx.warnings.push(
    "Stripe: indigo-ink is action CTA only; midnight-ink is brand-mark/wordmark (never default CTA fill).",
  );
  ctx.warnings.push(
    "Stripe: elevation=none — depth via white→mist→frost tints + 1px frost rules, never box-shadow.",
  );

  const brand: BrandPackage = {
    id: "stripe",
    name: "Stripe",
    darkDefault: false,
    version: "1.0.0",
    roles: {
      canvas: tryHexToHsl(white, "0 0% 100%"),
      canvasForeground: tryHexToHsl(midnight, "208 78% 11%"),
      surface: tryHexToHsl(white, "0 0% 100%"),
      surfaceForeground: tryHexToHsl(midnight, "208 78% 11%"),
      action: tryHexToHsl(indigo, "248 98% 61%"),
      actionForeground: tryHexToHsl(white, "0 0% 100%"),
      brand: tryHexToHsl(midnight, "208 78% 11%"),
      brandForeground: tryHexToHsl(white, "0 0% 100%"),
      quiet: tryHexToHsl(periwinkle, "238 100% 95%"),
      quietForeground: tryHexToHsl(indigo, "248 98% 61%"),
      muted: tryHexToHsl(mist, "210 56% 98%"),
      mutedForeground: tryHexToHsl(slate, "215 16% 47%"),
      border: tryHexToHsl(frost, "210 36% 93%"),
      input: tryHexToHsl(white, "0 0% 100%"),
      ring: tryHexToHsl(indigo, "248 98% 61%"),
      destructive: "0 72% 51%",
      destructiveForeground: tryHexToHsl(white, "0 0% 100%"),
      info: tryHexToHsl(indigoHover, "230 100% 73%"),
      infoForeground: tryHexToHsl(midnight, "208 78% 11%"),
    },
    semantic: {
      background: tryHexToHsl(white, "0 0% 100%"),
      foreground: tryHexToHsl(midnight, "208 78% 11%"),
      card: tryHexToHsl(white, "0 0% 100%"),
      cardForeground: tryHexToHsl(midnight, "208 78% 11%"),
      popover: tryHexToHsl(white, "0 0% 100%"),
      popoverForeground: tryHexToHsl(midnight, "208 78% 11%"),
      primary: tryHexToHsl(indigo, "248 98% 61%"),
      primaryForeground: tryHexToHsl(white, "0 0% 100%"),
      secondary: tryHexToHsl(periwinkle, "238 100% 95%"),
      secondaryForeground: tryHexToHsl(indigo, "248 98% 61%"),
      muted: tryHexToHsl(mist, "210 56% 98%"),
      mutedForeground: tryHexToHsl(slate, "215 16% 47%"),
      accent: tryHexToHsl(indigo, "248 98% 61%"),
      accentForeground: tryHexToHsl(white, "0 0% 100%"),
      destructive: "0 72% 51%",
      destructiveForeground: tryHexToHsl(white, "0 0% 100%"),
      border: tryHexToHsl(frost, "210 36% 93%"),
      input: tryHexToHsl(white, "0 0% 100%"),
      ring: tryHexToHsl(indigo, "248 98% 61%"),
      info: tryHexToHsl(indigoHover, "230 100% 73%"),
      infoForeground: tryHexToHsl(midnight, "208 78% 11%"),
    },
    recipe: buildRecipe({
      buttonDefault: ctx.recipeHints.buttonDefault ?? "solid",
      radii: {
        button: ctx.recipeHints.radii?.button ?? "4px",
        card: "4px",
        badge: "9999px",
        input: "4px",
      },
      elevationPreset: ctx.recipeHints.elevationPreset ?? "none",
      density: ctx.recipeHints.density ?? "comfortable",
      badgeDefault: "muted",
      // Ghost outline companion uses lavender hairline, not carbon
      outlineBorder: lavender,
    }),
    // Deliberate and even. Stripe's motion never draws attention to itself;
    // the curve is symmetric so a panel leaves the way it arrived.
    motion: {
      easeOut: "cubic-bezier(0.215, 0.61, 0.355, 1)",
      easeInOut: "cubic-bezier(0.645, 0.045, 0.355, 1)",
      micro: 100,
      flow: 180,
      reveal: 260,
      cinematic: 400,
    },
    // Clean commerce chrome — a touch more generous than the app-shell trio.
    spacing: {
      xs: "0.5rem",
      sm: "0.75rem",
      md: "1.125rem",
      lg: "1.75rem",
      xl: "2.25rem",
      "2xl": "3.25rem",
    },
    typography: {
      fontSans: `'sohne-var', 'Inter Tight', 'Inter', ui-sans-serif, system-ui, sans-serif`,
      fontDisplay: `'sohne-var', 'Inter Tight', ui-sans-serif, system-ui, sans-serif`,
      // Whisper weight is the Stripe signature (even at 56px display)
      headingWeight: 300,
      faces: [
        {
          family: "sohne-var",
          // Placeholder — Create Center / licensed Söhne Variable
          src: [{ url: "/brand-assets/sohne-var.woff2", format: "woff2" }],
          weight: "300 400",
          display: "swap",
        },
      ],
    },
    extensions: {
      categories: {
        brand: midnight,
        action: indigo,
        link: indigo,
        hover: indigoHover,
        ghostBorder: lavender,
        wash: periwinkle,
        deep: deep,
        smoke,
        steel,
      },
      decorative: {
        "section-band": mist,
        frost,
      },
      sourceUrl: typeof ctx.refero.url === "string" ? ctx.refero.url : "https://stripe.com",
      notes: [
        "roles.action = Indigo Ink filled CTA; roles.brand = Midnight Ink wordmark.",
        "Elevation none — tint ladder + 1px frost rules; never box-shadow.",
        "Control ctx.radius 4px (not pill); tags may stay full-pill.",
        "Typography weight 300 is the product signature (Inter Tight substitute).",
        "Pair solid CTA with ghost outline (lavender border) as secondary.",
      ],
    },
  };
  return brand;
}
