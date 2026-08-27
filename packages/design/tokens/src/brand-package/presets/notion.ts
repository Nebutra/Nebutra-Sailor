/**
 * notion design-language compile preset (stress fixture).
 */
import { leafHex } from "../compile-helpers";
import { tryHexToHsl } from "../hex-to-hsl";
import type { BrandPackage } from "../types";
import type { CompileContext } from "./context";
import { buildRecipe } from "./recipe";

export function buildNotion(ctx: CompileContext): BrandPackage {
  const paper = ctx.colors["paper-warmth"] ?? "#f6f5f4";
  const white = ctx.colors["pure-white"] ?? "#ffffff";
  const ink = ctx.colors["ink-black"] ?? "#000000";
  const charcoal = ctx.colors.charcoal ?? "#111111";
  const stone = ctx.colors.stone ?? "#757575";
  const graphite = ctx.colors.graphite ?? "#615d59";
  const blue = ctx.colors["notion-blue"] ?? "#0075de";
  const sky = ctx.colors["sky-tint"] ?? "#e6f3fe";
  const marigold = ctx.colors.marigold ?? "#ffb110";
  const coral = ctx.colors.coral ?? "#f64932";
  const midnight = ctx.colors["midnight-ink"] ?? "#02093a";
  const signal = ctx.colors["signal-blue"] ?? "#097fe8";

  ctx.warnings.push(
    "Notion: notion-blue is the only filled CTA; marigold/coral/midnight are decorative card washes (never default action).",
  );
  ctx.warnings.push(
    "Notion: content cards use 1px hairline + elev=none; soft shadows only for sticky nav / product mockups (raised slot).",
  );

  const brand: BrandPackage = {
    id: "notion",
    name: "Notion",
    darkDefault: false,
    version: "1.0.0",
    roles: {
      canvas: tryHexToHsl(paper, "30 9% 96%"),
      canvasForeground: tryHexToHsl(ink, "0 0% 0%"),
      surface: tryHexToHsl(white, "0 0% 100%"),
      surfaceForeground: tryHexToHsl(ink, "0 0% 0%"),
      action: tryHexToHsl(blue, "208 100% 44%"),
      actionForeground: tryHexToHsl(white, "0 0% 100%"),
      // Logo / wordmark / ink hierarchy — not blue CTA
      brand: tryHexToHsl(ink, "0 0% 0%"),
      brandForeground: tryHexToHsl(white, "0 0% 100%"),
      // Ghost CTA wash
      quiet: tryHexToHsl(sky, "206 90% 95%"),
      quietForeground: tryHexToHsl(blue, "208 100% 44%"),
      muted: tryHexToHsl(sky, "206 90% 95%"),
      mutedForeground: tryHexToHsl(stone, "0 0% 46%"),
      // Approx hairline rgba(0,0,0,0.08) on warm paper
      border: "30 5% 88%",
      input: tryHexToHsl(white, "0 0% 100%"),
      ring: tryHexToHsl(blue, "208 100% 44%"),
      destructive: tryHexToHsl(coral, "6 91% 58%"),
      destructiveForeground: tryHexToHsl(white, "0 0% 100%"),
      warning: tryHexToHsl(marigold, "40 100% 53%"),
      warningForeground: tryHexToHsl(ink, "0 0% 0%"),
      info: tryHexToHsl(signal, "207 93% 47%"),
      infoForeground: tryHexToHsl(white, "0 0% 100%"),
    },
    semantic: {
      background: tryHexToHsl(paper, "30 9% 96%"),
      foreground: tryHexToHsl(ink, "0 0% 0%"),
      card: tryHexToHsl(white, "0 0% 100%"),
      cardForeground: tryHexToHsl(ink, "0 0% 0%"),
      popover: tryHexToHsl(white, "0 0% 100%"),
      popoverForeground: tryHexToHsl(ink, "0 0% 0%"),
      primary: tryHexToHsl(blue, "208 100% 44%"),
      primaryForeground: tryHexToHsl(white, "0 0% 100%"),
      secondary: tryHexToHsl(sky, "206 90% 95%"),
      secondaryForeground: tryHexToHsl(blue, "208 100% 44%"),
      muted: tryHexToHsl(sky, "206 90% 95%"),
      mutedForeground: tryHexToHsl(stone, "0 0% 46%"),
      accent: tryHexToHsl(sky, "206 90% 95%"),
      accentForeground: tryHexToHsl(blue, "208 100% 44%"),
      destructive: tryHexToHsl(coral, "6 91% 58%"),
      destructiveForeground: tryHexToHsl(white, "0 0% 100%"),
      border: "30 5% 88%",
      input: tryHexToHsl(white, "0 0% 100%"),
      ring: tryHexToHsl(blue, "208 100% 44%"),
      warning: tryHexToHsl(marigold, "40 100% 53%"),
      warningForeground: tryHexToHsl(ink, "0 0% 0%"),
      info: tryHexToHsl(signal, "207 93% 47%"),
      infoForeground: tryHexToHsl(white, "0 0% 100%"),
    },
    recipe: buildRecipe({
      buttonDefault: ctx.recipeHints.buttonDefault ?? "solid",
      radii: {
        button:
          ctx.recipeHints.radii?.button ??
          leafHex(ctx.radius, ["buttons"]) ??
          leafHex(ctx.radius, ["lg"]) ??
          "8px",
        card:
          ctx.recipeHints.radii?.card ??
          leafHex(ctx.radius, ["cards"]) ??
          leafHex(ctx.radius, ["xl"]) ??
          "12px",
        badge: leafHex(ctx.radius, ["pills"]) ?? leafHex(ctx.radius, ["full"]) ?? "9999px",
        input: leafHex(ctx.radius, ["buttons"]) ?? leafHex(ctx.radius, ["lg"]) ?? "8px",
      },
      elevationPreset: ctx.recipeHints.elevationPreset ?? "none",
      density: ctx.recipeHints.density ?? "comfortable",
      badgeDefault: "muted",
      outlineBorder: ink,
      // Sticky nav soft shadow lives in raised; cards stay flat
      elevationTokens: {
        card: "0 0 #0000",
        control: "0 0 #0000",
        raised: "0px 0.7px 1.462px 0px rgb(0 0 0 / 0.015), 0px 3px 9px 0px rgb(0 0 0 / 0.03)",
      },
    }),
    // Settles rather than snaps. A document surface is read, not operated, so
    // motion here is slow enough to follow with the eye and never competes with
    // the text it is moving.
    motion: {
      easeOut: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
      easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
      micro: 120,
      flow: 200,
      reveal: 280,
      cinematic: 460,
    },
    // Editorial — a document wants margin, not chrome density.
    spacing: {
      xs: "0.625rem",
      sm: "1rem",
      md: "1.5rem",
      lg: "2rem",
      xl: "2.75rem",
      "2xl": "3.75rem",
    },
    typography: {
      fontSans: `'NotionInter', 'Inter', ui-sans-serif, system-ui, sans-serif`,
      fontDisplay: `'NotionInter', 'Inter', ui-sans-serif, system-ui, sans-serif`,
      headingWeight: 700,
    },
    extensions: {
      categories: {
        brand: ink,
        action: blue,
        ghost: sky,
        marigold,
        coral,
        midnight,
        charcoal,
        graphite,
      },
      decorative: {
        marigold,
        coral,
        saffron: ctx.colors.saffron ?? "#e89d01",
        "sky-wash": ctx.colors["sky-wash"] ?? "#62aef0",
        midnight,
      },
      sourceUrl: typeof ctx.refero.url === "string" ? ctx.refero.url : "https://www.notion.com",
      notes: [
        "roles.action = Notion Blue (only filled CTA). Accent hues are decorative card washes.",
        "roles.brand = Ink Black (logo / wordmark / text hierarchy via alpha).",
        "Canvas = Paper Warmth; cards = Pure White — never invert.",
        "Card elev=none + hairline border; sticky nav soft shadow → elevation raised slot.",
        "Buttons 8px, cards 12px, pills 9999px.",
        "Lyon Text is editorial accent only — not product chrome UI.",
      ],
    },
  };
  return brand;
}
